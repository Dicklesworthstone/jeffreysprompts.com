import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { renderCommand } from "../../src/commands/render";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;
const originalArgv = process.argv;

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
  process.argv = ["node", "jfp", "render", "idea-wizard", "--PROJECT=Test"]; 
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
  process.argv = originalArgv;
});

describe("renderCommand", () => {
  it("renders prompt content with context in JSON output", async () => {
    // Use absolute path to package.json (relative to test file location)
    const contextPath = new URL("../../package.json", import.meta.url).pathname;
    await renderCommand("idea-wizard", {
      json: true,
      context: contextPath,
      maxContext: "2000",
    });
    const payload = JSON.parse(output.join(""));
    expect(payload).toHaveProperty("id", "idea-wizard");
    expect(payload.rendered).toContain("Come up with your very best ideas");
    expect(payload.rendered).toContain("## Context");
    expect(payload.rendered).toContain("\"name\": \"@jeffreysprompts/cli\"");
  });

  it("exits when prompt is missing", async () => {
    await expect(renderCommand("missing-prompt", { json: true })).rejects.toThrow();
    // JSON errors go to console.log, not console.error
    const allOutput = output.join("\n");
    expect(allOutput).toContain("not_found");
    expect(exitCode).toBe(1);
  });
});
