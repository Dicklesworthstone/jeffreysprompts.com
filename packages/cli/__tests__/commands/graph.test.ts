import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { graphExportCommand } from "../../src/commands/graph";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

function parseJson<T = Record<string, unknown>>(payload: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON output: ${message}`);
  }
}

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

describe("graphExportCommand", () => {
  it("outputs JSON graph data", async () => {
    await graphExportCommand({ json: true });
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload).toHaveProperty("nodes");
    expect(payload).toHaveProperty("edges");
    expect(payload.totals).toHaveProperty("nodes");
  });

  it("outputs DOT graph when format=dot", async () => {
    await graphExportCommand({ json: true, format: "dot" });
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.format).toBe("dot");
    expect(payload.graph).toContain("digraph");
  });

  it("outputs Mermaid graph when format=mermaid", async () => {
    await graphExportCommand({ json: true, format: "mermaid" });
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.format).toBe("mermaid");
    expect(payload.graph).toContain("graph TD");
  });

  it("returns error payload and exits for invalid format", () => {
    expect(() => graphExportCommand({ json: true, format: "csv" })).toThrow();
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.code).toBe("invalid_format");
    expect(exitCode).toBe(1);
  });
});
