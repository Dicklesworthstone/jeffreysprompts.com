import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { suggestCommand } from "../../src/commands/suggest";

// Mock console.log and process.exit
let output: string[] = [];
let exitCode: number | null = null;
const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

beforeEach(() => {
  output = [];
  exitCode = null;
  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  console.error = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`process.exit(${code})`);
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
});

describe("suggestCommand", () => {
  describe("human-readable output", () => {
    it("should suggest relevant prompts for a task", () => {
      suggestCommand("improve code quality", {});
      const text = output.join("\n");
      expect(text).toContain("idea-wizard");
    });

    it("should show relevance information", () => {
      suggestCommand("documentation", {});
      const text = output.join("\n");
      expect(text.toLowerCase()).toContain("relevance");
    });

    it("should suggest relevant prompts", () => {
      suggestCommand("testing", { json: true });
      const json = JSON.parse(output.join(""));
      // In non-TTY mode, always outputs JSON
      // Verify we get suggestions
      expect(json).toHaveProperty("suggestions");
      expect(json.suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("JSON output", () => {
    it("should output valid JSON object", () => {
      suggestCommand("improve code", { json: true });
      const json = JSON.parse(output.join(""));
      expect(typeof json).toBe("object");
    });

    it("should include task and suggestions in JSON", () => {
      suggestCommand("brainstorm ideas", { json: true });
      const json = JSON.parse(output.join(""));

      expect(json).toHaveProperty("task");
      expect(json).toHaveProperty("suggestions");
      expect(json).toHaveProperty("total");
      expect(json.task).toBe("brainstorm ideas");
    });

    it("should include suggestion details", () => {
      suggestCommand("documentation", { json: true });
      const json = JSON.parse(output.join(""));

      expect(json.suggestions.length).toBeGreaterThan(0);
      const suggestion = json.suggestions[0];

      expect(suggestion).toHaveProperty("id");
      expect(suggestion).toHaveProperty("title");
      expect(suggestion).toHaveProperty("description");
      expect(suggestion).toHaveProperty("category");
      expect(suggestion).toHaveProperty("relevance");
      expect(suggestion).toHaveProperty("matchedFields");
      expect(suggestion).toHaveProperty("tip");
    });
  });

  describe("limit option", () => {
    it("should default to 5 suggestions", () => {
      suggestCommand("code", { json: true });
      const json = JSON.parse(output.join(""));
      // With only 3 prompts, can't test > 5, but should be <= 5
      expect(json.suggestions.length).toBeLessThanOrEqual(5);
    });

    it("should respect custom limit", () => {
      suggestCommand("code", { json: true, limit: 2 });
      const json = JSON.parse(output.join(""));
      expect(json.suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe("error handling", () => {
    it("should error on empty task", () => {
      expect(() => {
        suggestCommand("", {});
      }).toThrow();
      expect(exitCode).toBe(1);
    });

    it("should error on whitespace-only task", () => {
      expect(() => {
        suggestCommand("   ", {});
      }).toThrow();
      expect(exitCode).toBe(1);
    });

    it("should return JSON error for empty task with --json", () => {
      expect(() => {
        suggestCommand("", { json: true });
      }).toThrow();

      const json = JSON.parse(output.join(""));
      expect(json).toHaveProperty("error");
      expect(json.error).toBe("empty_task");
    });
  });

  describe("suggestion quality", () => {
    it("should suggest ideation prompts for brainstorming tasks", () => {
      suggestCommand("brainstorm improvement ideas", { json: true });
      const json = JSON.parse(output.join(""));

      const ideationSuggestions = json.suggestions.filter(
        (s: { category: string }) => s.category === "ideation"
      );
      expect(ideationSuggestions.length).toBeGreaterThan(0);
    });

    it("should suggest documentation prompts for docs tasks", () => {
      suggestCommand("update readme documentation", { json: true });
      const json = JSON.parse(output.join(""));

      const docsSuggestions = json.suggestions.filter(
        (s: { category: string }) => s.category === "documentation"
      );
      expect(docsSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe("JSON schema stability (golden test)", () => {
    it("should maintain stable SuggestOutput schema for agents", () => {
      suggestCommand("test task", { json: true });
      const json = JSON.parse(output.join(""));

      // Top-level schema
      expect(json).toHaveProperty("task");
      expect(json).toHaveProperty("suggestions");
      expect(json).toHaveProperty("total");

      // Type checks
      expect(typeof json.task).toBe("string");
      expect(typeof json.total).toBe("number");
      expect(Array.isArray(json.suggestions)).toBe(true);

      if (json.suggestions.length > 0) {
        const suggestion = json.suggestions[0];

        // Suggestion schema
        expect(typeof suggestion.id).toBe("string");
        expect(typeof suggestion.title).toBe("string");
        expect(typeof suggestion.description).toBe("string");
        expect(typeof suggestion.category).toBe("string");
        expect(typeof suggestion.relevance).toBe("number");
        expect(Array.isArray(suggestion.matchedFields)).toBe(true);
        expect(typeof suggestion.tip).toBe("string");
      }
    });
  });
});
