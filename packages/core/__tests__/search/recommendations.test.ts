import { describe, it, expect } from "bun:test";
import {
  getForYouRecommendations,
  getRelatedRecommendations,
} from "../../src/search/recommendations";
import type { Prompt } from "../../src/prompts/types";

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
];

describe("recommendations", () => {
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
      gamma?.reasons.some((reason) => reason.includes("saved prompts"))
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
});
