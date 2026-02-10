import { describe, it, expect } from "bun:test";
import {
  getForYouRecommendations,
  getRelatedRecommendations,
  getRecommendationsFromHistory,
} from "../../src/search/recommendations";
import type { Prompt } from "../../src/prompts/types";
import type { RecommendationSignal } from "../../src/search/recommendations";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const basePrompt = {
  description: "Test prompt description",
  author: "Jeffrey Emanuel",
  version: "1.0.0",
  created: "2025-01-01",
  content: "Prompt content",
} as const;

const prompts: Prompt[] = [
  {
    ...basePrompt,
    id: "alpha-docs",
    title: "Alpha Docs",
    category: "documentation",
    tags: ["docs", "readme"],
    featured: true,
  },
  {
    ...basePrompt,
    id: "beta-test",
    title: "Beta Test",
    category: "testing",
    tags: ["tests", "coverage"],
  },
  {
    ...basePrompt,
    id: "gamma-docs",
    title: "Gamma Docs",
    category: "documentation",
    tags: ["docs", "style"],
  },
  {
    ...basePrompt,
    id: "delta-debug",
    title: "Delta Debug",
    category: "debugging",
    tags: ["debug", "fix"],
    author: "Another Author",
  },
  {
    ...basePrompt,
    id: "epsilon-docs",
    title: "Epsilon Docs",
    category: "documentation",
    tags: ["docs", "api", "readme"],
    featured: true,
  },
];

// ---------------------------------------------------------------------------
// getRelatedRecommendations
// ---------------------------------------------------------------------------

