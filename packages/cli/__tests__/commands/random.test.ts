
import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";

// Test helpers
let testDir: string;
let originalJfpHome: string | undefined;

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

// Create temp directory and set JFP_HOME before importing commands
beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "jfp-random-test-"));
  originalJfpHome = process.env.JFP_HOME;
  process.env.JFP_HOME = testDir;
});

afterAll(() => {
  // Restore env
  if (originalJfpHome === undefined) {
    delete process.env.JFP_HOME;
  } else {
    process.env.JFP_HOME = originalJfpHome;
  }

  // Cleanup temp directory
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch (e) {
    console.error("Failed to cleanup test dir:", e);
  }
});

// Dynamically import commands after setting JFP_HOME
const { randomCommand } = await import("../../src/commands/random");

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

describe("randomCommand", () => {
  it("outputs a random prompt", async () => {
    await randomCommand({ json: true });
    
    expect(exitCode).toBeUndefined();
    const result = JSON.parse(output.join(""));
    expect(result.prompt).toBeDefined();
    expect(result.prompt.id).toBeDefined();
    expect(result.copied).toBe(false);
  });

  it("filters by category", async () => {
    // Assuming 'ideation' category exists in bundled prompts
    await randomCommand({ json: true, category: "ideation" });
    
    const result = JSON.parse(output.join(""));
    expect(result.prompt.category).toBe("ideation");
  });

  it("fails if no prompts match filter", async () => {
    try {
      await randomCommand({ json: true, category: "non-existent-category" });
    } catch (e) {
      if ((e as Error).message.includes("process.exit")) {
        // expected
      } else {
        throw e;
      }
    }
    
    expect(exitCode).toBe(1);
    const result = JSON.parse(output.join(""));
    expect(result.error).toBe(true);
    expect(result.code).toBe("no_prompts");
  });
});
