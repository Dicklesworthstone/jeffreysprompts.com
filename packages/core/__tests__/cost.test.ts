import { describe, it, expect } from "bun:test";
import {
  estimateCost,
  estimatePromptTokens,
  estimateTokensFromText,
  listPricedModels,
  DEFAULT_PRICING_TABLE,
  DEFAULT_MODEL,
  PRICE_UNIT,
} from "../src/cost";
import { getPrompt } from "../src/prompts";
import type { Prompt } from "../src/prompts/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("constants", () => {
  it("PRICE_UNIT is 1000", () => {
    expect(PRICE_UNIT).toBe(1000);
  });

  it("DEFAULT_MODEL is a string in the pricing table", () => {
    expect(typeof DEFAULT_MODEL).toBe("string");
    expect(DEFAULT_PRICING_TABLE[DEFAULT_MODEL]).toBeDefined();
  });

  it("DEFAULT_PRICING_TABLE has expected model entries", () => {
    const models = Object.keys(DEFAULT_PRICING_TABLE);
    expect(models.length).toBeGreaterThanOrEqual(4);
    for (const model of models) {
      const pricing = DEFAULT_PRICING_TABLE[model];
      expect(pricing.inputPer1k).toBeGreaterThan(0);
      expect(pricing.outputPer1k).toBeGreaterThan(0);
      expect(pricing.currency).toBe("USD");
    }
  });
});

// ---------------------------------------------------------------------------
// listPricedModels
// ---------------------------------------------------------------------------