describe("getRelatedRecommendations", () => {
  it("returns prompts related by tag overlap", () => {
    const results = getRelatedRecommendations(prompts[0], prompts, { limit: 5 });
    expect(results.some((r) => r.prompt.id === "gamma-docs")).toBe(true);
    expect(results.some((r) => r.prompt.id === "epsilon-docs")).toBe(true);
  });

  it("excludes the source prompt from results", () => {
    const results = getRelatedRecommendations(prompts[0], prompts);
    expect(results.every((r) => r.prompt.id !== "alpha-docs")).toBe(true);
  });

  it("excludes specified IDs", () => {
    const results = getRelatedRecommendations(prompts[0], prompts, {
      excludeIds: ["gamma-docs"],
    });
    expect(results.every((r) => r.prompt.id !== "gamma-docs")).toBe(true);
  });

  it("ranks same-category prompts higher", () => {
    const results = getRelatedRecommendations(prompts[0], prompts, { limit: 10 });
    const docResults = results.filter((r) => r.prompt.category === "documentation");
    const nonDocResults = results.filter((r) => r.prompt.category !== "documentation");
    if (docResults.length > 0 && nonDocResults.length > 0) {
      expect(docResults[0].score).toBeGreaterThanOrEqual(nonDocResults[0].score);
    }
  });

  it("includes reason strings", () => {
    const results = getRelatedRecommendations(prompts[0], prompts, { limit: 5 });
    for (const r of results) {
      expect(r.reasons.length).toBeGreaterThan(0);
    }
  });

  it("respects limit option", () => {
    const results = getRelatedRecommendations(prompts[0], prompts, { limit: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("respects minScore filter", () => {
    const results = getRelatedRecommendations(prompts[0], prompts, { minScore: 999 });
    expect(results.length).toBe(0);
  });

  it("boosts same-author prompts", () => {
    const results = getRelatedRecommendations(prompts[0], prompts, { limit: 10 });
    // alpha-docs author is "Jeffrey Emanuel", delta-debug is "Another Author"
    // gamma-docs shares author + category + tags → should score higher than delta-debug
    const gammaResult = results.find((r) => r.prompt.id === "gamma-docs");
    const deltaResult = results.find((r) => r.prompt.id === "delta-debug");
    if (gammaResult && deltaResult) {
      expect(gammaResult.score).toBeGreaterThan(deltaResult.score);
    }
  });

  it("boosts featured prompts", () => {
    const results = getRelatedRecommendations(prompts[0], prompts, { limit: 10 });
    const epsilonResult = results.find((r) => r.prompt.id === "epsilon-docs");
    expect(epsilonResult).toBeDefined();
    expect(epsilonResult!.reasons.some((r) => r.includes("Featured"))).toBe(true);
  });

  it("returns empty for no matching candidates", () => {
    const isolated: Prompt = {
      ...basePrompt,
      id: "isolated",
      title: "Isolated",
      category: "workflow",
      tags: ["unique-tag-xyz"],
      author: "Nobody",
    };
    const results = getRelatedRecommendations(isolated, [isolated]);
    expect(results.length).toBe(0);
  });

  it("handles empty prompts array", () => {
    const results = getRelatedRecommendations(prompts[0], []);
    expect(results.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getRecommendationsFromHistory
// ---------------------------------------------------------------------------

describe("getRecommendationsFromHistory", () => {
  it("recommends based on viewed prompts", () => {
    const results = getRecommendationsFromHistory([prompts[0]], prompts, { limit: 5 });
    // Should not include the viewed prompt itself
    expect(results.every((r) => r.prompt.id !== "alpha-docs")).toBe(true);
    // Should include related prompts
    expect(results.length).toBeGreaterThan(0);
  });

  it("accepts RecommendationSignal objects", () => {
    const signals: RecommendationSignal[] = [
      { prompt: prompts[0], kind: "save" },
    ];
    const results = getRecommendationsFromHistory(signals, prompts, { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.reasons.some((reason) => reason.includes("saved")))).toBe(true);
  });

  it("weights save signals higher than view signals", () => {
    const saveResults = getRecommendationsFromHistory(
      [{ prompt: prompts[0], kind: "save" } as RecommendationSignal],
      prompts,
      { limit: 5 }
    );
    const viewResults = getRecommendationsFromHistory(
      [prompts[0]],
      prompts,
      { limit: 5 }
    );
    // Save has higher weight, so scores should be >= view scores
    if (saveResults.length > 0 && viewResults.length > 0) {
      expect(saveResults[0].score).toBeGreaterThanOrEqual(viewResults[0].score);
    }
  });

  it("excludes prompts from history", () => {
    const results = getRecommendationsFromHistory(
      [prompts[0], prompts[1]],
      prompts,
      { limit: 10 }
    );
    expect(results.every((r) => r.prompt.id !== "alpha-docs")).toBe(true);
    expect(results.every((r) => r.prompt.id !== "beta-test")).toBe(true);
  });

  it("respects excludeIds option", () => {
    const results = getRecommendationsFromHistory(
      [prompts[0]],
      prompts,
      { limit: 10, excludeIds: ["gamma-docs"] }
    );
    expect(results.every((r) => r.prompt.id !== "gamma-docs")).toBe(true);
  });

  it("applies preference tag boost", () => {
    const results = getRecommendationsFromHistory(
      [],
      prompts,
      {
        limit: 5,
        preferences: { tags: ["debug"] },
      }
    );
    // delta-debug has the "debug" tag
    expect(results.some((r) => r.prompt.id === "delta-debug")).toBe(true);
  });

  it("applies preference category boost", () => {
    const results = getRecommendationsFromHistory(
      [],
      prompts,
      {
        limit: 5,
        preferences: { categories: ["testing"] },
      }
    );
    expect(results.some((r) => r.prompt.id === "beta-test")).toBe(true);
  });

  it("excludes tags from preferences", () => {
    const results = getRecommendationsFromHistory(
      [prompts[0]],
      prompts,
      {
        limit: 10,
        preferences: { excludeTags: ["debug"] },
      }
    );
    expect(results.every((r) => !r.prompt.tags.includes("debug"))).toBe(true);
  });

  it("excludes categories from preferences", () => {
    const results = getRecommendationsFromHistory(
      [prompts[0]],
      prompts,
      {
        limit: 10,
        preferences: { excludeCategories: ["debugging"] },
      }
    );
    expect(results.every((r) => r.prompt.category !== "debugging")).toBe(true);
  });

  it("returns only featured prompts when source array is empty and no preferences", () => {
    const results = getRecommendationsFromHistory([], prompts, { limit: 5 });
    // With no tag/category weights, only featured prompts get a non-zero score
    for (const r of results) {
      expect(r.prompt.featured).toBe(true);
    }
  });

  it("respects limit", () => {
    const results = getRecommendationsFromHistory([prompts[0]], prompts, { limit: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// getForYouRecommendations
// ---------------------------------------------------------------------------

describe("getForYouRecommendations", () => {
  it("returns featured picks when no history exists", () => {
    const results = getForYouRecommendations({}, prompts, { limit: 2 });
    expect(results.length).toBe(2);
    expect(results[0].prompt.id).toBe("alpha-docs");
    expect(results[0].reasons.some((reason) => reason.includes("Featured"))).toBe(true);
  });

  it("recommends similar prompts based on tag overlap", () => {
    const results = getForYouRecommendations(
      { saved: [prompts[0]] },
      prompts,
      { limit: 3 }
    );
    const gamma = results.find((rec) => rec.prompt.id === "gamma-docs");
    expect(gamma).toBeTruthy();
    expect(
      gamma?.reasons.some((reason) => reason.includes("saved prompts") || reason.includes("saved"))
    ).toBe(true);
  });

  it("provides related recommendations for a single prompt", () => {
    const results = getRelatedRecommendations(prompts[0], prompts, { limit: 2 });
    expect(results.some((rec) => rec.prompt.id === "gamma-docs")).toBe(true);
  });

  it("respects excluded categories when recommending", () => {
    const results = getForYouRecommendations(
      { preferences: { excludeCategories: ["documentation"] } },
      prompts,
      { limit: 3 }
    );
    expect(results.every((rec) => rec.prompt.category !== "documentation")).toBe(true);
  });

  it("excludes viewed prompts from results", () => {
    const results = getForYouRecommendations(
      { viewed: [prompts[0]] },
      prompts,
      { limit: 10 }
    );
    expect(results.every((r) => r.prompt.id !== "alpha-docs")).toBe(true);
  });

  it("excludes saved prompts from results", () => {
    const results = getForYouRecommendations(
      { saved: [prompts[0]] },
      prompts,
      { limit: 10 }
    );
    expect(results.every((r) => r.prompt.id !== "alpha-docs")).toBe(true);
  });

  it("excludes run prompts from results", () => {
    const results = getForYouRecommendations(
      { runs: [prompts[0]] },
      prompts,
      { limit: 10 }
    );
    expect(results.every((r) => r.prompt.id !== "alpha-docs")).toBe(true);
  });

  it("respects excludeIds option", () => {
    const results = getForYouRecommendations(
      {},
      prompts,
      { limit: 10, excludeIds: ["alpha-docs", "epsilon-docs"] }
    );
    expect(results.every((r) => r.prompt.id !== "alpha-docs")).toBe(true);
    expect(results.every((r) => r.prompt.id !== "epsilon-docs")).toBe(true);
  });

  it("combines viewed, saved, and run signals", () => {
    const results = getForYouRecommendations(
      {
        viewed: [prompts[0]],
        saved: [prompts[1]],
        runs: [prompts[3]],
      },
      prompts,
      { limit: 10 }
    );
    // All source prompts excluded
    expect(results.every((r) => r.prompt.id !== "alpha-docs")).toBe(true);
    expect(results.every((r) => r.prompt.id !== "beta-test")).toBe(true);
    expect(results.every((r) => r.prompt.id !== "delta-debug")).toBe(true);
  });

  it("uses preferences for cold-start recommendations", () => {
    const results = getForYouRecommendations(
      { preferences: { tags: ["debug"], categories: ["debugging"] } },
      prompts,
      { limit: 5 }
    );
    expect(results.some((r) => r.prompt.id === "delta-debug")).toBe(true);
  });

  it("handles empty prompts array", () => {
    const results = getForYouRecommendations({}, [], { limit: 5 });
    expect(results.length).toBe(0);
  });

  it("non-featured prompts get lower score in cold start", () => {
    const results = getForYouRecommendations({}, prompts, { limit: 10 });
    const featured = results.filter((r) => r.prompt.featured);
    const nonFeatured = results.filter((r) => !r.prompt.featured);
    if (featured.length > 0 && nonFeatured.length > 0) {
      expect(featured[0].score).toBeGreaterThan(nonFeatured[0].score);
    }
  });

  it("all results have score > 0", () => {
    const results = getForYouRecommendations(
      { saved: [prompts[0]] },
      prompts,
      { limit: 10 }
    );
    for (const r of results) {
      expect(r.score).toBeGreaterThan(0);
    }
  });
});
