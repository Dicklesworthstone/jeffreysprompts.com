/**
 * TestLogger - Structured logging infrastructure for E2E tests
 *
 * Provides consistent, detailed logging across CLI and Web E2E tests.
 * Designed for debugging failures and generating CI artifacts.
 *
 * Features:
 * - Log levels: debug, info, step, error
 * - Timestamps with millisecond precision
 * - Context/metadata support
 * - File output for CI artifact collection
 * - Color-coded console output (when TTY)
 * - Step timing (start/end with duration)
 *
 * Usage:
 *   const logger = new TestLogger("cli-workflow");
 *   logger.step("list prompts");
 *   logger.info("Found 3 prompts");
 *   logger.stepEnd("list prompts", true);
 *
 * Environment:
 *   E2E_LOG_LEVEL=debug|info|step|error (default: step)
 *   E2E_LOG_FILE=/path/to/logfile.log (optional file output)
 *   E2E_VERBOSE=1 (shorthand for E2E_LOG_LEVEL=debug)
 */

import { appendFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

export type LogLevel = "debug" | "info" | "step" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
  durationMs?: number;
}

interface StepTimer {
  name: string;
  startTime: number;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  step: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[90m", // gray
  info: "\x1b[36m", // cyan
  step: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export class TestLogger {
  private context: string;
  private minLevel: LogLevel;
  private logFile: string | null;
  private entries: LogEntry[] = [];
  private stepTimers: Map<string, StepTimer> = new Map();
  private isTTY: boolean;
  private fileInitialized = false;

  constructor(context: string, options?: { minLevel?: LogLevel; logFile?: string }) {
    this.context = context;
    this.isTTY = process.stdout.isTTY ?? false;

    // Determine log level from options or environment
    if (options?.minLevel) {
      this.minLevel = options.minLevel;
    } else if (process.env.E2E_VERBOSE === "1") {
      this.minLevel = "debug";
    } else {
      this.minLevel = (process.env.E2E_LOG_LEVEL as LogLevel) || "step";
    }

    // Determine log file from options or environment
    this.logFile = options?.logFile ?? process.env.E2E_LOG_FILE ?? null;
  }

  /**
   * Log a debug message (lowest priority, most verbose)
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  /**
   * Log an info message (general information)
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  /**
   * Log a step message (test step boundaries)
   */
  step(message: string, data?: Record<string, unknown>): void {
    this.log("step", message, data);
  }

  /**
   * Log an error message (highest priority)
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }

  /**
   * Start timing a step (pairs with stepEnd)
   */
  stepStart(stepName: string): void {
    this.stepTimers.set(stepName, {
      name: stepName,
      startTime: performance.now(),
    });
    this.step(`START: ${stepName}`);
  }

  /**
   * End timing a step and log duration
   */
  stepEnd(stepName: string, success: boolean, data?: Record<string, unknown>): void {
    const timer = this.stepTimers.get(stepName);
    const durationMs = timer ? Math.round(performance.now() - timer.startTime) : undefined;
    this.stepTimers.delete(stepName);

    const status = success ? "PASS" : "FAIL";
    const message = `${status}: ${stepName}${durationMs !== undefined ? ` (${durationMs}ms)` : ""}`;

    this.log(success ? "step" : "error", message, { ...data, durationMs });
  }

  /**
   * Log command execution with stdout/stderr capture
   */
  logCommand(
    command: string,
    result: { stdout: string; stderr: string; exitCode: number },
    truncate = 500
  ): void {
    const truncatedStdout =
      result.stdout.length > truncate
        ? result.stdout.slice(0, truncate) + `... (${result.stdout.length} chars total)`
        : result.stdout;
    const truncatedStderr =
      result.stderr.length > truncate
        ? result.stderr.slice(0, truncate) + `... (${result.stderr.length} chars total)`
        : result.stderr;

    this.debug(`Command: ${command}`, {
      exitCode: result.exitCode,
      stdoutLength: result.stdout.length,
      stderrLength: result.stderr.length,
    });

    if (result.stdout) {
      this.debug(`stdout: ${truncatedStdout.trim()}`);
    }
    if (result.stderr) {
      this.debug(`stderr: ${truncatedStderr.trim()}`);
    }
  }

  /**
   * Log assertion for test verification
   */
  assertion(description: string, passed: boolean, details?: Record<string, unknown>): void {
    const level = passed ? "debug" : "error";
    const status = passed ? "ASSERT PASS" : "ASSERT FAIL";
    this.log(level, `${status}: ${description}`, details);
  }

  /**
   * Get all log entries (for inspection or file dump)
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Write all entries to a file (for CI artifact collection)
   */
  writeToFile(filePath: string): void {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const content = this.entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
    writeFileSync(filePath, content);
  }

  /**
   * Create a child logger with additional context
   */
  child(subContext: string): TestLogger {
    const child = new TestLogger(`${this.context}:${subContext}`, {
      minLevel: this.minLevel,
      logFile: this.logFile,
    });
    return child;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    // Check if this level should be logged
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level,
      context: this.context,
      message,
      ...(data && { data }),
    };

    this.entries.push(entry);
    this.writeToConsole(entry);
    this.appendToFile(entry);
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number, width = 2) => String(n).padStart(width, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
  }

  private writeToConsole(entry: LogEntry): void {
    const levelLabel = entry.level.toUpperCase().padEnd(5);
    const color = this.isTTY ? LEVEL_COLORS[entry.level] : "";
    const reset = this.isTTY ? RESET : "";
    const bold = this.isTTY ? BOLD : "";

    let line = `${color}[${entry.timestamp}] [${levelLabel}] [${entry.context}]${reset} ${entry.message}`;

    if (entry.data && Object.keys(entry.data).length > 0) {
      // For step level, show data inline; for debug, pretty print
      if (entry.level === "debug") {
        line += `\n${color}  ${JSON.stringify(entry.data, null, 2).replace(/\n/g, "\n  ")}${reset}`;
      } else {
        line += ` ${color}${JSON.stringify(entry.data)}${reset}`;
      }
    }

    console.log(line);
  }

  private appendToFile(entry: LogEntry): void {
    if (!this.logFile) return;

    // Initialize file on first write
    if (!this.fileInitialized) {
      const dir = dirname(this.logFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      this.fileInitialized = true;
    }

    try {
      appendFileSync(this.logFile, JSON.stringify(entry) + "\n");
    } catch {
      // Silently ignore file write errors to not break tests
    }
  }
}

/**
 * Create a pre-configured logger for CLI E2E tests
 */
export function createCliLogger(testName: string): TestLogger {
  return new TestLogger(`cli:${testName}`, {
    logFile: process.env.E2E_LOG_FILE ?? `/tmp/e2e-logs/cli-${testName}.jsonl`,
  });
}

/**
 * Create a pre-configured logger for Web E2E tests
 */
export function createWebLogger(testName: string): TestLogger {
  return new TestLogger(`web:${testName}`, {
    logFile: process.env.E2E_LOG_FILE ?? `/tmp/e2e-logs/web-${testName}.jsonl`,
  });
}

export default TestLogger;
