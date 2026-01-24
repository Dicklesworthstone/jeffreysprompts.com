/**
 * CLI Spawn Wrapper with Logging
 *
 * Provides a wrapper around Bun's spawn API that captures stdout/stderr
 * and logs command execution with timing for E2E test debugging.
 */

import { spawn, type Subprocess } from "bun";
import { TestLogger } from "./logger";

export interface SpawnOptions {
  /** Command and arguments */
  cmd: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Logger instance for output */
  logger?: TestLogger;
  /** Whether to include output in logs (default: true) */
  logOutput?: boolean;
}

export interface SpawnResult {
  /** Exit code (0 = success) */
  exitCode: number;
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Whether the command succeeded (exit code 0) */
  success: boolean;
  /** Whether the command timed out */
  timedOut: boolean;
}

/**
 * Spawn a CLI command with logging and timing.
 *
 * @example
 * ```ts
 * const logger = new TestLogger({ testName: "cli-list" });
 * const result = await spawnCli({
 *   cmd: ["bun", "run", "jfp.ts", "list", "--json"],
 *   cwd: "/path/to/project",
 *   logger,
 * });
 *
 * if (result.success) {
 *   const prompts = JSON.parse(result.stdout);
 * }
 * ```
 */
export async function spawnCli(options: SpawnOptions): Promise<SpawnResult> {
  const { cmd, cwd, env, timeout = 30000, logger, logOutput = true } = options;
  const cmdStr = cmd.join(" ");

  logger?.step(`Executing: ${cmdStr}`, { cwd, timeout });

  const startTime = Date.now();
  let timedOut = false;

  // Track the process for timeout cleanup
  let proc: ReturnType<typeof spawn> | undefined;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    if (proc) {
      proc.kill("SIGKILL");
    }
    logger?.error(`Command timed out after ${timeout}ms`);
  }, timeout);

  try {
    proc = spawn({
      cmd,
      cwd,
      env: { ...process.env, ...env },
      stdout: "pipe",
      stderr: "pipe",
    });

    // Collect output
    const stdoutChunks: Uint8Array[] = [];
    const stderrChunks: Uint8Array[] = [];

    // Read streams (handle case where stdout/stderr might be file descriptors)
    const stdoutStream = proc.stdout;
    const stderrStream = proc.stderr;

    const readStream = async (
      stream: ReadableStream<Uint8Array> | number | null | undefined,
      chunks: Uint8Array[]
    ) => {
      if (!stream || typeof stream === 'number') return;
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    };

    await Promise.all([
      readStream(stdoutStream, stdoutChunks),
      readStream(stderrStream, stderrChunks),
      proc.exited,
    ]);

    clearTimeout(timeoutId);

    const durationMs = Date.now() - startTime;
    const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
    const stderr = Buffer.concat(stderrChunks).toString("utf-8");
    const exitCode = proc.exitCode ?? -1;
    const success = exitCode === 0;

    // Log results
    if (logger) {
      const logLevel = success ? "info" : "error";
      logger[logLevel](`Command completed`, {
        exitCode,
        durationMs,
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
      });

      if (logOutput) {
        if (stdout.trim()) {
          // Truncate long output
          const truncated = stdout.length > 2000 ? stdout.slice(0, 2000) + "\n[...truncated]" : stdout;
          logger.debug("stdout:\n" + truncated);
        }
        if (stderr.trim()) {
          logger.debug("stderr:\n" + stderr);
        }
      }
    }

    return {
      exitCode,
      stdout,
      stderr,
      durationMs,
      success,
      timedOut,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - startTime;

    const errorMessage = err instanceof Error ? err.message : String(err);
    logger?.error(`Command failed: ${errorMessage}`);

    return {
      exitCode: -1,
      stdout: "",
      stderr: errorMessage,
      durationMs,
      success: false,
      timedOut,
    };
  }
}

/**
 * Spawn jfp CLI with common defaults.
 */
export async function spawnJfp(
  args: string[],
  options: Omit<SpawnOptions, "cmd"> = {}
): Promise<SpawnResult> {
  const cwd = options.cwd ?? process.cwd();
  // Use bun to run jfp.ts from the repo root
  const cmd = ["bun", "run", "jfp.ts", ...args];

  return spawnCli({ ...options, cmd, cwd });
}
