import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { suggestCommand } from "../../src/commands/suggest";

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
    throw new Error("process.exit");
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
});

describe("suggestCommand", () => {
  it("outputs JSON suggestions for a task", () => {
    suggestCommand("improve documentation", { json: true, limit: 3 });
    const payload = JSON.parse(output.join(""));
    expect(payload.task).toBe("improve documentation");
    expect(payload.suggestions.length).toBeGreaterThan(0);
    expect(payload.suggestions.length).toBeLessThanOrEqual(3);
    expect(payload.suggestions[0]).toHaveProperty("id");
    expect(payload.suggestions[0]).toHaveProperty("matchedFields");
  });

  it("returns error payload and exits for empty task", () => {
    expect(() => suggestCommand("", { json: true })).toThrow();
    const payload = JSON.parse(output.join(""));
    expect(payload.error).toBe("empty_task");
    expect(exitCode).toBe(1);
  });
});
