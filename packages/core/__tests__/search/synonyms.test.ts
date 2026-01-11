import { describe, it, expect } from "bun:test";
import { SYNONYMS, expandQuery, getSynonyms } from "../../src/search/synonyms";

describe("SYNONYMS dictionary", () => {
  it("should contain common abbreviations", () => {
    expect(SYNONYMS.fix).toContain("debug");
    expect(SYNONYMS.docs).toContain("documentation");
    expect(SYNONYMS.cli).toContain("terminal");
    expect(SYNONYMS.api).toContain("endpoint");
  });

  it("should contain concept synonyms", () => {
    expect(SYNONYMS.brainstorm).toContain("ideate");
    expect(SYNONYMS.improve).toContain("enhance");
    expect(SYNONYMS.refactor).toContain("restructure");
    expect(SYNONYMS.test).toContain("testing");
    expect(SYNONYMS.debug).toContain("troubleshoot");
  });

  it("should contain action synonyms", () => {
    expect(SYNONYMS.add).toContain("create");
    expect(SYNONYMS.remove).toContain("delete");
    expect(SYNONYMS.update).toContain("modify");
  });

  it("should contain domain terms", () => {
    expect(SYNONYMS.agent).toContain("ai");
    expect(SYNONYMS.prompt).toContain("instruction");
    expect(SYNONYMS.code).toContain("programming");
  });

  it("should have non-empty arrays for all keys", () => {
    for (const [key, synonyms] of Object.entries(SYNONYMS)) {
      expect(synonyms.length).toBeGreaterThan(0);
      expect(synonyms.every((s) => typeof s === "string" && s.length > 0)).toBe(true);
    }
  });
});

describe("getSynonyms", () => {
  it("should return synonyms for known terms", () => {
    const fixSynonyms = getSynonyms("fix");
    expect(fixSynonyms).toContain("debug");
    expect(fixSynonyms).toContain("repair");
    expect(fixSynonyms.length).toBeGreaterThan(0);
  });

  it("should return empty array for unknown terms", () => {
    const unknown = getSynonyms("xyznonexistent");
    expect(unknown).toEqual([]);
  });

  it("should be case-insensitive", () => {
    // The current implementation lowercases input
    const lower = getSynonyms("fix");
    const upper = getSynonyms("FIX");
    // Both should work (FIX lowercased to fix)
    expect(lower).toEqual(upper);
  });

  it("should return exact synonyms from dictionary", () => {
    const docsSynonyms = getSynonyms("docs");
    expect(docsSynonyms).toEqual(SYNONYMS.docs);
  });
});

describe("expandQuery", () => {
  it("should return original tokens when no synonyms exist", () => {
    const result = expandQuery(["xyznonexistent"]);
    expect(result).toContain("xyznonexistent");
    expect(result.length).toBe(1);
  });

  it("should expand single token with its synonyms", () => {
    const result = expandQuery(["fix"]);
    expect(result).toContain("fix");
    expect(result).toContain("debug");
    expect(result).toContain("repair");
    expect(result).toContain("resolve");
  });

  it("should expand multiple tokens", () => {
    const result = expandQuery(["fix", "docs"]);
    // Original tokens
    expect(result).toContain("fix");
    expect(result).toContain("docs");
    // Synonyms of fix
    expect(result).toContain("debug");
    // Synonyms of docs
    expect(result).toContain("documentation");
    expect(result).toContain("readme");
  });

  it("should add reverse mappings (synonym → key)", () => {
    // If "debug" is a synonym of "fix", then searching for "debug" should also get "fix"
    const result = expandQuery(["debug"]);
    expect(result).toContain("debug");
    // debug is a synonym of fix, so fix should be added
    expect(result).toContain("fix");
  });

  it("should deduplicate expanded tokens", () => {
    // "fix" and "debug" are related, so expanding both shouldn't duplicate
    const result = expandQuery(["fix", "debug"]);
    const uniqueCount = new Set(result).size;
    expect(result.length).toBe(uniqueCount);
  });

  it("should handle empty input", () => {
    const result = expandQuery([]);
    expect(result).toEqual([]);
  });

  it("should maintain original tokens in output", () => {
    const input = ["test", "unknown", "cli"];
    const result = expandQuery(input);
    // All original tokens should be present
    for (const token of input) {
      expect(result).toContain(token);
    }
  });

  it("should expand domain terms correctly", () => {
    const result = expandQuery(["agent"]);
    expect(result).toContain("agent");
    expect(result).toContain("bot");
    expect(result).toContain("assistant");
    expect(result).toContain("ai");
  });

  it("should expand action synonyms bidirectionally", () => {
    // "create" is a synonym of "add"
    const createResult = expandQuery(["create"]);
    expect(createResult).toContain("add"); // reverse mapping

    // "delete" is a synonym of "remove"
    const deleteResult = expandQuery(["delete"]);
    expect(deleteResult).toContain("remove"); // reverse mapping
  });
});

describe("query expansion integration", () => {
  it("should meaningfully expand real-world queries", () => {
    // Simulating a user searching for "fix bug"
    const query1 = expandQuery(["fix", "bug"]);
    expect(query1).toContain("debug");
    expect(query1).toContain("repair");
    expect(query1).toContain("resolve");

    // Simulating a user searching for "improve performance"
    const query2 = expandQuery(["improve", "perf"]);
    expect(query2).toContain("enhance");
    expect(query2).toContain("optimize");
    expect(query2).toContain("performance");
    expect(query2).toContain("speed");

    // Simulating a user searching for "write docs"
    const query3 = expandQuery(["write", "docs"]);
    expect(query3).toContain("documentation");
    expect(query3).toContain("readme");
    expect(query3).toContain("guide");
  });

  it("should not over-expand (maintain reasonable size)", () => {
    // Even with multiple tokens that have synonyms, expansion should be bounded
    const result = expandQuery(["fix", "test", "docs", "cli"]);
    // Should not explode to hundreds of terms
    expect(result.length).toBeLessThan(50);
  });

  it("should handle mixed known and unknown terms", () => {
    const result = expandQuery(["fix", "unknown123", "test"]);
    // Known terms get expanded
    expect(result).toContain("debug");
    expect(result).toContain("testing");
    // Unknown term is preserved
    expect(result).toContain("unknown123");
  });
});
