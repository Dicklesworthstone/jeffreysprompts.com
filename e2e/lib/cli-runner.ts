/**
 * CLI Runner - Process spawning with integrated logging for E2E tests
 *
 * Wraps Bun.spawn with:
 * - Automatic stdout/stderr capture and logging
 * - Command timing (start/end with duration)
 * - Exit code tracking
 * - JSON parsing utilities
 * - Configurable environment isolation
 *
 * Usage:
 *   const runner = new CliRunner(logger);
 *   const result = await runner.run("list --json");
 *   const data = runner.parseJson(result.stdout);
 */

import { TestLogger } from "./test-logger";

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  command: string;
}

export interface CliRunnerOptions {
  /** Path to the CLI entry point (default: jfp.ts in project root) */
  cliPath?: string;
  /** Working directory for commands */
  cwd?: string;
  /** Environment variables (merged with process.env) */
  env?: Record<string, string>;
  /** Fake HOME directory for test isolation */
  fakeHome?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Whether to log command output at debug level */
  logOutput?: boolean;
}

const DEFAULT_PROJECT_ROOT = "/data/projects/jeffreysprompts.com";
const DEFAULT_FAKE_HOME = "/tmp/jfp-e2e-home";
const DEFAULT_TIMEOUT = 30000;

export class CliRunner {
  private logger: TestLogger;
  private cliPath: string;
  private cwd: string;
  private env: Record<string, string>;
  private timeout: number;
  private logOutput: boolean;

  constructor(logger: TestLogger, options?: CliRunnerOptions) {
    this.logger = logger;
    this.cliPath = options?.cliPath ?? `${DEFAULT_PROJECT_ROOT}/jfp.ts`;
    this.cwd = options?.cwd ?? DEFAULT_PROJECT_ROOT;
    this.timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    this.logOutput = options?.logOutput ?? true;

    // Build environment with optional fake home
    const fakeHome = options?.fakeHome ?? DEFAULT_FAKE_HOME;
    this.env = {
      ...process.env,
      HOME: fakeHome,
      ...(options?.env ?? {}),
    } as Record<string, string>;
  }

  /**
   * Run a CLI command and return the result
   *
   * @param args - Command arguments (e.g., "list --json" or ["list", "--json"])
   * @param stepName - Optional step name for logging (defaults to command)
   */
  async run(args: string | string[], stepName?: string): Promise<CommandResult> {
    const argsArray = typeof args === "string" ? args.split(" ").filter(Boolean) : args;
    const command = `jfp ${argsArray.join(" ")}`;
    const step = stepName ?? command;

    this.logger.stepStart(step);

    const startTime = performance.now();

    try {
      const proc = Bun.spawn(["bun", this.cliPath, ...argsArray], {
        cwd: this.cwd,
        env: this.env,
      });

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Command timed out after ${this.timeout}ms`)), this.timeout);
      });

      // Wait for process with timeout
      const [stdout, stderr, exitCode] = await Promise.race([
        Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text(),
          proc.exited,
        ]),
        timeoutPromise,
      ]);

      const durationMs = Math.round(performance.now() - startTime);

      const result: CommandResult = {
        stdout,
        stderr,
        exitCode,
        durationMs,
        command,
      };

      // Log the result
      if (this.logOutput) {
        this.logger.logCommand(command, result);
      }

      this.logger.stepEnd(step, exitCode === 0, {
        exitCode,
        durationMs,
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
      });

      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`Command failed: ${errorMessage}`, { command, durationMs });
      this.logger.stepEnd(step, false, { error: errorMessage, durationMs });

      return {
        stdout: "",
        stderr: errorMessage,
        exitCode: 1,
        durationMs,
        command,
      };
    }
  }

  /**
   * Run a command and parse JSON output
   */
  async runJson<T = unknown>(args: string | string[], stepName?: string): Promise<{ result: CommandResult; data: T | null; parseError?: string }> {
    const result = await this.run(args, stepName);
    const { data, error } = this.parseJson<T>(result.stdout);

    if (error) {
      this.logger.error("JSON parse failed", {
        error,
        stdout: result.stdout.slice(0, 200),
      });
    }

    return { result, data, parseError: error };
  }

  /**
   * Parse JSON with error handling
   */
  parseJson<T = unknown>(text: string): { data: T | null; error?: string } {
    try {
      const data = JSON.parse(text) as T;
      return { data };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown parse error",
      };
    }
  }

  /**
   * Assert command succeeded (exit code 0)
   */
  assertSuccess(result: CommandResult, description?: string): void {
    const passed = result.exitCode === 0;
    this.logger.assertion(description ?? `Command succeeded: ${result.command}`, passed, {
      exitCode: result.exitCode,
      stderr: result.stderr.slice(0, 200),
    });

    if (!passed) {
      throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr.slice(0, 500)}`);
    }
  }

  /**
   * Assert command failed (non-zero exit code)
   */
  assertFailure(result: CommandResult, expectedCode?: number, description?: string): void {
    const passed = expectedCode !== undefined ? result.exitCode === expectedCode : result.exitCode !== 0;
    this.logger.assertion(description ?? `Command failed as expected: ${result.command}`, passed, {
      exitCode: result.exitCode,
      expectedCode,
    });

    if (!passed) {
      throw new Error(
        expectedCode !== undefined
          ? `Expected exit code ${expectedCode}, got ${result.exitCode}`
          : `Expected non-zero exit code, got ${result.exitCode}`
      );
    }
  }

  /**
   * Assert JSON output contains expected fields
   */
  assertJsonFields<T extends object>(data: T | null, fields: (keyof T)[], description?: string): void {
    if (!data) {
      this.logger.assertion(description ?? "JSON data exists", false, { data: null });
      throw new Error("Expected JSON data but got null");
    }

    const missingFields = fields.filter((f) => !(f in data));
    const passed = missingFields.length === 0;

    this.logger.assertion(description ?? `JSON contains fields: ${fields.join(", ")}`, passed, {
      expectedFields: fields,
      missingFields,
      actualKeys: Object.keys(data),
    });

    if (!passed) {
      throw new Error(`Missing JSON fields: ${missingFields.join(", ")}`);
    }
  }

  /**
   * Get a child runner with additional context
   */
  child(subContext: string): CliRunner {
    return new CliRunner(this.logger.child(subContext), {
      cliPath: this.cliPath,
      cwd: this.cwd,
      env: this.env,
      timeout: this.timeout,
      logOutput: this.logOutput,
    });
  }
}

/**
 * Create a pre-configured CLI runner for E2E tests
 */
export function createCliRunner(testName: string, options?: Partial<CliRunnerOptions>): CliRunner {
  const { TestLogger } = require("./test-logger");
  const logger = new TestLogger(`cli:${testName}`, {
    logFile: process.env.E2E_LOG_FILE ?? `/tmp/e2e-logs/cli-${testName}.jsonl`,
  });

  return new CliRunner(logger, options);
}

export default CliRunner;
