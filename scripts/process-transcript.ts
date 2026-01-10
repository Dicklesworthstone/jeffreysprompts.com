#!/usr/bin/env bun
/**
 * Process extracted transcript into structured format
 *
 * Takes raw JSONL transcript and converts it to ProcessedTranscript JSON
 * using the transcript processor library.
 *
 * Usage:
 *   bun scripts/process-transcript.ts [options]
 *
 * Options:
 *   --input <path>       Input JSONL file (default: stdin)
 *   --output <path>      Output JSON file (default: apps/web/src/data/processed-transcript.json)
 *   --annotations <path> Annotations JSON file to merge with transcript
 *   --stdout             Output to stdout instead of file
 *   --help               Show help
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";


interface ProcessOptions {
  input?: string;
  output: string;
  annotations?: string;
  stdout: boolean;
}

interface TranscriptHighlight {
  messageId: string;
  type: "key_decision" | "interesting_prompt" | "clever_solution" | "lesson_learned";
  annotation: string;
}

interface TranscriptStats {
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  filesEdited: number;
  linesWritten: number;
  tokensUsed: number;
}

interface TranscriptSection {
  id: string;
  title: string;
  summary: string;
  startIndex: number;
  endIndex: number;
  tags: string[];
}

interface ProcessedTranscript {
  meta: {
    sessionId: string;
    startTime: string;
    endTime: string;
    duration: string;
    model: string;
    stats: TranscriptStats;
  };
  sections: TranscriptSection[];
  messages: unknown[];
  highlights: TranscriptHighlight[];
}

function parseArgs(): ProcessOptions {
  const args = process.argv.slice(2);
  const options: ProcessOptions = {
    output: "apps/web/src/data/processed-transcript.json",
    stdout: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--input" && args[i + 1]) {
      options.input = args[++i];
    } else if (arg === "--output" && args[i + 1]) {
      options.output = args[++i];
    } else if (arg === "--annotations" && args[i + 1]) {
      options.annotations = args[++i];
    } else if (arg === "--stdout") {
      options.stdout = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Process transcript into structured format

Usage:
  bun scripts/process-transcript.ts [options]

Options:
  --input <path>       Input JSONL file (default: stdin)
  --output <path>      Output JSON file (default: apps/web/src/data/processed-transcript.json)
  --annotations <path> Annotations JSON file to merge
  --stdout             Output to stdout instead of file
  --help               Show this help
`);
      process.exit(0);
    }
  }

  return options;
}

function formatDuration(start: string, end: string): string {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  if (isNaN(startMs) || isNaN(endMs)) {
    return "0m";
  }

  const diffMs = Math.max(0, endMs - startMs);
  const totalMinutes = Math.round(diffMs / 60000);

  if (totalMinutes < 60) {
    return totalMinutes + "m";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return hours + "h";
  }

  return hours + "h " + minutes + "m";
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.round(text.length / 4);
}

function processTranscript(
  rawJsonl: string,
  annotations: TranscriptHighlight[] = []
): ProcessedTranscript {
  const lines = rawJsonl.trim().split("\n").filter((l) => l.trim());
  const messages: unknown[] = [];

  // Parse each line
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry) {
        messages.push(entry);
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  // Calculate basic stats
  let userMessages = 0;
  let assistantMessages = 0;
  let toolCallCount = 0;
  const filesEdited = new Set<string>();
  let linesWritten = 0;
  let totalContent = "";

  // Helper to process a tool call object
  function processToolCall(tool: { name?: string; input?: { file_path?: string; content?: string; new_string?: string } }) {
    const toolName = tool.name?.toLowerCase();

    // Track files edited via Write or Edit tools
    if (toolName === "write" || toolName === "edit") {
      const filePath = tool.input?.file_path;
      if (filePath) {
        filesEdited.add(filePath);
      }

      // Count lines written
      const contentWritten = tool.input?.content || tool.input?.new_string || "";
      if (contentWritten) {
        linesWritten += contentWritten.split("\n").length;
      }
    }
  }

  // Helper to extract text content from various formats
  function extractTextContent(content: unknown): string {
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      // Handle Claude's content block format: [{type: "text", text: "..."}, ...]
      return content
        .filter((block): block is { type: string; text: string } =>
          typeof block === "object" && block !== null && block.type === "text" && typeof block.text === "string"
        )
        .map((block) => block.text)
        .join("\n");
    }
    return "";
  }

  for (const msg of messages as Array<{
    type?: string;
    content?: unknown;
    tool_use?: unknown[];
    message?: { role?: string; content?: unknown };
  }>) {
    const msgType = msg.type || msg.message?.role;

    if (msgType === "human" || msgType === "user") {
      userMessages++;
    } else if (msgType === "assistant") {
      assistantMessages++;
    }

    // Extract text content (handles both string and array of content blocks)
    const rawContent = msg.content || msg.message?.content;
    totalContent += extractTextContent(rawContent);

    // Count tool calls from msg.tool_use array (some formats)
    if (msg.tool_use && Array.isArray(msg.tool_use)) {
      toolCallCount += msg.tool_use.length;
      for (const tool of msg.tool_use as Array<{ name?: string; input?: { file_path?: string; content?: string; new_string?: string } }>) {
        processToolCall(tool);
      }
    }

    // Also check for tool_use blocks embedded in content array (Claude Code format)
    if (Array.isArray(rawContent)) {
      const toolUseBlocks = rawContent.filter(
        (block): block is { type: "tool_use"; name: string; input: { file_path?: string; content?: string; new_string?: string } } =>
          typeof block === "object" && block !== null && block.type === "tool_use"
      );
      toolCallCount += toolUseBlocks.length;
      for (const tool of toolUseBlocks) {
        processToolCall(tool);
      }
    }
  }

  // Extract timestamps
  const timestamps = (messages as Array<{ timestamp?: string }>)
    .map((m) => m.timestamp)
    .filter((t): t is string => Boolean(t))
    .sort();

  const startTime = timestamps[0] || new Date().toISOString();
  const endTime = timestamps[timestamps.length - 1] || startTime;

  return {
    meta: {
      sessionId: "session-" + new Date(startTime).toISOString().slice(0, 10),
      startTime,
      endTime,
      duration: formatDuration(startTime, endTime),
      model: "Claude",
      stats: {
        userMessages,
        assistantMessages,
        toolCalls: toolCallCount,
        filesEdited: filesEdited.size,
        linesWritten,
        tokensUsed: estimateTokens(totalContent),
      },
    },
    sections: [],
    messages,
    highlights: annotations,
  };
}

async function main() {
  const options = parseArgs();

  // Read input
  let rawInput: string;

  if (options.input) {
    if (!existsSync(options.input)) {
      console.error("Input file not found:", options.input);
      process.exit(1);
    }
    rawInput = readFileSync(options.input, "utf-8");
    console.log("Read input from:", options.input);
  } else {
    // Read from stdin
    const chunks: string[] = [];
    const reader = Bun.stdin.stream().getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(new TextDecoder().decode(value));
    }

    rawInput = chunks.join("");
    console.log("Read input from stdin");
  }

  // Load annotations if provided
  let annotations: TranscriptHighlight[] = [];
  if (options.annotations && existsSync(options.annotations)) {
    try {
      const annotationData = readFileSync(options.annotations, "utf-8");
      annotations = JSON.parse(annotationData);
      console.log("Loaded", annotations.length, "annotations");
    } catch (e) {
      console.warn("Failed to load annotations:", e);
    }
  }

  // Process transcript
  const processed = processTranscript(rawInput, annotations);

  console.log("Processed transcript:");
  console.log("  - Messages:", processed.messages.length);
  console.log("  - User messages:", processed.meta.stats.userMessages);
  console.log("  - Assistant messages:", processed.meta.stats.assistantMessages);
  console.log("  - Duration:", processed.meta.duration);

  // Output
  const output = JSON.stringify(processed, null, 2);

  if (options.stdout) {
    console.log(output);
  } else {
    const outputDir = dirname(resolve(options.output));
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    writeFileSync(options.output, output);
    console.log("Wrote output to:", options.output);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
