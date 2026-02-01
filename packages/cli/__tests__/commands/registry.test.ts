/**
 * Real filesystem tests for registry commands (status, refresh)
 *
 * Uses actual temp directories instead of mocking fs modules.
 * Set JFP_HOME env var to redirect config paths to temp directory.
 */
import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";

// Test helpers
let testDir: string;
let originalJfpHome: string | undefined;

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalExit = process.exit;
let originalFetch: typeof fetch | undefined;

// Module imports - assigned in beforeAll after JFP_HOME is set
let statusCommand: typeof import("../../src/commands/registry").statusCommand;
let refreshCommand: typeof import("../../src/commands/registry").refreshCommand;
let getConfigDir: typeof import("../../src/lib/config").getConfigDir;

// Create temp directory and set JFP_HOME before importing commands
beforeAll(async () => {
  testDir = mkdtempSync(join(tmpdir(), "jfp-registry-test-"));
  originalJfpHome = process.env.JFP_HOME;
  process.env.JFP_HOME = testDir;

  // Import AFTER JFP_HOME is set so modules use correct config path
  const registry = await import("../../src/commands/registry");
  statusCommand = registry.statusCommand;
  refreshCommand = registry.refreshCommand;

  const config = await import("../../src/lib/config");
  getConfigDir = config.getConfigDir;
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

function getCachePath(): string {
  return join(getConfigDir(), "registry.json");
}

function getMetaPath(): string {
  return join(getConfigDir(), "registry.meta.json");
}

beforeEach(() => {
  output = [];
  errors = [];
  exitCode = undefined;
  originalFetch = globalThis.fetch;

  // Clean up config directory before each test
  const configDir = getConfigDir();
  try {
    rmSync(configDir, { recursive: true, force: true });
  } catch {}

  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.join(" "));
  };
  console.warn = () => {};
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error("process.exit");
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
  process.exit = originalExit;
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

describe("statusCommand", () => {
  it("outputs JSON with cache status when no cache exists", async () => {
    await statusCommand({ json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.cache.exists).toBe(false);
    expect(payload.settings).toHaveProperty("remoteUrl");
    expect(payload.settings).toHaveProperty("autoRefresh");
    expect(payload.settings).toHaveProperty("cacheTtl");
    expect(payload).toHaveProperty("budgetAlerts");
    expect(payload.budgetAlerts.count).toBe(0);
  });

  it("outputs JSON with cache info when cache exists", async () => {
    // Create cache directory and files
    const configDir = getConfigDir();
    mkdirSync(configDir, { recursive: true });

    const meta = {
      version: "1.0.0",
      etag: "test-etag",
      fetchedAt: new Date().toISOString(),
      promptCount: 5,
    };
    writeFileSync(getCachePath(), JSON.stringify({ prompts: [], version: "1.0.0" }));
    writeFileSync(getMetaPath(), JSON.stringify(meta));

    await statusCommand({ json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.cache.exists).toBe(true);
    expect(payload).toHaveProperty("meta");
    expect(payload).toHaveProperty("settings");
    expect(payload).toHaveProperty("localPrompts");
    expect(payload).toHaveProperty("budgetAlerts");
  });

  it("shows correct cache path", async () => {
    await statusCommand({ json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.cache.path).toContain(testDir);
    expect(payload.cache.path).toContain(".config/jfp/registry.json");
    expect(payload).toHaveProperty("budgetAlerts");
  });
});

describe("refreshCommand", () => {
  it("outputs JSON success response when refresh succeeds", async () => {
    // Mock fetch to return a successful response
    globalThis.fetch = (async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ prompts: [{ id: "test" }], version: "2.0.0" }),
        headers: {
          get: (key: string) => (key.toLowerCase() === "etag" ? "new-etag" : null),
        },
      } as Response;
    }) as typeof fetch;

    await refreshCommand({ json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.success).toBe(true);
    expect(payload.promptCount).toBeGreaterThan(0);
    expect(payload).toHaveProperty("elapsedMs");
  });

  it("uses bundled prompts when fetch fails", async () => {
    globalThis.fetch = (async () => {
      throw new Error("Network error");
    }) as typeof fetch;

    await refreshCommand({ json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.success).toBe(true);
    expect(payload.source).toBe("bundled");
  });

  it("creates cache files after refresh", async () => {
    // Mock fetch
    globalThis.fetch = (async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          prompts: [{ id: "test", title: "Test" }],
          version: "2.0.0",
        }),
        headers: {
          get: (key: string) => (key.toLowerCase() === "etag" ? "test-etag" : null),
        },
      } as Response;
    }) as typeof fetch;

    await refreshCommand({ json: true });

    // Verify cache files exist
    expect(existsSync(getCachePath())).toBe(true);
    expect(existsSync(getMetaPath())).toBe(true);

    // Verify cache content
    const cache = JSON.parse(readFileSync(getCachePath(), "utf-8"));
    expect(cache.prompts.length).toBeGreaterThan(0);
  });

  it("handles 304 Not Modified response", async () => {
    // Create existing cache first
    const configDir = getConfigDir();
    mkdirSync(configDir, { recursive: true });

    const existingMeta = {
      version: "1.0.0",
      etag: "existing-etag",
      fetchedAt: new Date().toISOString(),
      promptCount: 3,
    };
    writeFileSync(getCachePath(), JSON.stringify({ prompts: [{ id: "cached" }], version: "1.0.0" }));
    writeFileSync(getMetaPath(), JSON.stringify(existingMeta));

    // Mock 304 response
    globalThis.fetch = (async () => {
      return {
        ok: false,
        status: 304,
        json: async () => ({}),
        headers: {
          get: () => null,
        },
      } as Response;
    }) as typeof fetch;

    await refreshCommand({ json: true });
    const payload = JSON.parse(output.join(""));
    // Should fall back to cached or bundled
    expect(payload.success).toBe(true);
  });
});
