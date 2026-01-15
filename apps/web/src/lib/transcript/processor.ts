/**
 * Transcript processor for the "How It Was Made" page.
 * Parses raw JSONL from Claude Code sessions and extracts structured data.
 */

import type {
  TranscriptMessage,
  ToolCall,
  TranscriptSection,
  ProcessedTranscript,
  TranscriptStats,
  TranscriptHighlight,
} from "./types";
import { formatDuration, estimateTokens } from "./utils";

/**
 * Raw message entry from Claude Code JSONL format.
 */
interface RawEntry {
  type?: "human" | "assistant" | "system" | "user";
  message?: {
    role?: string;
    content?: string | ContentBlock[];
    tool_use?: unknown;
  };
  content?: string | ContentBlock[];
  timestamp?: string;
  tool_use?: unknown;
  thinking?: string;
  model?: string;
}

/**
 * Content block within a message (text, tool_use, or tool_result).
 */
interface ContentBlock {
  type: string;
  text?: string;
  tool_use_id?: string;
  content?: string;
  name?: string;
  input?: Record<string, unknown>;
  id?: string;
}

/**
 * Process raw JSONL transcript into structured format.
 * @param rawJsonl - Raw JSONL string from Claude Code session
 * @param annotations - Optional pre-defined highlights/annotations
 * @returns Fully processed transcript with sections, stats, and messages
 */
