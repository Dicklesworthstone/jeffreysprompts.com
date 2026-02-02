#!/usr/bin/env bun
/**
 * Build processed transcript for the "How It Was Made" page.
 *
 * Reads raw JSONL from Claude Code sessions and outputs a compact
 * ProcessedTranscript JSON file suitable for the web app.
 *
 * Usage:
 *   bun scripts/build-transcript.ts [--session <uuid>] [--output <path>]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { redactTranscript } from "./redact-transcript";

// ============================================================================
// Types (matching lib/transcript/types.ts)
// ============================================================================

interface TranscriptMessage {
  id: string;
  type: "user" | "assistant" | "tool_use" | "tool_result" | "system";
  timestamp: string;
  content: string;
  toolCalls?: ToolCall[];
  thinking?: string;
  model?: string;
}

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output: string;
  duration?: number;
  success: boolean;
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
  messages: TranscriptMessage[];
  highlights: TranscriptHighlight[];
}

interface TranscriptStats {
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  filesEdited: number;
  linesWritten: number;
  tokensUsed: number;
}

interface TranscriptHighlight {
  messageId: string;
  type: "key_decision" | "interesting_prompt" | "clever_solution" | "lesson_learned";
  annotation: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CLAUDE_PROJECTS_DIR = join(process.env.HOME || "", ".claude", "projects");
const PROJECT_NAME = "jeffreysprompts.com";
const DEFAULT_OUTPUT = "apps/web/src/data/processed-transcript.json";

// Main build session (the one that built most of the site)
const MAIN_SESSION = "de731228-a391-4ae5-a06f-0fe0badbd347";

// ============================================================================
// Raw JSONL Entry Types
// ============================================================================

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  tool_use_id?: string;
  content?: string;
  name?: string;
  input?: Record<string, unknown>;
  id?: string;
  signature?: string;
}

interface RawEntry {
  type?: string;
  message?: {
    role?: string;
    content?: string | ContentBlock[];
    model?: string;
  };
  content?: string | ContentBlock[];
  timestamp?: string;
  uuid?: string;
}

// ============================================================================
// Processing Functions
// ============================================================================

function findProjectDir(): string | null {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) return null;

  const searchPattern = PROJECT_NAME.replace(/\./g, "-");
  const dirs = readdirSync(CLAUDE_PROJECTS_DIR);

  for (const dir of dirs) {
    if (dir.includes(searchPattern)) {
      return join(CLAUDE_PROJECTS_DIR, dir);
    }
  }
  return null;
}

function parseEntry(entry: RawEntry, index: number): TranscriptMessage | null {
  // Skip non-message entries
  if (entry.type === "file-history-snapshot" || entry.type === "summary") {
    return null;
  }

  // Determine message type
  let type: TranscriptMessage["type"] = "assistant";
  if (entry.type === "user" || entry.type === "human") {
    type = "user";
  } else if (entry.type === "system") {
    type = "system";
  } else if (entry.message?.role === "user") {
    type = "user";
  }

  // Extract content
  let content = "";
  let thinking = "";
  const toolCalls: ToolCall[] = [];

  const rawContent = entry.message?.content || entry.content;

  if (typeof rawContent === "string") {
    content = rawContent;
  } else if (Array.isArray(rawContent)) {
    for (const block of rawContent) {
      if (block.type === "text" && block.text) {
        content += block.text;
      } else if (block.type === "thinking" && block.thinking) {
        // Truncate very long thinking to save space
        thinking += block.thinking.length > 2000
          ? block.thinking.slice(0, 2000) + "... [truncated]"
          : block.thinking;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id || `tool-${index}-${toolCalls.length}`,
          name: block.name || "unknown",
          input: block.input || {},
          output: "",
          success: true,
        });
      } else if (block.type === "tool_result") {
        const match = toolCalls.find((tc) => tc.id === block.tool_use_id);
        if (match) {
          // Truncate long tool outputs
          const output = block.content || "";
          match.output = output.length > 500
            ? output.slice(0, 500) + "... [truncated]"
            : output;
        }
      }
    }
  }

  // Skip empty entries
  if (!content && !thinking && toolCalls.length === 0) {
    return null;
  }

  return {
    id: `msg-${index}`,
    type,
    timestamp: entry.timestamp || "",
    content: content.trim(),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    thinking: thinking || undefined,
    model: entry.message?.model,
  };
}

function formatDuration(startMs: number, endMs: number): string {
  const diffMs = Math.max(0, endMs - startMs);
  const totalMinutes = Math.round(diffMs / 60000);

  if (totalMinutes < 60) return `${totalMinutes}m`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

function detectSections(messages: TranscriptMessage[]): TranscriptSection[] {
  // Create major consolidated sections based on logical project phases
  // Each section spans a substantial chunk of work
  const sections: TranscriptSection[] = [];

  // Define sections based on message ranges (determined by analyzing the session)
  const sectionDefs = [
    {
      title: "Project Kickoff & Planning",
      summary: "Initial concept discussion, exploring brenner_bot patterns, and creating the comprehensive markdown plan",
      endIndex: 50,
      tags: ["planning", "architecture", "research"],
    },
    {
      title: "Core Infrastructure",
      summary: "Setting up monorepo, TypeScript config, packages structure, and prompt types",
      endIndex: 150,
      tags: ["setup", "typescript", "infrastructure"],
    },
    {
      title: "Prompt Registry & Search",
      summary: "Building the TypeScript-native prompt registry and BM25 search engine",
      endIndex: 300,
      tags: ["core", "search", "bm25"],
    },
    {
      title: "Web Application Foundation",
      summary: "Next.js 16 setup with React 19, Tailwind CSS 4, and shadcn/ui components",
      endIndex: 500,
      tags: ["web", "nextjs", "react", "tailwind"],
    },
    {
      title: "CLI Development",
      summary: "Building the jfp CLI with fuzzy search, JSON output, and skill installation",
      endIndex: 750,
      tags: ["cli", "bun", "agent-friendly"],
    },
    {
      title: "Feature Implementation",
      summary: "SpotlightSearch, basket system, prompt cards, and interactive features",
      endIndex: 1000,
      tags: ["features", "ui", "ux"],
    },
    {
      title: "Polish & Refinement",
      summary: "Bug fixes, test coverage, documentation updates, and final polish",
      endIndex: messages.length,
      tags: ["testing", "polish", "documentation"],
    },
  ];

  let startIndex = 0;
  for (let i = 0; i < sectionDefs.length; i++) {
    const def = sectionDefs[i];
    const endIndex = Math.min(def.endIndex - 1, messages.length - 1);

    if (startIndex <= endIndex) {
      sections.push({
        id: `section-${i}`,
        title: def.title,
        summary: def.summary,
        startIndex,
        endIndex,
        tags: def.tags,
      });
      startIndex = endIndex + 1;
    }
  }

  return sections;
}

function calculateStats(messages: TranscriptMessage[]): TranscriptStats {
  let userMessages = 0;
  let assistantMessages = 0;
  let toolCallCount = 0;
  const filesEdited = new Set<string>();
  let linesWritten = 0;
  let totalChars = 0;

  for (const msg of messages) {
    if (msg.type === "user") userMessages++;
    else if (msg.type === "assistant") assistantMessages++;

    totalChars += (msg.content || "").length;
    if (msg.thinking) totalChars += msg.thinking.length;

    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        toolCallCount++;

        if (["Edit", "Write", "MultiEdit"].includes(tc.name)) {
          const filePath = typeof tc.input?.file_path === "string" ? tc.input.file_path : "";
          if (filePath) filesEdited.add(filePath);

          const newString = typeof tc.input?.new_string === "string" ? tc.input.new_string : "";
          const content = typeof tc.input?.content === "string" ? tc.input.content : "";
          const text = newString || content;
          if (text) linesWritten += text.split("\n").length;
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
    tokensUsed: Math.round(totalChars / 4), // Rough estimate
  };
}

function detectModel(messages: TranscriptMessage[]): string {
  for (const msg of messages) {
    if (msg.model) {
      if (msg.model.includes("opus")) return "Claude Opus 4.5";
      if (msg.model.includes("sonnet")) return "Claude Sonnet";
      return msg.model;
    }
  }
  return "Claude";
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  let sessionId = MAIN_SESSION;
  let outputPath = DEFAULT_OUTPUT;

  // Parse args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--session" && args[i + 1]) {
      sessionId = args[++i];
    } else if ((args[i] === "--output" || args[i] === "-o") && args[i + 1]) {
      outputPath = args[++i];
    }
  }

  console.log("Building transcript for How It Was Made page...\n");

  // Find project directory
  const projectDir = findProjectDir();
  if (!projectDir) {
    console.error(`Project directory not found for: ${PROJECT_NAME}`);
    process.exit(1);
  }

  // Find session file
  const sessionPath = join(projectDir, `${sessionId}.jsonl`);
  if (!existsSync(sessionPath)) {
    console.error(`Session file not found: ${sessionPath}`);
    process.exit(1);
  }

  const stat = statSync(sessionPath);
  console.log(`Reading session: ${sessionId}`);
  console.log(`  File size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);

  // Read and parse JSONL
  const content = readFileSync(sessionPath, "utf-8");
  const lines = content.trim().split("\n");
  console.log(`  Raw lines: ${lines.length}`);

  // Parse messages
  const messages: TranscriptMessage[] = [];
  let messageIndex = 0;
  let startTime = "";
  let endTime = "";

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const entry: RawEntry = JSON.parse(line);

      // Track time bounds
      if (entry.timestamp) {
        if (!startTime) startTime = entry.timestamp;
        endTime = entry.timestamp;
      }

      const parsed = parseEntry(entry, messageIndex);
      if (parsed) {
        messages.push(parsed);
        messageIndex++;
      }
    } catch {
      // Skip invalid lines
    }
  }

  console.log(`  Parsed messages: ${messages.length}`);

  // Calculate stats
  const stats = calculateStats(messages);
  console.log(`\nStatistics:`);
  console.log(`  User messages: ${stats.userMessages}`);
  console.log(`  Assistant messages: ${stats.assistantMessages}`);
  console.log(`  Tool calls: ${stats.toolCalls}`);
  console.log(`  Files edited: ${stats.filesEdited}`);
  console.log(`  Lines written: ${stats.linesWritten}`);

  // Detect sections
  const sections = detectSections(messages);
  console.log(`\nSections: ${sections.length}`);
  for (const section of sections) {
    console.log(`  ${section.title}: messages ${section.startIndex}-${section.endIndex}`);
  }

  // Build ProcessedTranscript
  const duration = formatDuration(
    new Date(startTime).getTime(),
    new Date(endTime).getTime()
  );

  const processed: ProcessedTranscript = {
    meta: {
      sessionId,
      startTime,
      endTime,
      duration,
      model: detectModel(messages),
      stats,
    },
    sections,
    messages,
    highlights: [], // Will be populated from annotations.ts
  };

  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write output (redact secrets before saving)
  const json = JSON.stringify(processed, null, 2);
  const { result: redactedJson, applied } = redactTranscript(json);
  writeFileSync(outputPath, redactedJson, "utf-8");

  const outputStat = statSync(outputPath);
  console.log(`\nOutput written to: ${outputPath}`);
  console.log(`  File size: ${(outputStat.size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Duration: ${duration}`);

  console.log("\nDone! Next steps:");
  console.log("  1. Add annotations to apps/web/src/data/annotations.ts");
  console.log("  2. Update apps/web/src/app/how_it_was_made/page.tsx to import the processed transcript");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
