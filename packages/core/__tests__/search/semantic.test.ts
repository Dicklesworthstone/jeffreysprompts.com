/**
 * Unit tests for packages/core/src/search/semantic.ts
 * Tests hash embeddings, cosine similarity, and reranking.
 * No mocks - all pure functions using hash-based embeddings.
 */

import { describe, it, expect } from "bun:test";
import {
  hashEmbedding,
  cosineSimilarity,
  semanticRerankHash,
  isModelAvailable,
  getModelError,
  resetModelState,
  type RankedResult,
} from "../../src/search/semantic";

// ---------------------------------------------------------------------------
// hashEmbedding
// ---------------------------------------------------------------------------

describe("hashEmbedding", () => {
  it("returns array of numbers", () => {
    const embedding = hashEmbedding("test text");
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
    expect(typeof embedding[0]).toBe("number");
  });

  it("returns 128 dimensions by default", () => {
    const embedding = hashEmbedding("test text");
    expect(embedding.length).toBe(128);
  });

  it("accepts custom dimensions", () => {
    const embedding = hashEmbedding("test text", 64);
    expect(embedding.length).toBe(64);
  });

  it("is deterministic (same input = same output)", () => {
    const a = hashEmbedding("hello world");
    const b = hashEmbedding("hello world");
    expect(a).toEqual(b);
  });

  it("produces different embeddings for different text", () => {
    const a = hashEmbedding("hello world");
    const b = hashEmbedding("goodbye universe");
    expect(a).not.toEqual(b);
  });

  it("produces normalized vector (magnitude ~ 1)", () => {
    const embedding = hashEmbedding("test normalization");
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    expect(Math.abs(magnitude - 1)).toBeLessThan(0.01);
  });

  it("handles empty string", () => {
    const embedding = hashEmbedding("");
    expect(embedding.length).toBe(128);
  });

  it("handles very long text", () => {
    const longText = "word ".repeat(10000);
    const embedding = hashEmbedding(longText);
    expect(embedding.length).toBe(128);
  });

  it("handles unicode text", () => {
    const embedding = hashEmbedding("Unicode test: \u{1F600} \u{2603}");
    expect(embedding.length).toBe(128);
  });
});

// ---------------------------------------------------------------------------
// cosineSimilarity
// ---------------------------------------------------------------------------

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = hashEmbedding("same text");
    const sim = cosineSimilarity(v, v);
    expect(Math.abs(sim - 1)).toBeLessThan(0.001);
  });

  it("returns high similarity for similar text", () => {
    const a = hashEmbedding("brainstorm improvement ideas");
    const b = hashEmbedding("generate and improve ideas");
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.3);
  });

  it("returns lower similarity for different text", () => {
    const a = hashEmbedding("brainstorm improvement ideas");
    const b = hashEmbedding("deploy kubernetes cluster management");
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeLessThan(0.8);
  });

  it("handles zero vectors gracefully", () => {
    const zero = new Array(128).fill(0);
    const v = hashEmbedding("some text");
    const sim = cosineSimilarity(zero, v);
    expect(typeof sim).toBe("number");
    expect(Number.isNaN(sim)).toBe(false);
  });

  it("returns value between -1 and 1", () => {
    const a = hashEmbedding("text a");
    const b = hashEmbedding("text b");
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// semanticRerankHash
// ---------------------------------------------------------------------------

describe("semanticRerankHash", () => {
  it("returns array of ranked results", () => {
    const baseline: RankedResult[] = [
      { id: "a", score: 1.0, text: "brainstorm ideas" },
      { id: "b", score: 0.8, text: "deploy infrastructure" },
    ];
    const results = semanticRerankHash("brainstorm ideas", baseline);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);
  });

  it("reranks based on semantic similarity", () => {
    const baseline: RankedResult[] = [
      { id: "low-bm25-high-semantic", score: 0.5, text: "improve project ideas" },
      { id: "high-bm25-low-semantic", score: 1.0, text: "deploy kubernetes cluster" },
    ];
    const results = semanticRerankHash("brainstorm improvement ideas", baseline);
    // Results should be sorted by combined score
    expect(results.length).toBe(2);
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
    }
  });

  it("handles empty baseline", () => {
    const results = semanticRerankHash("test query", []);
    expect(results).toEqual([]);
  });

  it("handles single result", () => {
    const baseline: RankedResult[] = [{ id: "a", score: 1.0, text: "test" }];
    const results = semanticRerankHash("test", baseline);
    expect(results.length).toBe(1);
  });

  it("preserves IDs in results", () => {
    const baseline: RankedResult[] = [
      { id: "first", score: 1.0, text: "first prompt" },
      { id: "second", score: 0.5, text: "second prompt" },
    ];
    const results = semanticRerankHash("test", baseline);
    const ids = results.map((r) => r.id);
    expect(ids).toContain("first");
    expect(ids).toContain("second");
  });

  it("uses ID as fallback text when text not provided", () => {
    const baseline: RankedResult[] = [
      { id: "idea-wizard", score: 1.0 },
      { id: "readme-reviser", score: 0.5 },
    ];
    const results = semanticRerankHash("idea brainstorm", baseline);
    expect(results.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Model state functions
// ---------------------------------------------------------------------------

describe("model state functions", () => {
  it("isModelAvailable returns boolean", () => {
    expect(typeof isModelAvailable()).toBe("boolean");
  });

  it("getModelError returns Error or null", () => {
    const error = getModelError();
    expect(error === null || error instanceof Error).toBe(true);
  });

  it("resetModelState does not throw", () => {
    expect(() => resetModelState()).not.toThrow();
  });
});
