/**
 * Real filesystem tests for registry loader
 *
 * Uses actual temp directories instead of mocking fs modules.
 * Set JFP_HOME env var to redirect config paths to temp directory.
 */
import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { prompts } from "@jeffreysprompts/core/prompts";

// Test helpers
let testDir: string;
let originalJfpHome: string | undefined;
let originalFetch: typeof fetch | undefined;

// Module imports - assigned in beforeAll after JFP_HOME is set
let loadRegistry: typeof import("../../src/lib/registry-loader").loadRegistry;
let getConfigDir: typeof import("../../src/lib/config").getConfigDir;

// Create temp directory and set JFP_HOME before importing commands
beforeAll(async () => {
  testDir = mkdtempSync(join(tmpdir(), "jfp-registry-loader-test-"));
  originalJfpHome = process.env.JFP_HOME;
  process.env.JFP_HOME = testDir;

  // Import AFTER JFP_HOME is set so modules use correct config path
  const registryLoader = await import("../../src/lib/registry-loader");
  loadRegistry = registryLoader.loadRegistry;

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

function getOfflineLibraryPath(): string {
  return join(getConfigDir(), "library", "prompts.json");
}

beforeEach(() => {
  originalFetch = globalThis.fetch;

  // Clean up config directory before each test
  const configDir = getConfigDir();
  try {
    rmSync(configDir, { recursive: true, force: true });
  } catch {}
});

afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

describe("loadRegistry", () => {
  it("returns cached prompts when cache is fresh", async () => {
    // Create cache directory and files
    const configDir = getConfigDir();
    mkdirSync(configDir, { recursive: true });

    const payload = { prompts: [prompts[0]], version: "1.0.0" };
    const meta = {
      version: "1.0.0",
      etag: null,
      fetchedAt: new Date().toISOString(),
      promptCount: 1,
    };
    writeFileSync(getCachePath(), JSON.stringify(payload));
    writeFileSync(getMetaPath(), JSON.stringify(meta));

    const result = await loadRegistry();
    expect(result.source).toBe("cache");
    expect(result.prompts[0].id).toBe(prompts[0].id);
  });

  it("fetches remote registry and writes cache when missing", async () => {
    // Mock fetch to return a successful response
    globalThis.fetch = (async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ prompts: [prompts[1]], version: "1.0.0" }),
        headers: {
          get: (key: string) => (key.toLowerCase() === "etag" ? "etag-1" : null),
        },
      } as Response;
    }) as typeof fetch;

    const result = await loadRegistry();
    expect(result.source).toBe("remote");
    expect(result.prompts[0].id).toBe(prompts[1].id);

    // Verify cache files were created
    const { existsSync } = await import("fs");
    expect(existsSync(getCachePath())).toBe(true);
    expect(existsSync(getMetaPath())).toBe(true);
  });

  it("falls back to bundled prompts when fetch fails", async () => {
    // Mock fetch to fail
    globalThis.fetch = (async () => {
      throw new Error("Network error");
    }) as typeof fetch;

    const result = await loadRegistry();
    expect(result.source).toBe("bundled");
    expect(result.prompts.length).toBeGreaterThan(0);
  });

  it("ignores cached ETag when cache payload is missing", async () => {
    const configDir = getConfigDir();
    mkdirSync(configDir, { recursive: true });

    writeFileSync(
      getMetaPath(),
      JSON.stringify({
        version: "1.0.0",
        etag: "etag-only",
        fetchedAt: new Date().toISOString(),
        promptCount: 0,
      })
    );

    globalThis.fetch = (async (_url, init) => {
      expect(new Headers(init?.headers).get("If-None-Match")).toBeNull();
      return {
        ok: true,
        status: 200,
        json: async () => ({ prompts: [prompts[2]], version: "1.0.0" }),
        headers: {
          get: (key: string) => (key.toLowerCase() === "etag" ? "etag-2" : null),
        },
      } as Response;
    }) as typeof fetch;

    const result = await loadRegistry();
    expect(result.source).toBe("remote");
    expect(result.prompts.some((prompt) => prompt.id === prompts[2].id)).toBe(true);
  });

  it("does not let offline library entries overwrite richer registry metadata", async () => {
    const configDir = getConfigDir();
    mkdirSync(join(configDir, "library"), { recursive: true });

    const cachedPrompt = {
      ...prompts[0],
      description: "Registry description",
      tags: ["registry-tag"],
      author: "Registry Author",
      featured: true,
    };

    writeFileSync(
      getCachePath(),
      JSON.stringify({
        prompts: [cachedPrompt],
        version: "1.0.0",
      })
    );
    writeFileSync(
      getMetaPath(),
      JSON.stringify({
        version: "1.0.0",
        etag: null,
        fetchedAt: new Date().toISOString(),
        promptCount: 1,
      })
    );
    writeFileSync(
      getOfflineLibraryPath(),
      JSON.stringify([
        {
          id: cachedPrompt.id,
          title: "Offline Override",
          description: "Offline description",
          content: "Offline content",
          category: "workflow",
          tags: ["offline-tag"],
          saved_at: new Date().toISOString(),
        },
      ])
    );

    const result = await loadRegistry();
    const prompt = result.prompts.find((entry) => entry.id === cachedPrompt.id);

    expect(prompt?.title).toBe(cachedPrompt.title);
    expect(prompt?.description).toBe("Registry description");
    expect(prompt?.author).toBe("Registry Author");
    expect(prompt?.tags).toEqual(["registry-tag"]);
    expect(prompt?.featured).toBe(true);
  });

  it("honors an explicit env override when loading offline prompts", async () => {
    const explicitHome = join(testDir, "explicit-home");
    const explicitEnv = {
      ...process.env,
      HOME: explicitHome,
      JFP_HOME: explicitHome,
    } as NodeJS.ProcessEnv;
    const explicitConfigDir = getConfigDir(explicitEnv);

    mkdirSync(join(explicitConfigDir, "library"), { recursive: true });
    writeFileSync(
      join(explicitConfigDir, "library", "prompts.json"),
      JSON.stringify([
        {
          id: "env-only-offline-prompt",
          title: "Env Only Offline Prompt",
          description: "Only available through the explicit env home",
          content: "Offline body",
          category: "workflow",
          tags: ["env"],
          saved_at: new Date().toISOString(),
        },
      ])
    );

    globalThis.fetch = (async () => {
      throw new Error("Network error");
    }) as typeof fetch;

    const result = await loadRegistry(explicitEnv);

    expect(
      result.prompts.some((prompt) => prompt.id === "env-only-offline-prompt")
    ).toBe(true);
  });
});
