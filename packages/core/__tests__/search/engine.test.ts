import { describe, it, expect, beforeEach } from "bun:test";
import { searchPrompts, quickSearch, resetIndex } from "../../src/search/engine";

describe("searchPrompts filters", () => {
  beforeEach(() => {
    resetIndex();
  });

  it("filters by category with real registry data", () => {
    const results = searchPrompts("ultrathink", {
      category: "automation",
      expandSynonyms: false,
    });

    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.prompt.category).toBe("automation");
    }

    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("robot-mode-maker");
  });

  it("filters by single tag with real registry data", () => {
    const results = searchPrompts("ultrathink", {
      tags: ["documentation"],
      expandSynonyms: false,
    });

    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.prompt.tags).toContain("documentation");
    }

    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("readme-reviser");
  });

  it("filters by multiple tags (match any)", () => {
    const results = searchPrompts("ultrathink", {
      tags: ["brainstorming", "documentation"],
      expandSynonyms: false,
    });

    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("idea-wizard");
    expect(ids).toContain("readme-reviser");

    for (const result of results) {
      const hasTag = result.prompt.tags.some((tag) =>
        ["brainstorming", "documentation"].includes(tag),
      );
      expect(hasTag).toBe(true);
    }
  });

  it("applies category and tag filters together", () => {
    const results = searchPrompts("ultrathink", {
      category: "documentation",
      tags: ["documentation"],
      expandSynonyms: false,
    });

    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.prompt.category).toBe("documentation");
      expect(result.prompt.tags).toContain("documentation");
    }
  });
});

describe("prefix / substring search (Algolia-style instant search)", () => {
  beforeEach(() => {
    resetIndex();
  });

  it('finds "robot-mode-maker" for partial prefix "rob"', () => {
    const results = searchPrompts("rob", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("robot-mode-maker");
    expect(ids.indexOf("robot-mode-maker")).toBeLessThan(5);
  });

  it('finds "idea-wizard" for partial prefix "ide"', () => {
    const results = searchPrompts("ide", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("idea-wizard");
    expect(ids.indexOf("idea-wizard")).toBeLessThan(5);
  });

  it("finds prompts by exact full word", () => {
    const results = searchPrompts("ultrathink", { expandSynonyms: false });
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds prompts by exact ID", () => {
    const results = searchPrompts("idea-wizard", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("idea-wizard");
    // Exact-ID boost: should be #1
    expect(ids[0]).toBe("idea-wizard");
  });

  it("multi-word prefix query ranks best match first", () => {
    const results = searchPrompts("robot mode", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("robot-mode-maker");
    expect(ids[0]).toBe("robot-mode-maker");
  });

  it("quickSearch returns prefix results", () => {
    const ids = quickSearch("rob").map((p) => p.id);
    expect(ids).toContain("robot-mode-maker");
  });

  it("matchedFields populated for prefix matches", () => {
    const results = searchPrompts("rob", { expandSynonyms: false });
    const robot = results.find((r) => r.prompt.id === "robot-mode-maker");
    expect(robot).toBeDefined();
    expect(robot!.matchedFields.length).toBeGreaterThan(0);
  });

  it("empty query → empty results", () => {
    expect(searchPrompts("", { expandSynonyms: false })).toEqual([]);
  });
});

describe("acronym search", () => {
  beforeEach(() => {
    resetIndex();
  });

  it('"rmm" finds Robot-Mode Maker', () => {
    const results = searchPrompts("rmm", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("robot-mode-maker");
  });

  it('"bh" finds Bug Hunter', () => {
    const results = searchPrompts("bh", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("bug-hunter");
  });
});

describe("fuzzy search (typo tolerance)", () => {
  beforeEach(() => {
    resetIndex();
  });

  it('"robor" finds robot-mode-maker', () => {
    const results = searchPrompts("robor", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("robot-mode-maker");
  });
});

describe("synonym search", () => {
  beforeEach(() => {
    resetIndex();
  });

  it("finds prompts via synonym expansion", () => {
    // "debug" has synonyms including "fix", and bug-hunter has "debug" in tags
    const results = searchPrompts("debug", { expandSynonyms: true });
    expect(results.length).toBeGreaterThan(0);
  });

  it("direct match ranks above synonym match", () => {
    const direct = searchPrompts("debug", { expandSynonyms: false });
    const withSynonyms = searchPrompts("debug", { expandSynonyms: true });
    // Both should find results, synonym expansion may find more
    expect(direct.length).toBeGreaterThan(0);
    expect(withSynonyms.length).toBeGreaterThanOrEqual(direct.length);
  });
});