export function processTranscript(
  rawJsonl: string,
  annotations: TranscriptHighlight[] = []
): ProcessedTranscript {
  const lines = rawJsonl.trim().split("\n").filter((l) => l.trim());
  const messages: TranscriptMessage[] = [];

  // Parse each line into structured messages
  let messageIndex = 0;
  for (const line of lines) {
    try {
      const entry: RawEntry = JSON.parse(line);
      const parsed = parseEntry(entry, messageIndex);
      if (parsed) {
        messages.push(parsed);
        messageIndex++;
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  // Detect sections based on heuristics
  const sections = detectSections(messages);

  // Calculate aggregate stats
  const stats = calculateStats(messages);

  // Extract time bounds
  const startTime = messages[0]?.timestamp || new Date().toISOString();
  const endTime = messages[messages.length - 1]?.timestamp || startTime;

  return {
    meta: {
      sessionId: generateSessionId(startTime),
      startTime,
      endTime,
      duration: formatDuration(startTime, endTime),
      model: detectModel(messages),
      stats,
    },
    sections,
    messages,
    highlights: annotations,
  };
}

/**
 * Parse a single JSONL entry into a TranscriptMessage.
 */
function parseEntry(entry: RawEntry, index: number): TranscriptMessage | null {
  // Determine message type from entry.type or nested message.role
  let type: TranscriptMessage["type"] = "assistant";
  if (entry.type === "human" || entry.type === "user") {
    type = "user";
  } else if (entry.type === "system") {
    type = "system";
  } else if (entry.type === "assistant") {
    type = "assistant";
  } else if (entry.message?.role) {
    const role = entry.message.role;
    if (role === "user" || role === "human") {
      type = "user";
    } else if (role === "system") {
      type = "system";
    }
  }

  // Extract content
  let content = "";
  let thinking = "";
  const toolCalls: ToolCall[] = [];

  const rawContent = entry.content || entry.message?.content;

  if (typeof rawContent === "string") {
    content = rawContent;
  } else if (Array.isArray(rawContent)) {
    // Handle content blocks
    for (const block of rawContent) {
      if (block.type === "text" && block.text) {
        content += block.text;
      } else if (block.type === "thinking" && block.text) {
        thinking += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id || `tool-${index}-${toolCalls.length}`,
          name: block.name || "unknown",
          input: block.input || {},
          output: "",
          success: true,
        });
      } else if (block.type === "tool_result") {
        // Match to existing tool call
        const matchingCall = toolCalls.find((tc) => tc.id === block.tool_use_id);
        if (matchingCall) {
          matchingCall.output = block.content || "";
        }
      }
    }
  }

  // Skip empty messages with no content and no tool calls
  if (!content && !thinking && toolCalls.length === 0) {
    return null;
  }

  // Handle standalone thinking from entry (append, don't overwrite)
  if (entry.thinking) {
    thinking = thinking ? `${thinking}\n${entry.thinking}` : entry.thinking;
  }

  return {
    id: `msg-${index}`,
    type,
    timestamp: entry.timestamp || "",
    content: content.trim(),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    thinking: thinking || undefined,
    model: entry.model,
  };
}

/**
 * Detect logical sections in the transcript.
 * Uses heuristics:
 * - Ultrathink/extended thinking = "Deep Analysis" section
 * - Clusters of Edit tool calls = "Implementation" section
 * - User questions = "Discussion" sections
 * - Planning tool usage = "Planning" section
 */
function detectSections(messages: TranscriptMessage[]): TranscriptSection[] {
  const sections: TranscriptSection[] = [];

  if (messages.length === 0) {
    return sections;
  }

  let sectionIndex = 0;

  const addSection = (
    title: string,
    summary: string,
    startIndex: number,
    endIndex: number,
    tags: string[]
  ) => {
    if (endIndex >= startIndex) {
      sections.push({
        id: `section-${sectionIndex++}`,
        title,
        summary,
        startIndex,
        endIndex,
        tags,
      });
    }
  };

  // Scan through messages to detect section boundaries
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];

    // Detect "Deep Analysis" - messages with extended thinking
    if (msg.thinking && msg.thinking.length > 1000) {
      const startIdx = i;
      let endIdx = i;

      // Extend section while there's substantial thinking
      while (
        endIdx + 1 < messages.length &&
        messages[endIdx + 1]?.thinking &&
        (messages[endIdx + 1]?.thinking?.length ?? 0) > 500
      ) {
        endIdx++;
      }

      addSection(
        "Deep Analysis",
        "Extended thinking and careful reasoning",
        startIdx,
        endIdx,
        ["thinking", "analysis"]
      );

      i = endIdx + 1;
      continue;
    }

    // Detect "Implementation" - clusters of Edit/Write tool calls
    const editTools = ["Edit", "Write", "MultiEdit"];
    if (msg.toolCalls?.some((tc) => editTools.includes(tc.name))) {
      const startIdx = i;
      let endIdx = i;
      let editCount = 0;

      // Extend while we see edit-related activity
      while (endIdx < messages.length) {
        const m = messages[endIdx];
        const hasEdit = m.toolCalls?.some((tc) => editTools.includes(tc.name));
        if (hasEdit) {
          editCount++;
          endIdx++;
        } else if (endIdx - startIdx < 3) {
          // Allow gaps of 1-2 messages in implementation
          endIdx++;
        } else {
          break;
        }
      }

      if (editCount >= 2) {
        addSection(
          "Implementation",
          `Code changes across ${editCount} edits`,
          startIdx,
          // Ensure endIndex >= startIndex (defensive bounds check)
          Math.max(startIdx, Math.min(endIdx - 1, messages.length - 1)),
          ["code", "implementation"]
        );

        i = endIdx;
        continue;
      }
    }

    // Detect "Exploration" - Glob/Grep/Read tool clusters
    const readTools = ["Glob", "Grep", "Read", "Bash"];
    if (msg.toolCalls?.some((tc) => readTools.includes(tc.name))) {
      const startIdx = i;
      let endIdx = i;
      let readCount = 0;

      while (endIdx < messages.length) {
        const m = messages[endIdx];
        const hasRead = m.toolCalls?.some((tc) => readTools.includes(tc.name));
        const hasEdit = m.toolCalls?.some((tc) => editTools.includes(tc.name));

        if (hasRead && !hasEdit) {
          readCount++;
          endIdx++;
        } else if (readCount >= 2) {
          break;
        } else {
          endIdx++;
          if (endIdx - startIdx > 5) break;
        }
      }

      if (readCount >= 3) {
        addSection(
          "Exploration",
          "Codebase exploration and research",
          startIdx,
          // Ensure endIndex >= startIndex (defensive bounds check)
          Math.max(startIdx, Math.min(endIdx - 1, messages.length - 1)),
          ["exploration", "research"]
        );

        i = endIdx;
        continue;
      }
    }

    // Detect "Planning" - TodoWrite or planning discussions
    if (msg.toolCalls?.some((tc) => tc.name === "TodoWrite")) {
      addSection("Planning", "Task planning and organization", i, i, [
        "planning",
        "organization",
      ]);
    }

    i++;
  }

  // Sort sections by start index for chronological ordering
  sections.sort((a, b) => a.startIndex - b.startIndex);

  return sections;
}