describe("listPricedModels", () => {
  it("returns sorted array of model names from default table", () => {
    const models = listPricedModels();
    expect(models.length).toBeGreaterThanOrEqual(4);
    const sorted = [...models].sort();
    expect(models).toEqual(sorted);
  });

  it("returns models from custom pricing table", () => {
    const models = listPricedModels({
      "model-b": { inputPer1k: 1, outputPer1k: 2, currency: "USD" },
      "model-a": { inputPer1k: 1, outputPer1k: 2, currency: "USD" },
    });
    expect(models).toEqual(["model-a", "model-b"]);
  });

  it("returns empty array for empty table", () => {
    expect(listPricedModels({})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// estimateTokensFromText
// ---------------------------------------------------------------------------

describe("estimateTokensFromText", () => {
  it("returns 0 for empty string", () => {
    expect(estimateTokensFromText("")).toBe(0);
  });

  it("returns 0 for whitespace-only string", () => {
    expect(estimateTokensFromText("   \n\t  ")).toBe(0);
  });

  it("estimates ~1 token per 4 characters", () => {
    expect(estimateTokensFromText("abcd")).toBe(1);
    expect(estimateTokensFromText("abcdefgh")).toBe(2);
    expect(estimateTokensFromText("abcdefghijkl")).toBe(3);
  });

  it("rounds up partial tokens", () => {
    expect(estimateTokensFromText("abc")).toBe(1); // ceil(3/4) = 1
    expect(estimateTokensFromText("abcde")).toBe(2); // ceil(5/4) = 2
  });

  it("returns at least 1 for non-empty text", () => {
    expect(estimateTokensFromText("a")).toBe(1);
  });

  it("handles long text", () => {
    const text = "word ".repeat(1000); // 5000 chars
    const tokens = estimateTokensFromText(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThanOrEqual(Math.ceil(5000 / 4));
  });
});

// ---------------------------------------------------------------------------
// estimatePromptTokens
// ---------------------------------------------------------------------------

describe("estimatePromptTokens", () => {
  const basePrompt: Prompt = {
    id: "test-prompt",
    title: "Test Prompt",
    description: "Test description",
    category: "workflow",
    tags: ["test"],
    author: "Test",
    version: "1.0.0",
    created: "2026-01-31",
    content: "abcd".repeat(10), // 40 chars → 10 tokens
  };

  it("uses declared estimatedTokens when present", () => {
    const prompt = getPrompt("idea-wizard");
    expect(prompt).toBeDefined();
    const estimate = estimatePromptTokens(prompt as Prompt);
    expect(estimate?.source).toBe("declared");
    expect(estimate?.tokens).toBe((prompt as Prompt).estimatedTokens);
  });

  it("falls back to heuristic when estimatedTokens is missing", () => {
    const estimate = estimatePromptTokens(basePrompt);
    expect(estimate?.source).toBe("heuristic");
    expect(estimate?.tokens).toBe(10);
  });

  it("falls back to heuristic when estimatedTokens is 0", () => {
    const estimate = estimatePromptTokens({ ...basePrompt, estimatedTokens: 0 });
    expect(estimate?.source).toBe("heuristic");
  });

  it("returns null when content is empty and no declared tokens", () => {
    const estimate = estimatePromptTokens({ ...basePrompt, content: "" });
    expect(estimate).toBeNull();
  });

  it("returns null when content is undefined and no declared tokens", () => {
    const estimate = estimatePromptTokens({ ...basePrompt, content: undefined as unknown as string });
    expect(estimate).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// estimateCost
// ---------------------------------------------------------------------------

describe("estimateCost", () => {
  it("calculates cost from custom pricing table", () => {
    const estimate = estimateCost({
      model: "test-model",
      inputTokens: 500,
      outputTokens: 250,
      pricingTable: {
        "test-model": { inputPer1k: 2, outputPer1k: 4, currency: "USD" },
      },
    });

    expect(estimate).toBeDefined();
    expect(estimate?.inputCost).toBe(1);
    expect(estimate?.outputCost).toBe(1);
    expect(estimate?.totalCost).toBe(2);
  });

  it("returns null when model pricing is missing", () => {
    const estimate = estimateCost({ model: "unknown", inputTokens: 100 });
    expect(estimate).toBeNull();
  });

  it("defaults outputTokens to 0 when not specified", () => {
    const estimate = estimateCost({
      model: "test",
      inputTokens: 1000,
      pricingTable: { test: { inputPer1k: 1, outputPer1k: 2, currency: "USD" } },
    });
    expect(estimate?.outputTokens).toBe(0);
    expect(estimate?.outputCost).toBe(0);
    expect(estimate?.totalCost).toBe(estimate?.inputCost);
  });

  it("clamps negative input tokens to 0", () => {
    const estimate = estimateCost({
      model: "test",
      inputTokens: -100,
      pricingTable: { test: { inputPer1k: 1, outputPer1k: 2, currency: "USD" } },
    });
    expect(estimate?.inputTokens).toBe(0);
    expect(estimate?.inputCost).toBe(0);
  });

  it("clamps negative output tokens to 0", () => {
    const estimate = estimateCost({
      model: "test",
      inputTokens: 100,
      outputTokens: -50,
      pricingTable: { test: { inputPer1k: 1, outputPer1k: 2, currency: "USD" } },
    });
    expect(estimate?.outputTokens).toBe(0);
    expect(estimate?.outputCost).toBe(0);
  });

  it("computes totalTokens as sum of input and output", () => {
    const estimate = estimateCost({
      model: "test",
      inputTokens: 300,
      outputTokens: 700,
      pricingTable: { test: { inputPer1k: 1, outputPer1k: 1, currency: "USD" } },
    });
    expect(estimate?.totalTokens).toBe(1000);
  });

  it("includes currency and unit in result", () => {
    const estimate = estimateCost({
      model: "test",
      inputTokens: 100,
      pricingTable: { test: { inputPer1k: 1, outputPer1k: 1, currency: "USD" } },
    });
    expect(estimate?.currency).toBe("USD");
    expect(estimate?.unit).toBe("per_1k_tokens");
    expect(estimate?.model).toBe("test");
  });

  it("uses DEFAULT_PRICING_TABLE when no custom table given", () => {
    const estimate = estimateCost({ model: DEFAULT_MODEL, inputTokens: 1000 });
    expect(estimate).not.toBeNull();
    expect(estimate?.model).toBe(DEFAULT_MODEL);
    expect(estimate?.inputCost).toBeGreaterThan(0);
  });

  it("handles zero tokens gracefully", () => {
    const estimate = estimateCost({
      model: "test",
      inputTokens: 0,
      outputTokens: 0,
      pricingTable: { test: { inputPer1k: 1, outputPer1k: 1, currency: "USD" } },
    });
    expect(estimate?.totalCost).toBe(0);
  });
});
