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
const originalFetch = globalThis.fetch;

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
  globalThis.fetch = originalFetch;
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
    expect(payload.exported[0].file.endsWith("idea-wizard.md")).toBe(true);
  });

  it("exports multiple prompts", async () => {
    await exportCommand(["idea-wizard", "readme-reviser"], { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.exported.length).toBe(2);
    
    expect(existsSync(join(testDir, "idea-wizard.md"))).toBe(true);
    expect(existsSync(join(testDir, "readme-reviser.md"))).toBe(true);
  });

  it("exports as markdown format", async () => {
    await exportCommand(["idea-wizard"], { json: true, format: "md" });
    const payload = JSON.parse(output.join(""));
    expect(payload.exported[0].file.endsWith("idea-wizard.md")).toBe(true);
  });

  it("exports personal prompts resolved from the API", async () => {
    const originalToken = process.env.JFP_TOKEN;
    process.env.JFP_TOKEN = "env-token-xyz";
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("/api/prompts")) {
        return new Response(
          JSON.stringify({
            prompts: [],
            bundles: [],
            workflows: [],
            version: "1.0.0",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (url.includes("/cli/prompts/personal-only")) {
        return new Response(
          JSON.stringify({
            id: "personal-only",
            title: "Personal Prompt",
            description: "Only available from the premium API",
            content: "Personal prompt body",
            category: "workflow",
            tags: ["premium"],
            author: "Jeffrey Emanuel",
            version: "1.0.0",
            created: "2026-01-01",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response("Not found", { status: 404 });
    };

    try {
      await exportCommand(["personal-only"], { json: true, format: "md" });
    } finally {
      if (originalToken === undefined) {
        delete process.env.JFP_TOKEN;
      } else {
        process.env.JFP_TOKEN = originalToken;
      }
    }
    const payload = JSON.parse(output.join(""));

    expect(payload.success).toBe(true);
    expect(payload.exported).toHaveLength(1);
    expect(payload.exported[0].id).toBe("personal-only");

    const exportedContent = readFileSync(join(testDir, "personal-only.md"), "utf-8");
    expect(exportedContent).toContain("# Personal Prompt");
    expect(exportedContent).toContain("Personal prompt body");
  });
});
