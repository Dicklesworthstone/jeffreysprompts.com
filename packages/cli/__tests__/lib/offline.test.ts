/**
 * Offline Mode Module Tests
 *
 * Tests for offline cache behavior:
 * - Library path resolution
 * - Cache file existence checks
 * - Synced prompts read/write
 * - Sync metadata handling
 * - Offline search functionality
 * - Sync age formatting
 * - Network detection (mocked)
 */
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  getLibraryDir,
  getLibraryPath,
  getMetaPath,
  getPackCachePath,
  getPacksDir,
  getPacksManifestPath,
  hasOfflineLibrary,
  cachePremiumPack,
  doesPackCachePayloadExist,
  isPackCacheHealthy,
  readCachedPackPrompts,
  readPacksManifest,
  readSyncMeta,
  readOfflineLibrary,
  getOfflinePromptById,
  searchOfflineLibrary,
  formatSyncAge,
  normalizePromptCategory,
  uncachePremiumPack,
  type SyncedPrompt,
} from "../../src/lib/offline";

// Test directory setup
let TEST_DIR: string;
let FAKE_HOME: string;

// Store original env vars
const originalJfpHome = process.env.JFP_HOME;

// Sample test data
const samplePrompts: SyncedPrompt[] = [
  {
    id: "idea-wizard",
    title: "The Idea Wizard",
    content: "Generate 30 creative ideas for improving this project...",
    description: "Brainstorm and evaluate ideas systematically",
    category: "ideation",
    tags: ["brainstorming", "improvement", "evaluation"],
    saved_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "code-reviewer",
    title: "Code Review Expert",
    content: "Review this code for best practices, security issues...",
    description: "Comprehensive code review assistant",
    category: "refactoring",
    tags: ["code-review", "security", "best-practices"],
    saved_at: "2024-01-15T11:00:00Z",
  },
  {
    id: "doc-writer",
    title: "Documentation Writer",
    content: "Write clear documentation for this module...",
    description: "Generate comprehensive documentation",
    category: "documentation",
    tags: ["docs", "readme", "api"],
    saved_at: "2024-01-15T12:00:00Z",
  },
];

const sampleMeta = {
  lastSync: "2024-01-15T12:30:00Z",
  promptCount: 3,
  version: "1.0.0",
};