/**
 * Calculate aggregate statistics for the transcript.
 */
function calculateStats(messages: TranscriptMessage[]): TranscriptStats {
  let userMessages = 0;
  let assistantMessages = 0;
  let toolCallCount = 0;
  const filesEdited = new Set<string>();
  let linesWritten = 0;
  let totalContent = "";

  for (const msg of messages) {
    if (msg.type === "user") {
      userMessages++;
    } else if (msg.type === "assistant") {
      assistantMessages++;
    }

    totalContent += msg.content || "";
    if (msg.thinking) {
      totalContent += msg.thinking;
    }

    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        toolCallCount++;

        // Track files edited
        if (tc.name === "Edit" || tc.name === "Write" || tc.name === "MultiEdit") {
          // Type-safe extraction (input values could be objects, not strings)
          const filePath = typeof tc.input?.file_path === "string" ? tc.input.file_path : "";
          if (filePath) {
            filesEdited.add(filePath);
          }

          // Estimate lines written from new content
          // Type-safe: verify values are actually strings before calling split()
          const newString = typeof tc.input?.new_string === "string" ? tc.input.new_string : "";
          const content = typeof tc.input?.content === "string" ? tc.input.content : "";
          const textContent = newString || content;
          if (textContent) {
            linesWritten += textContent.split("\n").length;
          }
        }
      }
    }
  }

  return {
    userMessages,
    assistantMessages,
    toolCalls: toolCallCount,
    filesEdited: filesEdited.size,
    linesWritten,
    tokensUsed: estimateTokens(totalContent),
  };
}

/**
 * Detect the primary model used in the session.
 */
function detectModel(messages: TranscriptMessage[]): string {
  for (const msg of messages) {
    if (msg.model) {
      // Extract readable model name
      if (msg.model.includes("opus")) return "Claude Opus";
      if (msg.model.includes("sonnet")) return "Claude Sonnet";
      if (msg.model.includes("haiku")) return "Claude Haiku";
      return msg.model;
    }
  }
  return "Claude";
}

/**
 * Generate a session ID from the start time.
 */
function generateSessionId(startTime: string): string {
  const date = new Date(startTime);
  if (isNaN(date.getTime())) {
    return `session-${Date.now()}`;
  }
  // Use a random suffix to prevent collisions for same-day sessions
  const suffix = Math.random().toString(36).substring(2, 8);
  return `session-${date.toISOString().slice(0, 10)}-${suffix}`;
}

/**
 * Parse raw transcript from a file path or string.
 * Convenience wrapper for processTranscript.
 */
export function parseTranscriptFile(
  content: string,
  annotations?: TranscriptHighlight[]
): ProcessedTranscript {
  return processTranscript(content, annotations);
}

/**
 * Extract tool call summary for a message.
 * Returns a condensed view of what tools were used.
 */
export function getToolCallSummary(
  toolCalls: ToolCall[] | undefined
): string {
  if (!toolCalls || toolCalls.length === 0) {
    return "";
  }

  const grouped = new Map<string, number>();
  for (const tc of toolCalls) {
    grouped.set(tc.name, (grouped.get(tc.name) || 0) + 1);
  }

  return Array.from(grouped.entries())
    .map(([name, count]) => (count > 1 ? `${name} (×${count})` : name))
    .join(", ");
}

/**
 * Get the primary action for a message based on tool usage.
 */
export function getMessageAction(msg: TranscriptMessage): string {
  if (!msg.toolCalls || msg.toolCalls.length === 0) {
    if (msg.thinking) return "Thinking";
    return msg.type === "user" ? "Prompt" : "Response";
  }

  const tools = msg.toolCalls.map((tc) => tc.name);

  if (tools.some((t) => t === "Edit" || t === "Write" || t === "MultiEdit")) {
    return "Editing";
  }
  if (tools.some((t) => t === "Bash")) {
    return "Running commands";
  }
  if (tools.some((t) => t === "Read")) {
    return "Reading files";
  }
  if (tools.some((t) => t === "Glob" || t === "Grep")) {
    return "Searching";
  }
  if (tools.some((t) => t === "TodoWrite")) {
    return "Planning";
  }

  return "Using tools";
}
