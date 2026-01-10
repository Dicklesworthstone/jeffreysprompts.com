import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { searchCommand } from "../../src/commands/search";

// Mock console.log to capture output
let output: string[] = [];
const originalLog = console.log;

beforeEach(() => {
  output = [];
  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
});

afterEach(() => {
  console.log = originalLog;
});

describe("searchCommand", () => {
  describe("human-readable output", () => {
    it("should find matching prompts", () => {
      searchCommand("idea", {});
      const text = output.join("\n");
      expect(text).toContain("idea-wizard");
    });

    it("should show match scores", () => {
      searchCommand("documentation", {});
      const text = output.join("\n");
      expect(text.toLowerCase()).toContain("score");
    });

    it("should handle no results gracefully", () => {
      searchCommand("xyznonexistent123", {});
      const text = output.join("\n");
      // In non-TTY mode, outputs JSON (empty array)
      // In TTY mode, would output "no prompts found"
      const isEmpty = text === "[]" || text.toLowerCase().includes("no prompts found");
      expect(isEmpty).toBe(true);
    });
  });

  describe("JSON output", () => {
    it("should output valid JSON array", () => {
      searchCommand("idea", { json: true });
      const json = JSON.parse(output.join(""));
      expect(Array.isArray(json)).toBe(true);
    });

    it("should include SearchResult fields", () => {
      searchCommand("wizard", { json: true });
      const json = JSON.parse(output.join(""));

      expect(json.length).toBeGreaterThan(0);
      const result = json[0];

      // SearchResult schema
      expect(result).toHaveProperty("prompt");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("matchedFields");
    });

    it("should include prompt details in results", () => {
      searchCommand("wizard", { json: true });
      const json = JSON.parse(output.join(""));
      const result = json[0];

      expect(result.prompt).toHaveProperty("id");
      expect(result.prompt).toHaveProperty("title");
      expect(result.prompt).toHaveProperty("description");
      expect(result.prompt).toHaveProperty("category");
    });

    it("should return empty array for no matches", () => {
      searchCommand("xyznonexistent123", { json: true });
      const json = JSON.parse(output.join(""));
      expect(json).toEqual([]);
    });
  });

  describe("search quality", () => {
    it("should rank title matches highly", () => {
      searchCommand("wizard", { json: true });
      const json = JSON.parse(output.join(""));

      // idea-wizard should be first since "wizard" is in title
      expect(json[0].prompt.id).toBe("idea-wizard");
    });

    it("should find prompts by description keywords", () => {
      searchCommand("improvement", { json: true });
      const json = JSON.parse(output.join(""));

      expect(json.length).toBeGreaterThan(0);
      expect(json.some((r: { prompt: { id: string } }) => r.prompt.id === "idea-wizard")).toBe(true);
    });

    it("should find prompts by tag", () => {
      searchCommand("ultrathink", { json: true });
      const json = JSON.parse(output.join(""));

      expect(json.length).toBeGreaterThan(0);
      // All results should have ultrathink tag or related content
    });
  });

  describe("JSON schema stability (golden test)", () => {
    it("should maintain stable SearchResult schema for agents", () => {
      searchCommand("idea", { json: true });
      const json = JSON.parse(output.join(""));
      const result = json[0];

      // These fields MUST exist - breaking changes break agent integrations
      expect(result).toHaveProperty("prompt");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("matchedFields");

      // score must be a number
      expect(typeof result.score).toBe("number");

      // matchedFields must be array of strings
      expect(Array.isArray(result.matchedFields)).toBe(true);

      // prompt must have required fields
      expect(result.prompt).toHaveProperty("id");
      expect(result.prompt).toHaveProperty("title");
    });
  });
});
