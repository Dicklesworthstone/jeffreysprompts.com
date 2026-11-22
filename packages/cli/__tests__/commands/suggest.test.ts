import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { suggestCommand } from "../../src/commands/suggest";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalWrite = process.stdout.write;
const originalError = console.error;
const originalExit = process.exit;

beforeEach(() => {
  output = [];
  errors = [];
  exitCode = undefined;
  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  process.stdout.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ) => {
    output.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
    const done = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    done?.(null);
    return true;
  }) as typeof process.stdout.write;
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
  process.stdout.write = originalWrite;
  console.error = originalError;
  process.exit = originalExit;
});

describe("suggestCommand", () => {
  it("outputs JSON suggestions for a task", async () => {
    await suggestCommand("improve documentation", { json: true, limit: 3 });
    const payload = JSON.parse(output.join(""));
    expect(payload.task).toBe("improve documentation");
    expect(payload.suggestions.length).toBeGreaterThan(0);
    expect(payload.suggestions.length).toBeLessThanOrEqual(3);
    expect(payload.suggestions[0]).toHaveProperty("id");
    expect(payload.suggestions[0]).toHaveProperty("matchedFields");
  });

  it("returns error payload and exits for empty task", async () => {
    await expect(suggestCommand("", { json: true })).rejects.toThrow();
    const payload = JSON.parse(output.join(""));
    expect(payload.error).toBe("empty_task");
    expect(exitCode).toBe(1);
  });
});
