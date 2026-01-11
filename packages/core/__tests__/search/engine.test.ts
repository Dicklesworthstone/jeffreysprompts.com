import { describe, it, expect, beforeEach } from "bun:test";
import { searchPrompts, resetIndex } from "../../src/search/engine";

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