beforeEach(() => {
  // Create unique test directory for each test
  TEST_DIR = join(tmpdir(), "jfp-offline-test-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  FAKE_HOME = join(TEST_DIR, "home");

  // Create fresh test directories
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(FAKE_HOME, { recursive: true });

  // Set JFP_HOME for testing
  process.env.JFP_HOME = FAKE_HOME;
});

afterEach(() => {
  // Restore env vars
  if (originalJfpHome) {
    process.env.JFP_HOME = originalJfpHome;
  } else {
    delete process.env.JFP_HOME;
  }

  // Cleanup test directory
  rmSync(TEST_DIR, { recursive: true, force: true });
});

/**
 * Helper to create the library directory and populate with test data
 */
const setupLibrary = (prompts: SyncedPrompt[] = samplePrompts, meta = sampleMeta): void => {
  const libraryDir = getLibraryDir();
  mkdirSync(libraryDir, { recursive: true });
  writeFileSync(getLibraryPath(), JSON.stringify(prompts));
  writeFileSync(getMetaPath(), JSON.stringify(meta));
};

describe("path resolution", () => {
  it("getLibraryDir returns correct path based on JFP_HOME", () => {
    const dir = getLibraryDir();
    expect(dir).toBe(join(FAKE_HOME, ".config", "jfp", "library"));
  });

  it("getLibraryPath returns prompts.json path", () => {
    const path = getLibraryPath();
    expect(path).toContain("library");
    expect(path).toContain("prompts.json");
  });

  it("getMetaPath returns sync.meta.json path", () => {
    const path = getMetaPath();
    expect(path).toContain("library");
    expect(path).toContain("sync.meta.json");
  });
});

describe("hasOfflineLibrary", () => {
  it("returns false when library does not exist", () => {
    expect(hasOfflineLibrary()).toBe(false);
  });

  it("returns true when library exists", () => {
    setupLibrary();
    expect(hasOfflineLibrary()).toBe(true);
  });

  it("returns true even with empty prompts array", () => {
    setupLibrary([]);
    expect(hasOfflineLibrary()).toBe(true);
  });
});

describe("readSyncMeta", () => {
  it("returns null when meta file does not exist", () => {
    expect(readSyncMeta()).toBeNull();
  });

  it("returns metadata when file exists", () => {
    setupLibrary();
    const meta = readSyncMeta();

    expect(meta).not.toBeNull();
    expect(meta?.lastSync).toBe("2024-01-15T12:30:00Z");
    expect(meta?.promptCount).toBe(3);
    expect(meta?.version).toBe("1.0.0");
  });

  it("returns null for corrupt JSON", () => {
    const libraryDir = getLibraryDir();
    mkdirSync(libraryDir, { recursive: true });
    writeFileSync(getMetaPath(), "not valid json {{{");

    expect(readSyncMeta()).toBeNull();
  });
});

describe("readOfflineLibrary", () => {
  it("returns empty array when library does not exist", () => {
    const prompts = readOfflineLibrary();
    expect(prompts).toEqual([]);
  });

  it("returns prompts when library exists", () => {
    setupLibrary();
    const prompts = readOfflineLibrary();

    expect(prompts).toHaveLength(3);
    expect(prompts[0].id).toBe("idea-wizard");
    expect(prompts[1].id).toBe("code-reviewer");
    expect(prompts[2].id).toBe("doc-writer");
  });

  it("returns empty array for corrupt JSON", () => {
    const libraryDir = getLibraryDir();
    mkdirSync(libraryDir, { recursive: true });
    writeFileSync(getLibraryPath(), "not valid json {{{");

    const prompts = readOfflineLibrary();
    expect(prompts).toEqual([]);
  });

  it("preserves all prompt fields", () => {
    setupLibrary();
    const prompts = readOfflineLibrary();
    const first = prompts[0];

    expect(first.id).toBe("idea-wizard");
    expect(first.title).toBe("The Idea Wizard");
    expect(first.content).toContain("Generate 30 creative ideas");
    expect(first.description).toBeTruthy();
    expect(first.category).toBe("ideation");
    expect(first.tags).toContain("brainstorming");
    expect(first.saved_at).toBe("2024-01-15T10:00:00Z");
  });
});

describe("getOfflinePromptById", () => {
  it("returns null when library does not exist", () => {
    expect(getOfflinePromptById("idea-wizard")).toBeNull();
  });

  it("returns null for non-existent prompt ID", () => {
    setupLibrary();
    expect(getOfflinePromptById("non-existent")).toBeNull();
  });

  it("returns prompt by ID", () => {
    setupLibrary();
    const prompt = getOfflinePromptById("code-reviewer");

    expect(prompt).not.toBeNull();
    expect(prompt?.title).toBe("Code Review Expert");
    expect(prompt?.category).toBe("refactoring");
  });
});

describe("searchOfflineLibrary", () => {
  beforeEach(() => {
    setupLibrary();
  });

  it("returns empty array when library does not exist", () => {
    rmSync(getLibraryPath());
    const results = searchOfflineLibrary("test");
    expect(results).toEqual([]);
  });

  it("finds prompts by title", () => {
    const results = searchOfflineLibrary("wizard");
    expect(results).toHaveLength(1);
    expect(results[0].prompt.id).toBe("idea-wizard");
  });

  it("finds prompts by ID", () => {
    const results = searchOfflineLibrary("code-reviewer");
    expect(results).toHaveLength(1);
    expect(results[0].prompt.id).toBe("code-reviewer");
  });

  it("finds prompts by description", () => {
    const results = searchOfflineLibrary("comprehensive");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.prompt.id === "code-reviewer" || r.prompt.id === "doc-writer")).toBe(true);
  });

  it("finds prompts by category", () => {
    const results = searchOfflineLibrary("ideation");
    expect(results).toHaveLength(1);
    expect(results[0].prompt.id).toBe("idea-wizard");
  });

  it("finds prompts by tag", () => {
    const results = searchOfflineLibrary("security");
    expect(results).toHaveLength(1);
    expect(results[0].prompt.id).toBe("code-reviewer");
  });

  it("finds prompts by content", () => {
    const results = searchOfflineLibrary("documentation for this module");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.prompt.id === "doc-writer")).toBe(true);
  });

  it("is case insensitive", () => {
    const results = searchOfflineLibrary("WIZARD");
    expect(results).toHaveLength(1);
    expect(results[0].prompt.id).toBe("idea-wizard");
  });

  it("respects limit parameter", () => {
    const allResults = searchOfflineLibrary("e", 10); // Matches all
    const limitedResults = searchOfflineLibrary("e", 2);

    expect(allResults.length).toBeGreaterThanOrEqual(limitedResults.length);
    expect(limitedResults.length).toBeLessThanOrEqual(2);
  });

  it("sorts results by relevance (title matches rank higher)", () => {
    const results = searchOfflineLibrary("review");

    // "Code Review Expert" should rank higher because "review" is in the title
    if (results.length > 1) {
      expect(results[0].prompt.id).toBe("code-reviewer");
    }
  });

  it("returns empty array for no matches", () => {
    const results = searchOfflineLibrary("xyznonexistent123");
    expect(results).toEqual([]);
  });
});

