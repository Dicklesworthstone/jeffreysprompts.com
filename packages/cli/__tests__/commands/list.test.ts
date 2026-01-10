import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { listCommand } from "../../src/commands/list";

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

describe("listCommand", () => {
  describe("human-readable output", () => {
    it("should output all prompts", () => {
      listCommand({});
      const text = output.join("\n");
      expect(text).toContain("idea-wizard");
      expect(text).toContain("readme-reviser");
      expect(text).toContain("robot-mode-maker");
    });

    it("should filter by category", () => {
      listCommand({ category: "ideation" });
      const text = output.join("\n");
      expect(text).toContain("idea-wizard");
      expect(text).not.toContain("readme-reviser");
    });

    it("should filter by tag", () => {
      listCommand({ tag: "documentation" });
      const text = output.join("\n");
      expect(text).toContain("readme-reviser");
      expect(text).not.toContain("idea-wizard");
    });
  });

  describe("JSON output", () => {
    it("should output valid JSON array", () => {
      listCommand({ json: true });
      const json = JSON.parse(output.join(""));
      expect(Array.isArray(json)).toBe(true);
    });

    it("should include required fields in JSON", () => {
      listCommand({ json: true });
      const json = JSON.parse(output.join(""));

      for (const prompt of json) {
        expect(prompt).toHaveProperty("id");
        expect(prompt).toHaveProperty("title");
        expect(prompt).toHaveProperty("description");
        expect(prompt).toHaveProperty("category");
        expect(prompt).toHaveProperty("tags");
        expect(Array.isArray(prompt.tags)).toBe(true);
      }
    });

    it("should respect category filter in JSON output", () => {
      listCommand({ json: true, category: "documentation" });
      const json = JSON.parse(output.join(""));

      for (const prompt of json) {
        expect(prompt.category).toBe("documentation");
      }
    });

    it("should respect tag filter in JSON output", () => {
      listCommand({ json: true, tag: "ultrathink" });
      const json = JSON.parse(output.join(""));

      for (const prompt of json) {
        expect(prompt.tags).toContain("ultrathink");
      }
    });
  });

  describe("JSON schema stability (golden test)", () => {
    it("should maintain stable JSON schema for agents", () => {
      listCommand({ json: true });
      const json = JSON.parse(output.join(""));
      const firstPrompt = json[0];

      // These fields MUST exist - breaking changes break agent integrations
      const requiredFields = [
        "id",
        "title",
        "description",
        "category",
        "tags",
        "version",
      ];

      for (const field of requiredFields) {
        expect(firstPrompt).toHaveProperty(field);
      }

      // id must be a string
      expect(typeof firstPrompt.id).toBe("string");

      // tags must be array of strings
      expect(Array.isArray(firstPrompt.tags)).toBe(true);
      if (firstPrompt.tags.length > 0) {
        expect(typeof firstPrompt.tags[0]).toBe("string");
      }
    });
  });
});
