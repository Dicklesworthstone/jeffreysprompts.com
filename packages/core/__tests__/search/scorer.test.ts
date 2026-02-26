import { describe, it, expect } from "bun:test";
import { scorePrompt, scoreAll, FIELD_WEIGHTS } from "../../src/search/scorer";
import type { Prompt } from "../../src/prompts/types";

/** Minimal prompt factory */
function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: overrides.id ?? "test-prompt",
    title: overrides.title ?? "Test Prompt",
    description: overrides.description ?? "A test prompt",
    category: overrides.category ?? "ideation",
    tags: overrides.tags ?? ["testing"],
    author: "test",
    version: "1.0.0",
    created: "2025-01-01",
    content: overrides.content ?? "Some prompt content here.",
  };
}

describe("scorePrompt", () => {
  describe("exact word matching", () => {
    it("returns full field weight for exact title word match", () => {
      const prompt = makePrompt({ title: "Robot Mode Maker" });
      const result = scorePrompt(prompt, "robot");
      expect(result).not.toBeNull();
      expect(result!.score).toBe(FIELD_WEIGHTS.title * 1.0);
      expect(result!.matchedFields).toContain("title");
    });

    it("returns full weight for exact tag match", () => {
      const prompt = makePrompt({ tags: ["brainstorming", "creative"] });
      const result = scorePrompt(prompt, "brainstorming");
      expect(result).not.toBeNull();
      expect(result!.score).toBe(FIELD_WEIGHTS.tags * 1.0);
      expect(result!.matchedFields).toContain("tags");
    });

    it("returns full weight for exact id match", () => {
      const prompt = makePrompt({ id: "idea-wizard" });
      const result = scorePrompt(prompt, "idea");
      expect(result).not.toBeNull();
      // "idea" is an exact token in "idea-wizard" after tokenization
      expect(result!.score).toBe(FIELD_WEIGHTS.id * 1.0);
    });
  });

  describe("prefix matching", () => {
    it("matches prefix of title word (last token)", () => {
      const prompt = makePrompt({ title: "The Robot-Mode Maker" });
      const result = scorePrompt(prompt, "rob");
      expect(result).not.toBeNull();
      // "rob" prefix-matches "robot" in title
      expect(result!.score).toBe(FIELD_WEIGHTS.title * 0.7);
      expect(result!.matchedFields).toContain("title");
    });

    it("matches prefix of id token", () => {
      const prompt = makePrompt({ id: "idea-wizard" });
      const result = scorePrompt(prompt, "ide");
      expect(result).not.toBeNull();
      // "ide" prefix-matches "idea" in id
      expect(result!.score).toBe(FIELD_WEIGHTS.id * 0.7);
    });

    it("short tokens (<=3 chars) are prefix-eligible at any position", () => {
      const prompt = makePrompt({ title: "Robot Mode Maker" });
      // "rob" is <=3 chars so prefix-eligible even as first of two tokens
      const result = scorePrompt(prompt, "rob mode");
      expect(result).not.toBeNull();
      // rob -> prefix title (10*0.7=7), mode -> exact title (10*1.0=10)
      // coverage bonus: (7+10)*1.2 = 20.4
      expect(result!.score).toBeCloseTo(20.4, 1);
    });

    it("longer non-last tokens are NOT prefix-eligible", () => {
      const prompt = makePrompt({ title: "Robot Mode Maker" });
      // "robo" is 4 chars and NOT the last token, so not prefix-eligible
      const result = scorePrompt(prompt, "robo maker");
      expect(result).not.toBeNull();
      // "robo" -> substring match in title raw (10*0.4=4)
      // "maker" -> exact title (10*1.0=10)
      // coverage bonus: (4+10)*1.2 = 16.8
      expect(result!.score).toBeCloseTo(16.8, 1);
    });
  });

  describe("substring matching", () => {
    it("matches substring in description", () => {
      const prompt = makePrompt({
        title: "Some Tool",
        description: "Generates creative ideas for projects",
      });
      const result = scorePrompt(prompt, "creat");
      expect(result).not.toBeNull();
      // "creat" is a substring of "creative" in description raw text
      // It's also prefix of "creative" token and it's the last (only) token
      // prefix: 3*0.7 = 2.1
      expect(result!.score).toBe(FIELD_WEIGHTS.description * 0.7);
    });

    it("matches substring in content", () => {
      const prompt = makePrompt({
        title: "Test",
        content: "Please analyze the codebase thoroughly",
      });
      const result = scorePrompt(prompt, "codebase");
      expect(result).not.toBeNull();
      expect(result!.matchedFields).toContain("content");
    });
  });

  describe("field priority", () => {
    it("title match scores higher than description match", () => {
      const titleMatch = makePrompt({
        title: "Robot Helper",
        description: "Something else",
      });
      const descMatch = makePrompt({
        title: "Something Else",
        description: "Robot helper tool",
      });

      const titleResult = scorePrompt(titleMatch, "robot");
      const descResult = scorePrompt(descMatch, "robot");

      expect(titleResult!.score).toBeGreaterThan(descResult!.score);
    });

    it("id match scores higher than tags match", () => {
      const idMatch = makePrompt({ id: "robot-mode", tags: ["other"] });
      const tagMatch = makePrompt({ id: "other-thing", tags: ["robot"] });

      const idResult = scorePrompt(idMatch, "robot");
      const tagResult = scorePrompt(tagMatch, "robot");

      expect(idResult!.score).toBeGreaterThan(tagResult!.score);
    });
  });

  describe("coverage bonus", () => {
    it("applies 1.2x bonus when all tokens match (multi-word query)", () => {
      const prompt = makePrompt({ title: "Robot Mode Maker" });
      const result = scorePrompt(prompt, "robot maker");
      expect(result).not.toBeNull();
      // robot -> exact title (10), maker -> exact title (10)
      // coverage bonus: (10+10)*1.2 = 24
      expect(result!.score).toBeCloseTo(24, 1);
    });

    it("does NOT apply bonus for single-token queries", () => {
      const prompt = makePrompt({ title: "Robot Mode Maker" });
      const result = scorePrompt(prompt, "robot");
      expect(result).not.toBeNull();
      expect(result!.score).toBe(10); // no 1.2x
    });

    it("does NOT apply bonus when a token has no match", () => {
      const prompt = makePrompt({ title: "Robot Mode Maker" });
      const result = scorePrompt(prompt, "robot xyznonexistent");
      expect(result).not.toBeNull();
      // Only "robot" matches, no coverage bonus
      expect(result!.score).toBe(FIELD_WEIGHTS.title * 1.0);
    });
  });

  describe("edge cases", () => {
    it("returns null for empty query", () => {
      const prompt = makePrompt();
      expect(scorePrompt(prompt, "")).toBeNull();
    });

    it("returns null for stopword-only query", () => {
      const prompt = makePrompt({ title: "The Best Tool" });
      expect(scorePrompt(prompt, "the")).toBeNull();
    });

    it("returns null when no fields match", () => {
      const prompt = makePrompt({ title: "Robot Helper" });
      expect(scorePrompt(prompt, "xyznonexistent")).toBeNull();
    });

    it("handles prompts with empty tags", () => {
      const prompt = makePrompt({ tags: [] });
      const result = scorePrompt(prompt, "test");
      // Should still work, matching other fields
      expect(result).not.toBeNull();
    });
  });
});

describe("scoreAll", () => {
  it("returns results sorted by score descending", () => {
    const prompts = [
      makePrompt({ id: "low-match", title: "Some Tool", description: "Robot helper" }),
      makePrompt({ id: "high-match", title: "Robot Mode Maker", description: "A tool" }),
    ];

    const results = scoreAll(prompts, "robot");
    expect(results.length).toBe(2);
    expect(results[0].id).toBe("high-match");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("filters out prompts with no match", () => {
    const prompts = [
      makePrompt({ id: "match", title: "Robot Mode" }),
      makePrompt({ id: "no-match", title: "Idea Wizard", description: "brainstorming", content: "no overlap" }),
    ];

    const results = scoreAll(prompts, "robot");
    expect(results.length).toBe(1);
    expect(results[0].id).toBe("match");
  });

  it("returns empty array for no matches", () => {
    const prompts = [makePrompt({ title: "Hello World" })];
    const results = scoreAll(prompts, "xyznonexistent");
    expect(results).toEqual([]);
  });
});
