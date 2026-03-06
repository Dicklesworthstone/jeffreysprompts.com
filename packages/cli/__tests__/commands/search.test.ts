import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { searchCommand } from "../../src/commands/search";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync, rmSync } from "fs";

// Mock console.log to capture output
let output: string[] = [];
const originalLog = console.log;
const originalFetch = globalThis.fetch;
let originalEnv: NodeJS.ProcessEnv;
let testHome: string;

beforeEach(() => {
  output = [];
  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };

  // Isolate environment
  originalEnv = { ...process.env };
  testHome = join(tmpdir(), `jfp-search-test-${Date.now()}-${Math.random()}`);
  mkdirSync(testHome, { recursive: true });
  process.env.HOME = testHome;
  delete process.env.JFP_TOKEN;
  delete process.env.XDG_CONFIG_HOME;
});

afterEach(() => {
  console.log = originalLog;
  globalThis.fetch = originalFetch;
  process.env = originalEnv;
  try {
    rmSync(testHome, { recursive: true, force: true });
  } catch {}
});

describe("searchCommand", () => {
  describe("human-readable output", () => {
    it("should find matching prompts", async () => {
      await searchCommand("idea", {});
      const text = output.join("\n");
      expect(text).toContain("idea-wizard");
    });

    it("should show match scores", async () => {
      await searchCommand("documentation", {});
      const text = output.join("\n");
      expect(text.toLowerCase()).toContain("score");
    });

    it("should handle no results gracefully", async () => {
      await searchCommand("xyznonexistent123", {});
      const text = output.join("\n");
      // Should contain no prompts found or empty results
      const isEmpty = text.includes('"results": []') || text.toLowerCase().includes("no prompts found");
      expect(isEmpty).toBe(true);
    });
  });

  describe("JSON output", () => {
    it("should output valid JSON with results array", async () => {
      await searchCommand("idea", { json: true });
      const json = JSON.parse(output.join(""));
      expect(json).toHaveProperty("results");
      expect(Array.isArray(json.results)).toBe(true);
    });

    it("should include result fields", async () => {
      await searchCommand("wizard", { json: true });
      const json = JSON.parse(output.join(""));

      expect(json.results.length).toBeGreaterThan(0);
      const result = json.results[0];

      // Result schema (flat structure)
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("source");
    });

    it("should include prompt details in results", async () => {
      await searchCommand("wizard", { json: true });
      const json = JSON.parse(output.join(""));
      const result = json.results[0];

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("category");
    });

    it("should return empty results array for no matches", async () => {
      await searchCommand("xyznonexistent123", { json: true });
      const json = JSON.parse(output.join(""));
      expect(json.results).toEqual([]);
    });
  });

  describe("search quality", () => {
    it("should rank title matches highly", async () => {
      await searchCommand("wizard", { json: true });
      const json = JSON.parse(output.join(""));

      // idea-wizard should be first since "wizard" is in title
      expect(json.results[0].id).toBe("idea-wizard");
    });

    it("should find prompts by description keywords", async () => {
      await searchCommand("improvement", { json: true });
      const json = JSON.parse(output.join(""));

      expect(json.results.length).toBeGreaterThan(0);
      expect(json.results.some((r: { id: string }) => r.id === "idea-wizard")).toBe(true);
    });

    it("should find prompts by tag", async () => {
      await searchCommand("ultrathink", { json: true });
      const json = JSON.parse(output.join(""));

      expect(json.results.length).toBeGreaterThan(0);
      // All results should have ultrathink tag or related content
    });
  });

  describe("JSON schema stability (golden test)", () => {
    it("should maintain stable SearchResult schema for agents", async () => {
      await searchCommand("idea", { json: true });
      const json = JSON.parse(output.join(""));
      expect(json).toHaveProperty("results");
      expect(json).toHaveProperty("query");
      expect(json).toHaveProperty("authenticated");

      const result = json.results[0];

      // These fields MUST exist - breaking changes break agent integrations
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("title");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("source");

      // score must be a number
      expect(typeof result.score).toBe("number");

      // source must indicate where result came from
      expect(["local", "mine", "saved", "collection"]).toContain(result.source);
    });
  });

  describe("authentication flags", () => {
    const originalExit = process.exit;

    afterEach(() => {
      process.exit = originalExit;
    });

    it("requires login for --mine", async () => {
      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error("EXIT_" + code);
      }) as never;

      try {
        await searchCommand("test", { json: true, mine: true });
      } catch {
        // Expected
      }

      const parsed = JSON.parse(output.join(""));
      expect(parsed.error).toBe(true);
      expect(parsed.code).toBe("not_authenticated");
      expect(exitCode).toBe(1);
    });

    it("requires login for --saved", async () => {
      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error("EXIT_" + code);
      }) as never;

      try {
        await searchCommand("test", { json: true, saved: true });
      } catch {
        // Expected
      }

      const parsed = JSON.parse(output.join(""));
      expect(parsed.error).toBe(true);
      expect(parsed.code).toBe("not_authenticated");
      expect(exitCode).toBe(1);
    });

    it("--local works without authentication", async () => {
      await searchCommand("idea", { json: true, local: true });
      const json = JSON.parse(output.join(""));
      expect(json.results.length).toBeGreaterThan(0);
      expect(json.authenticated).toBe(false);
    });

    it("allows explicit personal search when authenticated via JFP_TOKEN", async () => {
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
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        }

        if (url.includes("/cli/search/mine")) {
          return new Response(
            JSON.stringify({
              results: [
                {
                  id: "personal-only",
                  title: "Personal Prompt",
                  description: "Saved in premium library",
                  category: "workflow",
                  tags: ["premium"],
                  source: "mine",
                  score: 9.5,
                },
              ],
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
        }

        return new Response("Not found", { status: 404 });
      };

      await searchCommand("personal", { json: true, mine: true });
      const json = JSON.parse(output.join(""));

      expect(json.authenticated).toBe(true);
      expect(json.results).toHaveLength(1);
      expect(json.results[0].id).toBe("personal-only");
      expect(json.results[0].source).toBe("mine");
    });
  });

  describe("limit option", () => {
    const originalExit = process.exit;

    afterEach(() => {
      process.exit = originalExit;
    });

    it("should respect --limit option", async () => {
      await searchCommand("prompt", { json: true, limit: "3" });
      const json = JSON.parse(output.join(""));
      expect(json.results.length).toBeLessThanOrEqual(3);
    });

    it("should reject invalid limit values", async () => {
      let exitCode: number | undefined;
      process.exit = ((code?: number) => {
        exitCode = code;
        throw new Error("EXIT_" + code);
      }) as never;

      try {
        await searchCommand("prompt", { json: true, limit: "-5" });
      } catch {
        // Expected
      }

      const parsed = JSON.parse(output.join(""));
      expect(parsed.error).toBe(true);
      expect(parsed.code).toBe("invalid_limit");
      expect(exitCode).toBe(1);
    });

    it("should accept numeric limit", async () => {
      await searchCommand("idea", { json: true, limit: 2 });
      const json = JSON.parse(output.join(""));
      expect(json.results.length).toBeLessThanOrEqual(2);
    });
  });
});
