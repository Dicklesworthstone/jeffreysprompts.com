/**
 * Tests for export command
 *
 * Uses actual temp directories instead of mocking fs modules.
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
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

function parseJsonOutput<T = any>(): T {
  const payload = output.join("");
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    throw new Error(
      `Expected JSON output but received: ${payload || "<empty>"}; ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function createOfflineLibraryPrompt(
  configDir: string,
  prompt: {
    id: string;
    title: string;
    content: string;
    description?: string;
    category?: string;
    tags?: string[];
  }
) {
  const libraryDir = join(configDir, "jfp", "library");
  mkdirSync(libraryDir, { recursive: true });
  writeFileSync(
    join(libraryDir, "prompts.json"),
    JSON.stringify(
      [
        {
          ...prompt,
          saved_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      null,
      2
    )
  );
}

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
    const payload = parseJsonOutput();
    expect(payload.success).toBe(true);
    expect(payload.exported.length).toBe(1);
    expect(payload.exported[0].id).toBe("idea-wizard");
    expect(payload.exported[0].file.endsWith("idea-wizard.md")).toBe(true);
  });

  it("exports multiple prompts", async () => {
    await exportCommand(["idea-wizard", "readme-reviser"], { json: true });
    const payload = parseJsonOutput();
    expect(payload.exported.length).toBe(2);
    
    expect(existsSync(join(testDir, "idea-wizard.md"))).toBe(true);
    expect(existsSync(join(testDir, "readme-reviser.md"))).toBe(true);
  });

  it("exports as markdown format", async () => {
    await exportCommand(["idea-wizard"], { json: true, format: "md" });
    const payload = parseJsonOutput();
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
    const payload = parseJsonOutput();

    expect(payload.success).toBe(true);
    expect(payload.exported).toHaveLength(1);
    expect(payload.exported[0].id).toBe("personal-only");

    const exportedContent = readFileSync(join(testDir, "personal-only.md"), "utf-8");
    expect(exportedContent).toContain("# Personal Prompt");
    expect(exportedContent).toContain("Personal prompt body");
  });

  it("uses the provided env when exporting offline-library prompts", async () => {
    const fakeHome = mkdtempSync(join(testDir, "jfp-export-home-"));
    const fakeConfig = join(fakeHome, ".config");
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      HOME: fakeHome,
      XDG_CONFIG_HOME: undefined,
      JFP_TOKEN: undefined,
    };

    createOfflineLibraryPrompt(fakeConfig, {
      id: "offline-only",
      title: "Offline Only Prompt",
      description: "Available only from the env-scoped offline library",
      content: "Offline prompt body",
      category: "workflow",
      tags: ["offline"],
    });

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
      return new Response("Not found", { status: 404 });
    };

    await exportCommand(["offline-only"], { json: true, format: "md" }, env);

    const payload = parseJsonOutput();
    expect(payload.success).toBe(true);
    expect(payload.exported).toHaveLength(1);
    expect(payload.exported[0].id).toBe("offline-only");

    const exportedContent = readFileSync(join(testDir, "offline-only.md"), "utf-8");
    expect(exportedContent).toContain("# Offline Only Prompt");
    expect(exportedContent).toContain("Offline prompt body");
  });

  it("rejects unsafe prompt ids returned by the API", async () => {
    const originalToken = process.env.JFP_TOKEN;
    const outputDir = join(testDir, "nested-output");
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

      if (url.includes("/cli/prompts/..%2Fescaped")) {
        return new Response(
          JSON.stringify({
            id: "../escaped",
            title: "Escaped Prompt",
            description: "Should not write outside the export directory",
            content: "unsafe body",
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
      try {
        await exportCommand(["../escaped"], {
          json: true,
          format: "md",
          outputDir,
        });
      } catch {
        // Expected exit
      }
    } finally {
      if (originalToken === undefined) {
        delete process.env.JFP_TOKEN;
      } else {
        process.env.JFP_TOKEN = originalToken;
      }
    }

    const payload = parseJsonOutput();
    expect(payload.success).toBe(false);
    expect(payload.failed).toEqual([
      {
        id: "../escaped",
        error: "Unsafe prompt id for filename",
      },
    ]);
    expect(exitCode).toBe(1);
    expect(existsSync(join(testDir, "escaped.md"))).toBe(false);
  });
});
