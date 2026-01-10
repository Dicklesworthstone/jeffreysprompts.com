import { describe, it, expect, beforeEach, afterEach, afterAll, mock } from "bun:test";
import { join } from "path";
import { prompts } from "@jeffreysprompts/core/prompts";

const files = new Map<string, string>();
const dirs = new Set<string>();
const normalize = (path: string) => path.replace(/\\/g, "/");

const fsMock = {
  existsSync: (path: string) => {
    const key = normalize(String(path));
    return files.has(key) || dirs.has(key);
  },
  readFileSync: (path: string) => {
    const key = normalize(String(path));
    const value = files.get(key);
    if (value === undefined) {
      throw new Error("ENOENT");
    }
    return value;
  },
  writeFileSync: (path: string, content: string) => {
    const key = normalize(String(path));
    files.set(key, String(content));
    const dir = key.slice(0, Math.max(0, key.lastIndexOf("/")));
    if (dir) dirs.add(dir);
  },
  mkdirSync: (path: string) => {
    const key = normalize(String(path));
    dirs.add(key);
  },
  readdirSync: () => [],
  // Additional exports to prevent leaking mock issues
  unlinkSync: () => {},
  rmSync: () => {},
  statSync: () => ({ size: 0, isFile: () => true, isDirectory: () => false }),
};

mock.module("fs", () => fsMock);
mock.module("node:fs", () => fsMock);

const osMock = {
  homedir: () => "/mock/home",
  default: { homedir: () => "/mock/home" },
};

mock.module("os", () => osMock);
mock.module("node:os", () => osMock);

const { loadRegistry } = await import("../../src/lib/registry-loader");

const cachePath = normalize(join("/mock/home", ".config/jfp/registry.json"));
const metaPath = normalize(join("/mock/home", ".config/jfp/registry.meta.json"));

let originalFetch: typeof fetch | undefined;

beforeEach(() => {
  files.clear();
  dirs.clear();
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

afterAll(() => {
  mock.restore();
});

describe("loadRegistry", () => {
  it("returns cached prompts when cache is fresh", async () => {
    const payload = { prompts: [prompts[0]], version: "1.0.0" };
    const meta = {
      version: "1.0.0",
      etag: null,
      fetchedAt: new Date().toISOString(),
      promptCount: 1,
    };
    files.set(cachePath, JSON.stringify(payload));
    files.set(metaPath, JSON.stringify(meta));

    const result = await loadRegistry();
    expect(result.source).toBe("cache");
    expect(result.prompts[0].id).toBe(prompts[0].id);
  });

  it("fetches remote registry and writes cache when missing", async () => {
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
    expect(files.has(cachePath)).toBe(true);
    expect(files.has(metaPath)).toBe(true);
  });
});
