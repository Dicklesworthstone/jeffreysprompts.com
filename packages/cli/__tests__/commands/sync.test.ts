/**
 * Tests for sync command — status and sync operations
 *
 * Uses mocked fetch and temp directories for offline library.
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";

let testDir: string;
let originalJfpHome: string | undefined;

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;
const originalFetch = globalThis.fetch;
let originalJfpToken: string | undefined;

let syncCommand: typeof import("../../src/commands/sync").syncCommand;
let vaultSyncCompatCommand: typeof import("../../src/commands/sync").vaultSyncCompatCommand;

beforeAll(async () => {
  testDir = mkdtempSync(join(tmpdir(), "jfp-sync-test-"));
  originalJfpHome = process.env.JFP_HOME;
  originalJfpToken = process.env.JFP_TOKEN;
  process.env.JFP_HOME = testDir;

  const mod = await import("../../src/commands/sync");
  syncCommand = mod.syncCommand;
  vaultSyncCompatCommand = mod.vaultSyncCompatCommand;
});

afterAll(() => {
  if (originalJfpHome === undefined) {
    delete process.env.JFP_HOME;
  } else {
    process.env.JFP_HOME = originalJfpHome;
  }
  if (originalJfpToken === undefined) {
    delete process.env.JFP_TOKEN;
  } else {
    process.env.JFP_TOKEN = originalJfpToken;
  }
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch { /* ignore */ }
});

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
  if (originalJfpToken === undefined) {
    delete process.env.JFP_TOKEN;
  } else {
    process.env.JFP_TOKEN = originalJfpToken;
  }
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
  globalThis.fetch = originalFetch;
  if (originalJfpToken === undefined) {
    delete process.env.JFP_TOKEN;
  } else {
    process.env.JFP_TOKEN = originalJfpToken;
  }
});

describe("syncCommand", () => {
  it("shows status in JSON mode (never synced)", async () => {
    await syncCommand({ status: true, json: true });
    expect(exitCode).toBeUndefined();
    const json = JSON.parse(output.join(""));
    expect(json.synced).toBe(false);
    expect(json.lastSync).toBeNull();
    expect(json.promptCount).toBe(0);
  });

  it("requires authentication for sync", async () => {
    // Without credentials, sync should fail
    try {
      await syncCommand({ json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit(1)") throw e;
    }
    expect(exitCode).toBe(1);
    const json = JSON.parse(output.join(""));
    expect(json.error).toBe(true);
    expect(json.code).toBe("not_authenticated");
  });

  it("routes obsolete vault sync action through the canonical sync command", async () => {
    process.env.JFP_TOKEN = "test-access-token";
    const requests: URL[] = [];

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      requests.push(url);

      expect(init?.method).toBe("GET");
      expect(url.pathname).toBe("/api/cli/prompts");

      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            prompts: [],
            pagination: {
              page: 1,
              limit: 100,
              total: 0,
              hasMore: false,
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }) as typeof fetch;

    await vaultSyncCompatCommand("sync", { json: true });

    expect(exitCode).toBeUndefined();
    expect(requests).toHaveLength(1);
    const json = JSON.parse(output.join(""));
    expect(json.synced).toBe(true);
    expect(json.totalPrompts).toBe(0);
  });

  it("returns a structured error for unsupported vault actions", async () => {
    try {
      await vaultSyncCompatCommand("init", { json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit(1)") throw e;
    }

    expect(exitCode).toBe(1);
    const json = JSON.parse(output.join(""));
    expect(json.error).toBe(true);
    expect(json.code).toBe("deprecated_command");
    expect(json.replacement).toBe("jfp sync");
  });

  it("syncs library from the canonical prompts endpoint", async () => {
    process.env.JFP_TOKEN = "test-access-token";
    const requests: URL[] = [];
    let promptOneContent = "First prompt content";

    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      requests.push(url);

      expect(init?.method).toBe("GET");
      expect(url.pathname).toBe("/api/cli/prompts");
      expect(url.searchParams.get("limit")).toBe("100");

      const page = url.searchParams.get("page");
      const prompts =
        page === "1"
          ? [
              {
                id: "prompt-one",
                title: "Prompt One",
                description: "First synced prompt",
                content: promptOneContent,
                category: "workflow",
                tags: ["sync"],
                updatedAt: "2026-05-03T12:00:00.000Z",
              },
            ]
          : [
              {
                id: "prompt-two",
                title: "Prompt Two",
                content: "Second prompt content",
                category: null,
                tags: [],
                updated_at: "2026-05-03T12:01:00.000Z",
              },
            ];

      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            prompts,
            pagination: {
              page: Number(page),
              limit: 100,
              total: 2,
              hasMore: page === "1",
            },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }) as typeof fetch;

    await syncCommand({ json: true });

    expect(exitCode).toBeUndefined();
    expect(requests.map((url) => url.pathname)).toEqual([
      "/api/cli/prompts",
      "/api/cli/prompts",
    ]);

    const payload = JSON.parse(output.join(""));
    expect(payload.synced).toBe(true);
    expect(payload.changedPrompts).toBe(2);
    expect(payload.newPrompts).toBe(2);
    expect(payload.totalPrompts).toBe(2);

    const cached = JSON.parse(
      readFileSync(join(testDir, ".config", "jfp", "library", "prompts.json"), "utf-8")
    );
    expect(cached).toHaveLength(2);
    expect(cached[0]).toMatchObject({
      id: "prompt-one",
      saved_at: "2026-05-03T12:00:00.000Z",
    });
    expect(cached[1]).toMatchObject({
      id: "prompt-two",
      saved_at: "2026-05-03T12:01:00.000Z",
    });

    output = [];
    errors = [];
    exitCode = undefined;
    requests.length = 0;
    promptOneContent = "Updated first prompt content";

    await syncCommand({ json: true });

    const updatedPayload = JSON.parse(output.join(""));
    expect(updatedPayload.synced).toBe(true);
    expect(updatedPayload.changedPrompts).toBe(1);
    expect(updatedPayload.newPrompts).toBe(0);
    expect(updatedPayload.totalPrompts).toBe(2);
  });
});