describe("formatSyncAge", () => {
  it('returns "never" for null/undefined', () => {
    expect(formatSyncAge(null)).toBe("never");
    expect(formatSyncAge(undefined)).toBe("never");
  });

  it('returns "unknown" for invalid date strings', () => {
    expect(formatSyncAge("not-a-date")).toBe("unknown");
  });

  it('returns "never" for empty string (treated as falsy)', () => {
    expect(formatSyncAge("")).toBe("never");
  });

  it('returns "just now" for recent sync', () => {
    const now = new Date().toISOString();
    expect(formatSyncAge(now)).toBe("just now");
  });

  it("returns minutes ago for recent sync", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatSyncAge(fiveMinAgo)).toBe("5 min ago");
  });

  it("returns hours ago for older sync", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatSyncAge(twoHoursAgo)).toBe("2 hours ago");
  });

  it("returns days ago for old sync", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatSyncAge(threeDaysAgo)).toBe("3 days ago");
  });
});

describe("normalizePromptCategory", () => {
  it("returns valid categories unchanged", () => {
    expect(normalizePromptCategory("ideation")).toBe("ideation");
    expect(normalizePromptCategory("documentation")).toBe("documentation");
    expect(normalizePromptCategory("testing")).toBe("testing");
    expect(normalizePromptCategory("debugging")).toBe("debugging");
    expect(normalizePromptCategory("refactoring")).toBe("refactoring");
    expect(normalizePromptCategory("automation")).toBe("automation");
    expect(normalizePromptCategory("workflow")).toBe("workflow");
    expect(normalizePromptCategory("communication")).toBe("communication");
  });

  it("normalizes uppercase to lowercase", () => {
    expect(normalizePromptCategory("IDEATION")).toBe("ideation");
    expect(normalizePromptCategory("Documentation")).toBe("documentation");
  });

  it('returns "workflow" for invalid categories', () => {
    expect(normalizePromptCategory("invalid")).toBe("workflow");
    expect(normalizePromptCategory("unknown")).toBe("workflow");
  });

  it('returns "workflow" for undefined/null', () => {
    expect(normalizePromptCategory(undefined)).toBe("workflow");
  });
});

describe("cache integrity", () => {
  it("handles large prompt libraries", () => {
    // Create 100 prompts
    const largeLibrary: SyncedPrompt[] = Array.from({ length: 100 }, (_, i) => ({
      id: `prompt-${i}`,
      title: `Test Prompt ${i}`,
      content: `Content for prompt ${i} with some searchable text`,
      description: `Description ${i}`,
      category: "workflow",
      tags: [`tag${i}`, "test"],
      saved_at: new Date().toISOString(),
    }));

    setupLibrary(largeLibrary, { ...sampleMeta, promptCount: 100 });

    const prompts = readOfflineLibrary();
    expect(prompts).toHaveLength(100);

    // Search should still work efficiently
    const results = searchOfflineLibrary("prompt-50");
    expect(results.some(r => r.prompt.id === "prompt-50")).toBe(true);
  });

  it("handles prompts with missing optional fields", () => {
    const minimalPrompt: SyncedPrompt = {
      id: "minimal",
      title: "Minimal Prompt",
      content: "Just content",
      saved_at: new Date().toISOString(),
    };

    setupLibrary([minimalPrompt]);

    const prompts = readOfflineLibrary();
    expect(prompts).toHaveLength(1);
    expect(prompts[0].id).toBe("minimal");
    expect(prompts[0].description).toBeUndefined();
    expect(prompts[0].tags).toBeUndefined();

    // Search should still work
    const results = searchOfflineLibrary("minimal");
    expect(results).toHaveLength(1);
  });

  it("handles prompts with special characters in content", () => {
    const specialPrompt: SyncedPrompt = {
      id: "special",
      title: "Special Characters Test",
      content: "Test with special chars: {{variable}} <tag> & \"quotes\" 'apostrophe' \n\t newlines",
      saved_at: new Date().toISOString(),
    };

    setupLibrary([specialPrompt]);

    const prompts = readOfflineLibrary();
    expect(prompts[0].content).toContain("{{variable}}");
    expect(prompts[0].content).toContain("<tag>");
  });
});

