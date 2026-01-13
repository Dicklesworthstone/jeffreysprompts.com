// packages/core/src/search/hash-embedder.ts
// Deterministic hash-based embedding fallback (no external deps)
// Uses Locality Sensitive Hashing (LSH) on n-grams to approximate cosine similarity

import { tokenize } from "./tokenize";

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function simpleHash(str: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0; // Ensure positive unsigned 32-bit integer
}

function normalizeVector(vector: number[]): number[] {
  let sumSquares = 0;
  for (const value of vector) {
    sumSquares += value * value;
  }
  if (sumSquares === 0) return vector;
  const magnitude = Math.sqrt(sumSquares);
  return vector.map((value) => value / magnitude);
}

/**
 * Generate a deterministic embedding vector using LSH on n-grams.
 * This preserves semantic similarity (bag-of-words/ngrams) unlike naive string hashing.
 * 
 * @param input Text to embed
 * @param dims Vector dimensions (default: 128)
 */
export function hashEmbed(input: string, dims: number = 128): number[] {
  const safeDims = Number.isFinite(dims) && dims > 0 ? Math.floor(dims) : 128;
  const vector = new Array<number>(safeDims).fill(0);

  if (!input) {
    return vector;
  }

  const tokens = tokenize(input);

  for (const token of tokens) {
    // 1. Hash whole token
    const tokenHash = simpleHash(token);
    const idx = tokenHash % safeDims;
    const sign = (tokenHash >> 16) & 1 ? 1 : -1;
    vector[idx] += sign * 2; // Extra weight for whole tokens

    // 2. Hash character trigrams for robustness against typos/morphology
    if (token.length >= 3) {
      for (let i = 0; i <= token.length - 3; i++) {
        const gram = token.slice(i, i + 3);
        const hash = simpleHash(gram);
        
        // Use 3 hash functions for LSH projection
        for (let k = 0; k < 3; k++) {
          const h = Math.imul(hash, k + 1);
          const pIdx = (h >>> 0) % safeDims;
          const pSign = (h >> 16) & 1 ? 1 : -1;
          vector[pIdx] += pSign;
        }
      }
    }
  }

  return normalizeVector(vector);
}
