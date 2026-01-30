import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { impactCommand } from "../../src/commands/impact";

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

describe("impactCommand", () => {
  it("outputs JSON impact for a known prompt", async () => {
    await impactCommand("idea-wizard", { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.prompt.id).toBe("idea-wizard");
    expect(payload.impact).toHaveProperty("bundles");
    expect(payload.impact).toHaveProperty("workflows");
  });

  it("returns error payload and exits for unknown prompt", () => {
    expect(() => impactCommand("unknown-prompt", { json: true })).toThrow();
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("prompt_not_found");
    expect(exitCode).toBe(1);
  });
});
