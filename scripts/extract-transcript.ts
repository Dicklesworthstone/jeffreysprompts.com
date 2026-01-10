#!/usr/bin/env bun
/**
 * Extract transcript from Claude Code session files
 *
 * Uses the cass CLI to export session transcripts as JSON.
 * Finds sessions by project name and optional date range.
 * Outputs to apps/web/src/data/transcript.json for the "How It Was Made" page.
 *
 * Usage:
 *   bun scripts/extract-transcript.ts [options]
 *
 * Options:
 *   --project <name>    Project name to search for (default: jeffreysprompts.com)
 *   --since <date>      Start date (ISO format or relative: "today", "1d", "2026-01-10")
 *   --until <date>      End date (ISO format or relative)
 *   --session <uuid>    Export a specific session by UUID
 *   --output <path>     Output path (default: apps/web/src/data/transcript.json)
 *   --all               Export all sessions for the project (merged)
 *   --list              List available sessions (don't export)
 *   --help              Show help
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "fs";
import { dirname, join, basename } from "path";

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_PROJECT = "jeffreysprompts.com";
const DEFAULT_OUTPUT = "apps/web/src/data/transcript.json";
const CLAUDE_PROJECTS_DIR = join(
  process.env.HOME || "",
  ".claude",
  "projects"
);

// ============================================================================
// Types
// ============================================================================

interface SessionInfo {
  uuid: string;
  path: string;
  size: number;
  modified: Date;
  projectDir: string;
}

interface ExtractOptions {
  project: string;
  since?: string;
  until?: string;
  session?: string;
  output: string;
  all: boolean;
  list: boolean;
}

interface TranscriptMessage {
  type: "human" | "assistant" | "system";
  content: string | MessageContent[];
  timestamp?: string;
  tool_use?: unknown;
}

interface MessageContent {
  type: string;
  text?: string;
  tool_use_id?: string;
  content?: string;
  name?: string;
  input?: unknown;
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(): ExtractOptions {
  const args = process.argv.slice(2);
  const options: ExtractOptions = {
    project: DEFAULT_PROJECT,
    output: DEFAULT_OUTPUT,
    all: false,
    list: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--project":
        options.project = args[++i];
        break;
      case "--since":
        options.since = args[++i];
        break;
      case "--until":
        options.until = args[++i];
        break;
      case "--session":
        options.session = args[++i];
        break;
      case "--output":
      case "-o":
        options.output = args[++i];
        break;
      case "--all":
        options.all = true;
        break;
      case "--list":
        options.list = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Extract transcript from Claude Code session files

Usage:
  bun scripts/extract-transcript.ts [options]

Options:
  --project <name>    Project name to search for (default: ${DEFAULT_PROJECT})
  --since <date>      Start date (ISO format or relative: "today", "1d")
  --until <date>      End date (ISO format or relative)
  --session <uuid>    Export a specific session by UUID
  --output <path>     Output path (default: ${DEFAULT_OUTPUT})
  --all               Export all sessions for the project (merged)
  --list              List available sessions (don't export)
  --help              Show help

Examples:
  # List all sessions for the project
  bun scripts/extract-transcript.ts --list

  # Export most recent session
  bun scripts/extract-transcript.ts

  # Export specific session
  bun scripts/extract-transcript.ts --session 0195c5d8-d456-498f-9110-9d8fd2b3c598

  # Export sessions from a specific date
  bun scripts/extract-transcript.ts --since 2026-01-10

  # Export all sessions merged
  bun scripts/extract-transcript.ts --all
  `);
}

// ============================================================================
// Session Discovery
// ============================================================================

function findProjectDir(projectName: string): string | null {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    return null;
  }

  const dirs = readdirSync(CLAUDE_PROJECTS_DIR);

  // Look for directory containing the project name
  // Claude encodes paths like: -data-projects-jeffreysprompts-com
  const searchPattern = projectName.replace(/\./g, "-").replace(/\//g, "-");

  for (const dir of dirs) {
    if (dir.includes(searchPattern)) {
      return join(CLAUDE_PROJECTS_DIR, dir);
    }
  }

  return null;
}

function discoverSessions(projectDir: string): SessionInfo[] {
  const sessions: SessionInfo[] = [];

  if (!existsSync(projectDir)) {
    return sessions;
  }

  const entries = readdirSync(projectDir);

  for (const entry of entries) {
    if (entry.endsWith(".jsonl")) {
      const path = join(projectDir, entry);
      const stat = statSync(path);
      const uuid = basename(entry, ".jsonl");

      sessions.push({
        uuid,
        path,
        size: stat.size,
        modified: stat.mtime,
        projectDir,
      });
    }
  }

  // Sort by modified date (newest first)
  sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());

  return sessions;
}

function filterSessionsByDate(
  sessions: SessionInfo[],
  since?: string,
  until?: string
): SessionInfo[] {
  let filtered = sessions;

  if (since) {
    const sinceDate = parseDate(since);
    filtered = filtered.filter((s) => s.modified >= sinceDate);
  }

  if (until) {
    const untilDate = parseDate(until);
    // Add a day to include the entire day
    untilDate.setDate(untilDate.getDate() + 1);
    filtered = filtered.filter((s) => s.modified <= untilDate);
  }

  return filtered;
}

function parseDate(dateStr: string): Date {
  if (dateStr === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  if (dateStr === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Handle relative days like "1d", "7d"
  const daysMatch = dateStr.match(/^(\d+)d$/);
  if (daysMatch) {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(daysMatch[1]));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ISO date
  return new Date(dateStr);
}

// ============================================================================
// Session Export
// ============================================================================

async function exportSessionWithCass(sessionPath: string): Promise<string> {
  try {
    // Use Bun.spawn with array args to properly handle paths with spaces
    const proc = Bun.spawn(["cass", "export", sessionPath, "--format", "json", "--include-tools"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const result = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`cass exited with code ${exitCode}`);
    }

    return result;
  } catch (error) {
    // Fallback to direct JSONL parsing if cass fails
    console.warn(`cass export failed, falling back to direct parsing: ${error}`);
    return exportSessionDirect(sessionPath);
  }
}

function exportSessionDirect(sessionPath: string): string {
  const content = readFileSync(sessionPath, "utf-8");
  const lines = content.trim().split("\n");
  const messages: TranscriptMessage[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const entry = JSON.parse(line);

      // Handle different message types from Claude Code JSONL format
      if (entry.type === "human" || entry.type === "assistant" || entry.type === "system") {
        messages.push({
          type: entry.type,
          content: entry.message?.content || entry.content || "",
          timestamp: entry.timestamp,
          tool_use: entry.tool_use || entry.message?.tool_use,
        });
      } else if (entry.message) {
        // Legacy format
        messages.push({
          type: entry.message.role || "assistant",
          content: entry.message.content || "",
          timestamp: entry.timestamp,
        });
      }
    } catch (e) {
      // Skip invalid lines
      continue;
    }
  }

  return JSON.stringify(messages, null, 2);
}

function mergeTranscripts(transcripts: string[]): string {
  const merged: TranscriptMessage[] = [];

  for (const transcript of transcripts) {
    try {
      const messages = JSON.parse(transcript);
      if (Array.isArray(messages)) {
        merged.push(...messages);
      }
    } catch (e) {
      console.warn("Failed to parse transcript for merging");
    }
  }

  // Sort by timestamp if available
  merged.sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  return JSON.stringify(merged, null, 2);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs();

  // Find project directory
  const projectDir = findProjectDir(options.project);

  if (!projectDir) {
    console.error(`Project directory not found for: ${options.project}`);
    console.error(`Checked: ${CLAUDE_PROJECTS_DIR}`);
    process.exit(1);
  }

  console.log(`Found project directory: ${projectDir}`);

  // Discover sessions
  let sessions = discoverSessions(projectDir);

  if (sessions.length === 0) {
    console.error("No sessions found in project directory");
    process.exit(1);
  }

  console.log(`Found ${sessions.length} session(s)`);

  // Filter by date if specified
  sessions = filterSessionsByDate(sessions, options.since, options.until);

  if (sessions.length === 0) {
    console.error("No sessions match the date filter");
    process.exit(1);
  }

  // List mode
  if (options.list) {
    console.log("\nAvailable sessions:");
    for (const session of sessions) {
      const sizeKB = Math.round(session.size / 1024);
      console.log(`  ${session.uuid}`);
      console.log(`    Modified: ${session.modified.toISOString()}`);
      console.log(`    Size: ${sizeKB} KB`);
      console.log();
    }
    process.exit(0);
  }

  // Filter to specific session if specified
  if (options.session) {
    const session = sessions.find((s) => s.uuid === options.session);
    if (!session) {
      console.error(`Session not found: ${options.session}`);
      process.exit(1);
    }
    sessions = [session];
  }

  // Export sessions
  let transcript: string;

  if (options.all) {
    console.log(`Exporting all ${sessions.length} session(s)...`);
    const transcripts: string[] = [];
    for (const session of sessions) {
      console.log(`  Processing: ${session.uuid}`);
      transcripts.push(await exportSessionWithCass(session.path));
    }
    transcript = mergeTranscripts(transcripts);
  } else {
    // Export most recent session
    const session = sessions[0];
    console.log(`Exporting session: ${session.uuid}`);
    transcript = await exportSessionWithCass(session.path);
  }

  // Ensure output directory exists
  const outputDir = dirname(options.output);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  writeFileSync(options.output, transcript, "utf-8");
  console.log(`\nTranscript written to: ${options.output}`);

  // Parse to get message count
  try {
    const messages = JSON.parse(transcript);
    if (Array.isArray(messages)) {
      console.log(`Total messages: ${messages.length}`);
    }
  } catch {
    // Ignore parsing errors for stats
  }

  console.log("\nNext steps:");
  console.log("  1. Review the transcript for sensitive information");
  console.log("  2. Run: bun scripts/redact-transcript.ts");
  console.log("  3. Run: bun scripts/validate-publication.ts");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
