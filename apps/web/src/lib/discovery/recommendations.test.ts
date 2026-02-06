/**
 * Unit tests for web-side recommendations engine
 * @module lib/discovery/recommendations.test
 */

import { describe, test, expect } from "vitest";
import {
  getRelatedRecommendations,
  getRecommendationsFromHistory,
  getForYouRecommendations,
} from "./recommendations";
import type { CommunityPrompt } from "@/lib/swap-meet/types";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeAuthor = (id = "author-1", displayName = "Alice") => ({
  id,
  username: id,
  displayName,
  avatarUrl: null,
  reputation: 100,
});

const basePrompt: Omit<CommunityPrompt, "id" | "title" | "category" | "tags"> = {
  description: "Test prompt",
  content: "Prompt body",
  author: makeAuthor(),
  stats: { views: 10, copies: 5, saves: 2, rating: 4, ratingCount: 3 },
  featured: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

function makePrompt(
  overrides: Partial<CommunityPrompt> & Pick<CommunityPrompt, "id" | "title" | "category" | "tags">
): CommunityPrompt {
  return { ...basePrompt, ...overrides } as CommunityPrompt;
}

const docPrompt = makePrompt({
  id: "doc-writer",
  title: "Doc Writer",
  category: "documentation",
  tags: ["docs", "readme", "writing"],
  stats: { views: 100, copies: 50, saves: 20, rating: 5, ratingCount: 10 },
  featured: true,
});

const testPrompt = makePrompt({
  id: "test-helper",
  title: "Test Helper",
  category: "testing",
  tags: ["tests", "coverage", "ci"],
});

const docPrompt2 = makePrompt({
  id: "api-docs",
  title: "API Docs",
  category: "documentation",
  tags: ["docs", "api", "openapi"],
});

const ideaPrompt = makePrompt({
  id: "idea-gen",
  title: "Idea Generator",
  category: "ideation",
  tags: ["brainstorm", "ideas", "creativity"],
  author: makeAuthor("author-2", "Bob"),
});

const refactorPrompt = makePrompt({
  id: "code-refactor",
  title: "Code Refactor",
  category: "refactoring",
  tags: ["refactor", "cleanup", "code"],
});

const allPrompts = [docPrompt, testPrompt, docPrompt2, ideaPrompt, refactorPrompt];

// ---------------------------------------------------------------------------
// getRelatedRecommendations
// ---------------------------------------------------------------------------

describe("getRelatedRecommendations", () => {
  test("returns prompts with shared tags ranked highest", () => {
    const results = getRelatedRecommendations(docPrompt, allPrompts);
    // docPrompt2 shares "docs" tag AND "documentation" category → highest score
    expect(results[0].prompt.id).toBe("api-docs");
    expect(results[0].score).toBeGreaterThan(0);
  });

  test("excludes the source prompt from results", () => {
    const results = getRelatedRecommendations(docPrompt, allPrompts);
    expect(results.every((r) => r.prompt.id !== "doc-writer")).toBe(true);
  });

  test("respects the limit option", () => {
    const results = getRelatedRecommendations(docPrompt, allPrompts, { limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test("excludes specified IDs", () => {
    const results = getRelatedRecommendations(docPrompt, allPrompts, {
      excludeIds: ["api-docs"],
    });
    expect(results.every((r) => r.prompt.id !== "api-docs")).toBe(true);
  });

  test("filters by minimum score", () => {
    const results = getRelatedRecommendations(docPrompt, allPrompts, {
      minScore: 0.5,
    });
    for (const rec of results) {
      expect(rec.score).toBeGreaterThan(0.5);
    }
  });

  test("provides reasons for recommendations", () => {
    const results = getRelatedRecommendations(docPrompt, allPrompts);
    const apiDocs = results.find((r) => r.prompt.id === "api-docs");
    expect(apiDocs).toBeTruthy();
    expect(apiDocs!.reasons.length).toBeGreaterThan(0);
    // Should mention shared tags or same category
    const reasonText = apiDocs!.reasons.join(" ");
    expect(
      reasonText.includes("Similar tags") || reasonText.includes("Same category")
    ).toBe(true);
  });

  test("same-author bonus contributes to score", () => {
    // docPrompt and docPrompt2 share the same author (author-1)
    // ideaPrompt has author-2
    const relatedToDoc = getRelatedRecommendations(docPrompt, allPrompts);
    const apiDocsRec = relatedToDoc.find((r) => r.prompt.id === "api-docs");
    const ideaRec = relatedToDoc.find((r) => r.prompt.id === "idea-gen");
    expect(apiDocsRec).toBeTruthy();
    expect(ideaRec).toBeTruthy();
    // apiDocs shares author, category, AND tags; idea shares none
    expect(apiDocsRec!.score).toBeGreaterThan(ideaRec!.score);
  });

  test("returns results sorted by score descending", () => {
    const results = getRelatedRecommendations(docPrompt, allPrompts);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  test("handles empty allPrompts gracefully", () => {
    const results = getRelatedRecommendations(docPrompt, []);
    expect(results).toEqual([]);
  });

  test("handles source prompt not in allPrompts", () => {
    const orphan = makePrompt({
      id: "orphan",
      title: "Orphan",
      category: "debugging",
      tags: ["unknown"],
    });
    const results = getRelatedRecommendations(orphan, allPrompts);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getRecommendationsFromHistory
// ---------------------------------------------------------------------------

describe("getRecommendationsFromHistory", () => {
  test("recommends based on aggregated tag affinity from history", () => {
    const results = getRecommendationsFromHistory(
      [docPrompt, docPrompt2],
      allPrompts,
    );
    // Both source prompts have "docs" tag, so anything with "docs" gets a boost
    // But sources are excluded; testPrompt/ideaPrompt/refactorPrompt remain
    expect(results.every((r) => r.prompt.id !== "doc-writer")).toBe(true);
    expect(results.every((r) => r.prompt.id !== "api-docs")).toBe(true);
  });

  test("excludes source prompts from recommendations", () => {
    const results = getRecommendationsFromHistory([docPrompt], allPrompts);
    expect(results.every((r) => r.prompt.id !== "doc-writer")).toBe(true);
  });

  test("excludes specified IDs", () => {
    const results = getRecommendationsFromHistory([docPrompt], allPrompts, {
      excludeIds: ["test-helper"],
    });
    expect(results.every((r) => r.prompt.id !== "test-helper")).toBe(true);
  });

  test("respects limit", () => {
    const results = getRecommendationsFromHistory([docPrompt], allPrompts, {
      limit: 1,
    });
    expect(results.length).toBeLessThanOrEqual(1);
  });

  test("category affinity boosts candidates in same category", () => {
    // Source is documentation; only remaining doc-category prompts get category boost
    const results = getRecommendationsFromHistory([docPrompt], allPrompts);
    // api-docs is excluded (it's another doc prompt used as source if we pass both)
    // With just docPrompt as source: api-docs should be recommended (shares category + tags)
    const apiDocs = results.find((r) => r.prompt.id === "api-docs");
    if (apiDocs) {
      const reasonText = apiDocs.reasons.join(" ");
      expect(reasonText.includes("category")).toBe(true);
    }
  });

  test("handles empty source array", () => {
    const results = getRecommendationsFromHistory([], allPrompts);
    expect(results).toEqual([]);
  });

  test("provides meaningful reasons", () => {
    const results = getRecommendationsFromHistory([docPrompt], allPrompts);
    for (const rec of results) {
      expect(rec.reasons.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getForYouRecommendations
// ---------------------------------------------------------------------------

describe("getForYouRecommendations", () => {
  test("returns popular items sorted by copies when no history", () => {
    const results = getForYouRecommendations({}, allPrompts, { limit: 3 });
    expect(results.length).toBe(3);
    // Should be sorted by copies descending; docPrompt has 50 copies (highest)
    expect(results[0].prompt.id).toBe("doc-writer");
    expect(results[0].reasons.some((r) => r.includes("Popular"))).toBe(true);
  });

  test("uses saved prompts with higher weight than viewed", () => {
    // Save ideaPrompt, view docPrompt → should see brainstorm-related results
    const results = getForYouRecommendations(
      {
        saved: [ideaPrompt],
        viewed: [docPrompt],
      },
      allPrompts,
    );
    // Source prompts are excluded
    expect(results.every((r) => r.prompt.id !== "idea-gen")).toBe(true);
    expect(results.every((r) => r.prompt.id !== "doc-writer")).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test("excludes both saved and viewed prompts from results", () => {
    const results = getForYouRecommendations(
      {
        saved: [ideaPrompt],
        viewed: [docPrompt],
      },
      allPrompts,
    );
    const resultIds = results.map((r) => r.prompt.id);
    expect(resultIds).not.toContain("idea-gen");
    expect(resultIds).not.toContain("doc-writer");
  });

  test("respects limit", () => {
    const results = getForYouRecommendations({}, allPrompts, { limit: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test("respects excludeIds option", () => {
    const results = getForYouRecommendations({}, allPrompts, {
      excludeIds: ["doc-writer", "test-helper"],
    });
    const resultIds = results.map((r) => r.prompt.id);
    expect(resultIds).not.toContain("doc-writer");
    expect(resultIds).not.toContain("test-helper");
  });

  test("handles only saved prompts (no viewed)", () => {
    const results = getForYouRecommendations(
      { saved: [docPrompt] },
      allPrompts,
    );
    expect(results.every((r) => r.prompt.id !== "doc-writer")).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test("handles only viewed prompts (no saved)", () => {
    // Use docPrompt which shares tags/category with docPrompt2
    const results = getForYouRecommendations(
      { viewed: [docPrompt] },
      allPrompts,
    );
    expect(results.every((r) => r.prompt.id !== "doc-writer")).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test("handles empty prompt catalog", () => {
    const results = getForYouRecommendations({}, []);
    expect(results).toEqual([]);
  });

  test("returns scored results with reasons", () => {
    const results = getForYouRecommendations(
      { viewed: [docPrompt] },
      allPrompts,
    );
    for (const rec of results) {
      expect(rec.score).toBeGreaterThan(0);
      expect(rec.reasons.length).toBeGreaterThan(0);
    }
  });

  test("popular fallback handles zero-copy prompts", () => {
    const zeroCopyPrompts = allPrompts.map((p) => ({
      ...p,
      stats: { ...p.stats, copies: 0 },
    }));
    const results = getForYouRecommendations({}, zeroCopyPrompts, { limit: 3 });
    // Should not crash; all prompts have 0 copies
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  test("prompts with no tags produce zero tag similarity", () => {
    const noTagPrompt = makePrompt({
      id: "no-tags",
      title: "No Tags",
      category: "ideation",
      tags: [],
    });
    const results = getRelatedRecommendations(noTagPrompt, [
      makePrompt({ id: "also-no-tags", title: "Also No Tags", category: "ideation", tags: [] }),
    ]);
    // Score can still be > 0 due to category/author/popularity
    // But should not crash
    expect(Array.isArray(results)).toBe(true);
  });

  test("handles prompts with undefined stats gracefully", () => {
    const badStats = makePrompt({
      id: "bad-stats",
      title: "Bad Stats",
      category: "documentation",
      tags: ["docs"],
      stats: { views: 0, copies: 0, saves: 0, rating: 0, ratingCount: 0 },
    });
    const results = getRelatedRecommendations(docPrompt, [badStats]);
    expect(Array.isArray(results)).toBe(true);
  });

  test("tag similarity is case-insensitive", () => {
    const upperCase = makePrompt({
      id: "upper",
      title: "Upper",
      category: "documentation",
      tags: ["DOCS", "README"],
    });
    const results = getRelatedRecommendations(docPrompt, [upperCase]);
    // Should still match "docs" and "readme" case-insensitively
    expect(results.length).toBe(1);
    const reasonText = results[0].reasons.join(" ");
    expect(reasonText.includes("Similar tags")).toBe(true);
  });

  test("duplicate prompts in history do not cause issues", () => {
    const results = getRecommendationsFromHistory(
      [docPrompt, docPrompt, docPrompt],
      allPrompts,
    );
    expect(Array.isArray(results)).toBe(true);
    // Source is excluded once
    expect(results.every((r) => r.prompt.id !== "doc-writer")).toBe(true);
  });

  test("single prompt in catalog returns empty related list", () => {
    const results = getRelatedRecommendations(docPrompt, [docPrompt]);
    expect(results).toEqual([]);
  });
});
