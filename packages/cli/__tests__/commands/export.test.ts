/**
 * Tests for export command
 *
 * Uses actual temp directories instead of mocking fs modules.
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { exportCommand } from "../../src/commands/export";

// Test helpers
let testDir: string;
let originalCwd: string;

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "jfp-export-test-"));
  originalCwd = process.cwd();
});

afterAll(() => {
  // Cleanup temp directory
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch (e) {
    console.error("Failed to cleanup test dir:", e);
  }
});

beforeEach(() => {
  output = [];
  errors = [];
  exitCode = undefined;

  // Change to temp directory for file writes
  process.chdir(testDir);

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
  process.chdir(originalCwd);
});

describe("exportCommand", () => {
  it("prints markdown to stdout when --stdout is set", async () => {
    await exportCommand(["idea-wizard"], { stdout: true, format: "md" });
    const text = output.join("\n");
    expect(text).toContain("# The Idea Wizard");
  });

  it("outputs JSON summary when --json is set", async () => {
    await exportCommand(["idea-wizard"], { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.success).toBe(true);
    expect(payload.exported.length).toBe(1);
    expect(payload.exported[0].id).toBe("idea-wizard");
    expect(payload.exported[0].file).toBe("idea-wizard-SKILL.md");
    
    expect(existsSync(join(testDir, "idea-wizard-SKILL.md"))).toBe(true);
  });

  it("exits with error when no ids provided", async () => {
    try {
      await exportCommand([], { json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit") throw e;
    }
    
    expect(exitCode).toBe(1);
  });

  it("exports multiple prompts", async () => {
    await exportCommand(["idea-wizard", "readme-reviser"], { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.exported.length).toBe(2);
    
    expect(existsSync(join(testDir, "idea-wizard-SKILL.md"))).toBe(true);
    expect(existsSync(join(testDir, "readme-reviser-SKILL.md"))).toBe(true);
  });

  it("exports as markdown format", async () => {
    await exportCommand(["idea-wizard"], { json: true, format: "md" });
    const payload = JSON.parse(output.join(""));
    expect(payload.exported[0].file).toBe("idea-wizard.md");
    
    expect(existsSync(join(testDir, "idea-wizard.md"))).toBe(true);
  });
});