describe("premium packs cache (bd-kfuj)", () => {
  it("resolves pack cache paths under the library directory", () => {
    expect(getPacksDir()).toBe(join(FAKE_HOME, ".config", "jfp", "library", "packs"));
    expect(getPacksManifestPath()).toBe(join(FAKE_HOME, ".config", "jfp", "library", "packs", "manifest.json"));
    expect(getPackCachePath("starter-pack")).toBe(
      join(FAKE_HOME, ".config", "jfp", "library", "packs", "starter-pack.json")
    );
  });

  it("writes manifest + pack payload and loads cached prompts", () => {
    const pack = {
      id: "starter-pack",
      title: "Starter Pack",
      version: "1.2.3",
      promptCount: 1,
      installedAt: "2026-02-06T00:00:00Z",
      publishedAt: "2026-01-01T00:00:00Z",
      prompts: [
        {
          id: "premium-idea",
          title: "Premium Idea Wizard",
          description: "Premium twist on idea generation",
          content: "Generate 50 ideas with ruthless evaluation.",
          category: "automation",
          tags: ["premium", "ideation"],
          author: "Jeffrey Emanuel",
          version: "2.0.0",
          created: "2026-01-01",
        },
      ],
    };

    const result = cachePremiumPack(pack);
    expect(result.ok).toBe(true);

    const manifest = readPacksManifest();
    expect(manifest).not.toBeNull();
    const entry = manifest?.entries.find((e) => e.id === "starter-pack");
    expect(entry?.installed).toBe(true);
    expect(entry?.version).toBe("1.2.3");

    expect(existsSync(getPackCachePath("starter-pack"))).toBe(true);
    expect(doesPackCachePayloadExist("starter-pack")).toBe(true);
    expect(isPackCacheHealthy("starter-pack", entry?.hash ?? "")).toBe(true);

    const prompts = readCachedPackPrompts();
    const cached = prompts.find((p) => p.id === "premium-idea");
    expect(cached).toBeTruthy();
    expect(cached?.category).toBe("automation");
    expect(cached?.tags).toContain("premium");
    expect(cached?.content).toContain("Generate 50 ideas");
  });

  it("skips corrupted pack cache when hash mismatches", () => {
    const pack = {
      id: "starter-pack",
      title: "Starter Pack",
      version: "1.0.0",
      promptCount: 1,
      prompts: [{ id: "p1", title: "P1", content: "Hello" }],
    };
    expect(cachePremiumPack(pack).ok).toBe(true);

    // Corrupt the on-disk payload.
    writeFileSync(getPackCachePath("starter-pack"), JSON.stringify({ nope: true }));

    const manifest = readPacksManifest();
    expect(manifest).not.toBeNull();
    const entry = manifest?.entries.find((e) => e.id === "starter-pack");
    expect(entry).toBeTruthy();
    expect(isPackCacheHealthy("starter-pack", entry?.hash ?? "")).toBe(false);

    const prompts = readCachedPackPrompts();
    expect(prompts).toEqual([]);
  });

  it("uncache removes payload file and marks installed=false in manifest", () => {
    const pack = {
      id: "starter-pack",
      title: "Starter Pack",
      version: "1.0.0",
      promptCount: 1,
      prompts: [{ id: "p1", title: "P1", content: "Hello" }],
    };
    expect(cachePremiumPack(pack).ok).toBe(true);

    const uncacheResult = uncachePremiumPack("starter-pack");
    expect(uncacheResult.ok).toBe(true);

    expect(existsSync(getPackCachePath("starter-pack"))).toBe(false);
    expect(doesPackCachePayloadExist("starter-pack")).toBe(false);
    const manifest = readPacksManifest();
    const entry = manifest?.entries.find((e) => e.id === "starter-pack");
    expect(entry?.installed).toBe(false);
    expect(isPackCacheHealthy("starter-pack", entry?.hash ?? "")).toBe(false);
  });
});
