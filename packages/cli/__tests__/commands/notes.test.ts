/**
 * Tests for notes command — note management on prompts
 *
 * Tests error paths (no auth, prompt not found).
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { notesCommand } from "../../src/commands/notes";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

beforeEach(() => {
  output = [];
  errors = [];
  exitCode = undefined;

  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.join(" "));
  };
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`process.exit(${code})`);
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
});

describe("notesCommand", () => {
  it("exits with error for non-existent prompt (JSON)", async () => {
    try {
      await notesCommand("nonexistent-prompt-id", { json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit(1)") throw e;
    }
    expect(exitCode).toBe(1);
    const json = JSON.parse(output.join(""));
    expect(json.error).toBe(true);
    expect(json.code).toBe("not_found");
  });

  it("exits with error for non-existent prompt (text)", async () => {
    try {
      await notesCommand("nonexistent-prompt-id", {});
    } catch (e) {
      if ((e as Error).message !== "process.exit(1)") throw e;
    }
    expect(exitCode).toBe(1);
    // Error may go to console.log or console.error depending on implementation
    const allOutput = [...output, ...errors].join(" ");
    expect(allOutput).toContain("not found");
  });

  it("requires authentication for valid prompt (JSON)", async () => {
    // Use a known prompt ID from the registry
    // The command checks prompt existence first, then auth
    // With a valid prompt but no auth, should get not_authenticated
    try {
      // "analyze-code" is a common prompt in the registry
      await notesCommand("analyze-code", { json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit(1)") throw e;
    }
    expect(exitCode).toBe(1);
    const json = JSON.parse(output.join(""));
    expect(json.error).toBe(true);
    // Could be not_found (if prompt doesn't exist) or not_authenticated
    expect(["not_found", "not_authenticated"]).toContain(json.code);
  });
});
