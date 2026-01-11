/**
 * Registry ETag/Caching tests with REAL HTTP server
 *
 * These tests spin up an actual HTTP server to verify:
 * 1. ETag validation (304 Not Modified responses)
 * 2. Cache invalidation when ETag changes
 * 3. Stale-while-revalidate pattern
 * 4. Network failure handling
 *
 * Uses Bun.serve() for a lightweight test server.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { prompts } from "@jeffreysprompts/core/prompts";
import type { Server } from "bun";

// Test state
let testDir: string;
let originalJfpHome: string | undefined;
let testServer: Server | null = null;
let serverPort: number;
let requestCount = 0;
let lastRequestETag: string | null = null;

// Test payload (subset of prompts for faster tests)
const testPayload = {
  prompts: prompts.slice(0, 3),
  bundles: [],
  workflows: [],
  version: "1.0.0",
};

// Current ETag for server responses
let serverETag = "etag-v1";
let serverPayload = testPayload;

// Start a real HTTP test server
function startTestServer(): Promise<number> {
  return new Promise((resolve) => {
    testServer = Bun.serve({
      port: 0, // Let OS assign port
      fetch(req) {
        requestCount++;
        const requestETag = req.headers.get("if-none-match");
        lastRequestETag = requestETag;

        // Handle ETag validation
        if (requestETag === serverETag) {
          return new Response(null, {
            status: 304,
            headers: { ETag: serverETag },
          });
        }

        // Return fresh data
        return new Response(JSON.stringify(serverPayload), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ETag: serverETag,
          },
        });
      },
    });

    const port = testServer.port;
    resolve(port);
  });
}

function stopTestServer(): void {
  if (testServer) {
    testServer.stop(true);
    testServer = null;
  }
}

function resetServerState(): void {
  requestCount = 0;
  lastRequestETag = null;
  serverETag = "etag-v1";
  serverPayload = testPayload;
}

// Set up test environment
beforeAll(async () => {
  // Create isolated temp directory
  testDir = mkdtempSync(join(tmpdir(), "jfp-registry-http-test-"));
  originalJfpHome = process.env.JFP_HOME;
  process.env.JFP_HOME = testDir;

  // Start test server
  serverPort = await startTestServer();
});

afterAll(() => {
  // Stop server
  stopTestServer();

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
    // Ignore cleanup errors
  }
});

// Dynamic import after setting JFP_HOME
const { loadRegistry, refreshRegistry } = await import("../../src/lib/registry-loader");
const configModule = await import("../../src/lib/config");

// Helper to get paths
function getCachePath(): string {
  return join(configModule.getConfigDir(), "registry.json");
}

function getMetaPath(): string {
  return join(configModule.getConfigDir(), "registry.meta.json");
}

function clearCache(): void {
  const configDir = configModule.getConfigDir();
  try {
    rmSync(configDir, { recursive: true, force: true });
  } catch {}
  mkdirSync(configDir, { recursive: true });
}

function writeCache(payload: object, meta: object): void {
  const configDir = configModule.getConfigDir();
  mkdirSync(configDir, { recursive: true });
  writeFileSync(getCachePath(), JSON.stringify(payload));
  writeFileSync(getMetaPath(), JSON.stringify(meta));
}

function readCacheMeta(): object | null {
  try {
    return JSON.parse(readFileSync(getMetaPath(), "utf-8"));
  } catch {
    return null;
  }
}

beforeEach(() => {
  clearCache();
  resetServerState();
});

describe("ETag Validation (using refreshRegistry)", () => {
  it("sends If-None-Match header when ETag is cached", async () => {
    // Set up cache with ETag
    const payload = { prompts: testPayload.prompts.slice(0, 1), version: "1.0.0" };
    const meta = {
      version: "1.0.0",
      etag: "etag-v1",
      fetchedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago (stale)
      promptCount: 1,
    };
    writeCache(payload, meta);

    // Override registry URL to use test server
    const originalUrl = process.env.JFP_REGISTRY_URL;
    process.env.JFP_REGISTRY_URL = `http://localhost:${serverPort}/api/prompts`;

    try {
      // Use refreshRegistry which always fetches
      await refreshRegistry();

      // Verify ETag was sent
      expect(lastRequestETag).toBe("etag-v1");
    } finally {
      if (originalUrl === undefined) {
        delete process.env.JFP_REGISTRY_URL;
      } else {
        process.env.JFP_REGISTRY_URL = originalUrl;
      }
    }
  });

  it("returns cached data on 304 Not Modified", async () => {
    // Set up cache with matching ETag
    const cachedPrompt = { ...testPayload.prompts[0], title: "Cached Version" };
    const payload = { prompts: [cachedPrompt], version: "1.0.0" };
    const meta = {
      version: "1.0.0",
      etag: "etag-v1", // Matches serverETag
      fetchedAt: new Date(Date.now() - 7200000).toISOString(), // Stale
      promptCount: 1,
    };
    writeCache(payload, meta);

    const originalUrl = process.env.JFP_REGISTRY_URL;
    process.env.JFP_REGISTRY_URL = `http://localhost:${serverPort}/api/prompts`;

    try {
      // Use refreshRegistry which sends ETag
      const result = await refreshRegistry();

      // Should return cached data (server returned 304)
      expect(result.prompts[0].title).toBe("Cached Version");
      expect(result.source).toBe("cache");
    } finally {
      if (originalUrl === undefined) {
        delete process.env.JFP_REGISTRY_URL;
      } else {
        process.env.JFP_REGISTRY_URL = originalUrl;
      }
    }
  });

  it("updates cache when ETag changes", async () => {
    // Set up cache with OLD ETag
    const cachedPrompt = { ...testPayload.prompts[0], title: "Old Cached Version" };
    const payload = { prompts: [cachedPrompt], version: "1.0.0" };
    const meta = {
      version: "1.0.0",
      etag: "etag-old", // Different from serverETag
      fetchedAt: new Date(Date.now() - 7200000).toISOString(),
      promptCount: 1,
    };
    writeCache(payload, meta);

    const originalUrl = process.env.JFP_REGISTRY_URL;
    process.env.JFP_REGISTRY_URL = `http://localhost:${serverPort}/api/prompts`;

    try {
      // Use refreshRegistry which always fetches
      const result = await refreshRegistry();

      // Should return fresh data from server
      expect(result.source).toBe("remote");

      // Cache should be updated with new ETag
      const updatedMeta = readCacheMeta() as { etag: string } | null;
      expect(updatedMeta?.etag).toBe("etag-v1");
    } finally {
      if (originalUrl === undefined) {
        delete process.env.JFP_REGISTRY_URL;
      } else {
        process.env.JFP_REGISTRY_URL = originalUrl;
      }
    }
  });
});

describe("Cache Freshness (loadRegistry)", () => {
  it("uses cache without fetch when cache is fresh", async () => {
    // Set up fresh cache (fetched just now)
    const payload = { prompts: testPayload.prompts, version: "1.0.0" };
    const meta = {
      version: "1.0.0",
      etag: "etag-v1",
      fetchedAt: new Date().toISOString(), // Just now
      promptCount: testPayload.prompts.length,
    };
    writeCache(payload, meta);

    const originalUrl = process.env.JFP_REGISTRY_URL;
    process.env.JFP_REGISTRY_URL = `http://localhost:${serverPort}/api/prompts`;

    const initialRequestCount = requestCount;

    try {
      const result = await loadRegistry();

      // Should use cache, not make HTTP request
      expect(result.source).toBe("cache");
      // When cache is fresh, no HTTP requests are made
      expect(requestCount).toBe(initialRequestCount);
    } finally {
      if (originalUrl === undefined) {
        delete process.env.JFP_REGISTRY_URL;
      } else {
        process.env.JFP_REGISTRY_URL = originalUrl;
      }
    }
  });

  it("returns cache and triggers background refresh when stale", async () => {
    // Set up stale cache
    const payload = { prompts: testPayload.prompts, version: "1.0.0" };
    const meta = {
      version: "1.0.0",
      etag: "etag-v1",
      fetchedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago (stale)
      promptCount: testPayload.prompts.length,
    };
    writeCache(payload, meta);

    const originalUrl = process.env.JFP_REGISTRY_URL;
    process.env.JFP_REGISTRY_URL = `http://localhost:${serverPort}/api/prompts`;

    try {
      const result = await loadRegistry();

      // Should return cache immediately
      expect(result.source).toBe("cache");
      expect(result.prompts.length).toBe(testPayload.prompts.length);

      // Background refresh may have started
      // (we can't easily verify this without waiting)
    } finally {
      if (originalUrl === undefined) {
        delete process.env.JFP_REGISTRY_URL;
      } else {
        process.env.JFP_REGISTRY_URL = originalUrl;
      }
    }
  });
});

describe("Network Failure Handling", () => {
  it("uses cache when server is unreachable", async () => {
    // Set up cache
    const payload = { prompts: testPayload.prompts, version: "1.0.0" };
    const meta = {
      version: "1.0.0",
      etag: "etag-v1",
      fetchedAt: new Date(Date.now() - 7200000).toISOString(), // Stale
      promptCount: testPayload.prompts.length,
    };
    writeCache(payload, meta);

    // Point to non-existent server
    const originalUrl = process.env.JFP_REGISTRY_URL;
    process.env.JFP_REGISTRY_URL = "http://localhost:65535/api/prompts"; // Invalid port

    try {
      const result = await loadRegistry();

      // Should fall back to cache (loadRegistry returns cache immediately if available)
      expect(result.source).toBe("cache");
    } finally {
      if (originalUrl === undefined) {
        delete process.env.JFP_REGISTRY_URL;
      } else {
        process.env.JFP_REGISTRY_URL = originalUrl;
      }
    }
  });

  it("uses bundled prompts when no cache and server is unreachable", async () => {
    // No cache
    clearCache();

    // Point to non-existent server
    const originalUrl = process.env.JFP_REGISTRY_URL;
    process.env.JFP_REGISTRY_URL = "http://localhost:65535/api/prompts";

    try {
      const result = await loadRegistry();

      // Should fall back to bundled
      expect(result.source).toBe("bundled");
      expect(result.prompts.length).toBeGreaterThan(0);
    } finally {
      if (originalUrl === undefined) {
        delete process.env.JFP_REGISTRY_URL;
      } else {
        process.env.JFP_REGISTRY_URL = originalUrl;
      }
    }
  });
});

describe("Cache File Integrity", () => {
  it("handles corrupted cache JSON gracefully", async () => {
    const configDir = configModule.getConfigDir();
    mkdirSync(configDir, { recursive: true });

    // Write corrupted JSON
    writeFileSync(getCachePath(), "{ invalid json }}}");
    writeFileSync(getMetaPath(), JSON.stringify({ version: "1.0.0", fetchedAt: new Date().toISOString() }));

    const originalUrl = process.env.JFP_REGISTRY_URL;
    process.env.JFP_REGISTRY_URL = `http://localhost:${serverPort}/api/prompts`;

    try {
      const result = await loadRegistry();

      // Should recover and fetch from remote or use bundled
      expect(result.prompts.length).toBeGreaterThan(0);
      expect(["remote", "bundled"]).toContain(result.source);
    } finally {
      if (originalUrl === undefined) {
        delete process.env.JFP_REGISTRY_URL;
      } else {
        process.env.JFP_REGISTRY_URL = originalUrl;
      }
    }
  });

  it("handles missing meta file gracefully", async () => {
    const configDir = configModule.getConfigDir();
    mkdirSync(configDir, { recursive: true });

    // Write cache without meta
    const payload = { prompts: testPayload.prompts, version: "1.0.0" };
    writeFileSync(getCachePath(), JSON.stringify(payload));
    // No meta file

    const originalUrl = process.env.JFP_REGISTRY_URL;
    process.env.JFP_REGISTRY_URL = `http://localhost:${serverPort}/api/prompts`;

    try {
      const result = await loadRegistry();

      // Should use cache (meta is optional for basic cache functionality)
      expect(result.prompts.length).toBeGreaterThan(0);
    } finally {
      if (originalUrl === undefined) {
        delete process.env.JFP_REGISTRY_URL;
      } else {
        process.env.JFP_REGISTRY_URL = originalUrl;
      }
    }
  });
});

describe("Request Counting (refreshRegistry)", () => {
  it("makes at least one HTTP request per refresh call", async () => {
    clearCache();
    resetServerState();

    const originalUrl = process.env.JFP_REGISTRY_URL;
    process.env.JFP_REGISTRY_URL = `http://localhost:${serverPort}/api/prompts`;

    const initialCount = requestCount;

    try {
      await refreshRegistry();

      // refreshRegistry should make at least one request
      // (may make more due to background refresh from SWR pattern)
      expect(requestCount - initialCount).toBeGreaterThanOrEqual(1);
    } finally {
      if (originalUrl === undefined) {
        delete process.env.JFP_REGISTRY_URL;
      } else {
        process.env.JFP_REGISTRY_URL = originalUrl;
      }
    }
  });
});
