import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { showCommand } from "../../src/commands/show";

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

describe("showCommand", () => {
  it("outputs JSON for a valid prompt", () => {
    showCommand("idea-wizard", { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload).toHaveProperty("id", "idea-wizard");
    expect(payload).toHaveProperty("content");
  });

  it("outputs raw content when --raw is set", () => {
    showCommand("idea-wizard", { raw: true });
    const text = output.join("");
    expect(text).toContain("Come up with your very best ideas");
  });

  it("returns not_found JSON and exits for missing prompt", () => {
    expect(() => showCommand("missing-prompt", { json: true })).toThrow();
    const payload = JSON.parse(output.join(""));
    expect(payload).toEqual({ error: "not_found" });
    expect(exitCode).toBe(1);
  });

  it("prints error and exits for missing prompt in human mode", () => {
    expect(() => showCommand("missing-prompt", {})).toThrow();
    expect(errors.join("\n")).toContain("Prompt not found");
    expect(exitCode).toBe(1);
  });
});
