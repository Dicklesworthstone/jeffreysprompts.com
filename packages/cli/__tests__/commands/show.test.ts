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
  it("outputs JSON for a valid prompt", async () => {
    await showCommand("idea-wizard", { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.id).toBe("idea-wizard");
    expect(payload.title).toBe("The Idea Wizard");
  });

  it("outputs raw content when --raw is set", async () => {
    await showCommand("idea-wizard", { raw: true });
    const text = output.join("");
    expect(text).toContain("Come up with your very best ideas");
  });

  it("returns not_found JSON and exits for missing prompt", async () => {
    try {
      await showCommand("missing-prompt", { json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit") throw e;
    }
    
    expect(exitCode).toBe(1);
    const payload = JSON.parse(output.join(""));
    expect(payload.error).toBe("not_found");
  });
});
