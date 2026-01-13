// packages/core/src/search/bm25.ts
// BM25 search implementation (Okapi BM25)

import type { Prompt } from "../prompts/types";
import { tokenize } from "./tokenize";

// BM25 parameters
const K1 = 1.2; // Term frequency saturation
const B = 0.75; // Length normalization

export interface BM25Document {
  id: string;
  tokens: string[];
  length: number;
  termFreq: Map<string, number>; // Precomputed term frequency for efficient search
}

export interface BM25Index {
  documents: Map<string, BM25Document>;
  avgDocLength: number;
  docCount: number;
  termDocFreq: Map<string, number>; // How many docs contain each term
}

/**
 * Build a BM25 index from prompts
 */
export function buildIndex(prompts: Prompt[]): BM25Index {
  const documents = new Map<string, BM25Document>();
  const termDocFreq = new Map<string, number>();
  let totalLength = 0;

  for (const prompt of prompts) {
    // Combine searchable fields with weights baked into token frequency
    const textParts = [
      // Title gets 3x weight
      prompt.title, prompt.title, prompt.title,
      // Description gets 2x weight
      prompt.description, prompt.description,
      // Tags get 1.5x weight
      ...prompt.tags, ...prompt.tags.slice(0, Math.ceil(prompt.tags.length / 2)),
      // Content gets 1x weight
      prompt.content,
    ];

    const tokens = tokenize(textParts.join(" "));
    const uniqueTokens = new Set(tokens);

    // Precompute term frequency map for efficient search
    const termFreq = new Map<string, number>();
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
    }

    documents.set(prompt.id, {
      id: prompt.id,
      tokens,
      length: tokens.length,
      termFreq,
    });

    totalLength += tokens.length;

    // Update document frequency for each unique term
    for (const token of uniqueTokens) {
      termDocFreq.set(token, (termDocFreq.get(token) ?? 0) + 1);
    }
  }

  return {
    documents,
    // Ensure avgDocLength is always at least 1 to prevent division by zero
    // in the BM25 length normalization formula (doc.length / avgDocLength)
    avgDocLength: Math.max(totalLength / prompts.length || 1, 1),
    docCount: prompts.length,
    termDocFreq,
  };
}

/**
 * Calculate IDF (Inverse Document Frequency) for a term
 */
function idf(termDocFreq: number, docCount: number): number {
  return Math.log((docCount - termDocFreq + 0.5) / (termDocFreq + 0.5) + 1);
}

/**
 * Search the index with a query
 */
export function search(
  index: BM25Index,
  query: string | string[],
  limit: number = Infinity
): Array<{ id: string; score: number }> {
  const queryTokens = Array.isArray(query) ? query : tokenize(query);
  const scores = new Map<string, number>();

  for (const [docId, doc] of index.documents) {
    let score = 0;

    for (const term of queryTokens) {
      // Use precomputed term frequency map - O(1) lookup instead of O(n) filter
      const tf = doc.termFreq.get(term) ?? 0;
      if (tf === 0) continue;

      const docFreq = index.termDocFreq.get(term) ?? 0;
      const idfScore = idf(docFreq, index.docCount);

      // BM25 formula
      const numerator = tf * (K1 + 1);
      const denominator =
        tf + K1 * (1 - B + B * (doc.length / index.avgDocLength));

      score += idfScore * (numerator / denominator);
    }

    if (score > 0) {
      scores.set(docId, score);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score]) => ({ id, score }));
}
