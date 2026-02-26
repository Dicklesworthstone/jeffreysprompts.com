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
        ["brainstorming", "documentation"].includes(tag)
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

  it('finds "robot-mode-maker" when typing partial prefix "rob"', () => {
    const results = searchPrompts("rob", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("robot-mode-maker");
    // Should be ranked near the top (title prefix match)
    expect(ids.indexOf("robot-mode-maker")).toBeLessThan(5);
  });

  it('finds "idea-wizard" when typing partial prefix "ide"', () => {
    const results = searchPrompts("ide", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("idea-wizard");
    expect(ids.indexOf("idea-wizard")).toBeLessThan(5);
  });

  it("still finds prompts by exact full word (existing behavior)", () => {
    const results = searchPrompts("ultrathink", { expandSynonyms: false });
    expect(results.length).toBeGreaterThan(0);
  });

  it("still finds prompts by exact ID", () => {
    const results = searchPrompts("idea-wizard", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("idea-wizard");
  });

  it("multi-word prefix query narrows results", () => {
    const results = searchPrompts("robot mode", { expandSynonyms: false });
    const ids = results.map((r) => r.prompt.id);
    expect(ids).toContain("robot-mode-maker");
    // Multi-word match with coverage bonus should rank it first
    expect(ids[0]).toBe("robot-mode-maker");
  });

  it("quickSearch returns results for prefix queries", () => {
    const results = quickSearch("rob");
    const ids = results.map((p) => p.id);
    expect(ids).toContain("robot-mode-maker");
  });

  it("returns matchedFields for prefix matches", () => {
    const results = searchPrompts("rob", { expandSynonyms: false });
    const robotResult = results.find((r) => r.prompt.id === "robot-mode-maker");
    expect(robotResult).toBeDefined();
    expect(robotResult!.matchedFields.length).toBeGreaterThan(0);
  });

  it("returns empty array for empty query", () => {
    const results = searchPrompts("", { expandSynonyms: false });
    expect(results).toEqual([]);
  });
});
