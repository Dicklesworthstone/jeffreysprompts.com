// packages/core/src/search/hash-embedder.ts
// Deterministic hash-based embedding fallback (no external deps)

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnv1a(input: string, seed: number): number {
  let hash = FNV_OFFSET_BASIS ^ seed;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
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
 * Generate a deterministic embedding vector using a fast hash.
 * This is a lightweight fallback when semantic models are unavailable.
 */
export function hashEmbed(input: string, dims: number = 128): number[] {
  const safeDims = Number.isFinite(dims) && dims > 0 ? Math.floor(dims) : 128;
  const vector = new Array<number>(safeDims);

  if (!input) {
    return vector.fill(0);
  }

  for (let i = 0; i < safeDims; i += 1) {
    const hash = fnv1a(input, i);
    const normalized = hash / 0xffffffff;
    vector[i] = normalized * 2 - 1;
  }

  return normalizeVector(vector);
}
