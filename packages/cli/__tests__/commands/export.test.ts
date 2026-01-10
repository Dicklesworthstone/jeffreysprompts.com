import { describe, it, expect, beforeEach, afterEach, afterAll, mock } from "bun:test";

const writes: Array<{ path: string; content: string }> = [];

mock.module("fs", () => {
  return {
    writeFileSync: (path: string, content: string) => {
      writes.push({ path: String(path), content: String(content) });
    },
  };
});

const { exportCommand } = await import("../../src/commands/export");

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

beforeEach(() => {
  output = [];
  errors = [];
  writes.length = 0;
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

afterAll(() => {
  mock.restore();
});

describe("exportCommand", () => {
  it("prints markdown to stdout when --stdout is set", () => {
    exportCommand(["idea-wizard"], { stdout: true, format: "md" });
    const text = output.join("\n");
    expect(text).toContain("# The Idea Wizard");
    expect(writes.length).toBe(0);
  });

  it("outputs JSON summary when --json is set", () => {
    exportCommand(["idea-wizard"], { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.exported[0].id).toBe("idea-wizard");
    expect(payload.exported[0].file).toBe("idea-wizard-SKILL.md");
    expect(writes.length).toBe(1);
  });

  it("exits with error when no ids provided", () => {
    expect(() => exportCommand([], { json: true })).toThrow();
    expect(errors.join("\n")).toContain("No prompts specified");
    expect(exitCode).toBe(1);
  });
});
