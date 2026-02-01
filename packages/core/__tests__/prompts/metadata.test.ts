import { describe, expect, it } from "bun:test";
import {
  findDuplicateCandidates,
  findSimilarPrompts,
  suggestPromptMetadata,
  type Prompt,
} from "../../src/prompts";

const promptA: Prompt = {
  id: "idea-wizard",
  title: "The Idea Wizard",
  description: "Generate and evaluate improvement ideas",
  category: "ideation",
  tags: ["brainstorming", "improvement"],
  author: "Test Author",
  version: "1.0.0",
  created: "2026-01-01",
  content: "Come up with improvement ideas for a project and evaluate them.",
};

const promptB: Prompt = {
  id: "idea-wizard-v2",
  title: "The Idea Wizard",
  description: "Generate and score improvement ideas",
  category: "ideation",
  tags: ["brainstorming", "evaluation"],
  author: "Test Author",
  version: "1.0.0",
  created: "2026-01-02",
  content: "Generate improvement ideas and score each idea by impact.",
};

const promptC: Prompt = {
  id: "readme-reviser",
  title: "The README Reviser",
  description: "Update docs to match current behavior",
  category: "documentation",
  tags: ["documentation", "readme"],
  author: "Test Author",
  version: "1.0.0",
  created: "2026-01-03",
  content: "Update README files so they reflect the current project state.",
};

const prompts = [promptA, promptB, promptC];

describe("metadata assistant", () => {
  it("finds similar prompts based on deterministic similarity", () => {
    const results = findSimilarPrompts(promptA, prompts, {
      similarityThreshold: 0.1,
      maxSimilar: 2,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].prompt.id).toBe("idea-wizard-v2");
  });

  it("suggests tags and categories from similar prompts", () => {
    const suggestions = suggestPromptMetadata(promptA, prompts, {
      similarityThreshold: 0.1,
      maxTagSuggestions: 4,
    });

    const suggestedTags = suggestions.tags.map((item) => item.tag);
    expect(suggestedTags).toContain("evaluation");

    const categories = suggestions.categories.map((item) => item.category);
    expect(categories).toContain("ideation");
  });

  it("applies tag mappings to suggested tags", () => {
    const suggestions = suggestPromptMetadata(promptA, prompts, {
      similarityThreshold: 0.1,
      maxTagSuggestions: 4,
      tagMappings: {
        evaluation: "analysis",
      },
    });

    const suggestedTags = suggestions.tags.map((item) => item.tag);
    expect(suggestedTags).toContain("analysis");
    expect(suggestedTags).not.toContain("evaluation");
  });

  it("flags likely duplicates when titles match", () => {
    const duplicates = findDuplicateCandidates(prompts, { minScore: 0.9 });
    const hasIdeaPair = duplicates.some(
      (candidate) =>
        candidate.promptA.id === "idea-wizard" &&
        candidate.promptB.id === "idea-wizard-v2" &&
        candidate.titleMatch
    );
    expect(hasIdeaPair).toBe(true);
  });
});
