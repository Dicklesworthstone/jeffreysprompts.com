// packages/core/src/search/semantic.ts
// Optional semantic search using MiniLM or hash-based embeddings

import { tokenize } from "./tokenize";

/**
 * Search result with score, used as input/output for semantic reranking
 */
export interface RankedResult {
  id: string;
  score: number;
  text?: string; // Optional text for embedding (used in rerank)
}

/**
 * Options for semantic reranking
 */
export interface SemanticOptions {
  /** Number of top results to rerank (default: 10) */
  topN?: number;
  /** Fallback strategy when model unavailable: 'hash' | 'passthrough' */
  fallback?: "hash" | "passthrough";
  /** Path to cache models (default: XDG_CACHE_HOME/jfp/models) */
  modelCachePath?: string;
  /** Model ID for sentence transformers (default: Xenova/all-MiniLM-L6-v2) */
  modelId?: string;
}

/**
 * State for lazy-loaded transformer model
 */
interface TransformerState {
  pipeline: unknown | null;
  loading: Promise<void> | null;
  loadError: Error | null;
}

const transformerState: TransformerState = {
  pipeline: null,
  loading: null,
  loadError: null,
};

/**
 * Join path segments without relying on Node.js "path" module.
 * Uses "/" on most platforms; uses "\\" on Windows when process is available.
 */
function joinPath(...parts: string[]): string {
  const sep = "/";

  return parts
    .filter((part) => typeof part === "string" && part.length > 0)
    .map((part, index) => {
      const normalized = part.replace(/[\\/]+/g, sep);
      if (index === 0) {
        return normalized.replace(/\/+$/, "");
      }
      return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
    })
    .filter(Boolean)
    .join(sep);
}

/**
 * Get the default model cache path using XDG standards
 */
function getDefaultCachePath(): string {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<
    string,
    string | undefined
  >;

  if (env.XDG_CACHE_HOME) {
    return joinPath(env.XDG_CACHE_HOME, "jfp", "models");
  }

  const home = env.HOME || env.USERPROFILE || "";

  if (env.LOCALAPPDATA) {
    return joinPath(env.LOCALAPPDATA, "jfp", "models");
  }

  return joinPath(home, ".cache", "jfp", "models");
}

/**
 * Hash-based embedding: deterministic, fast, zero dependencies
 * Uses locality-sensitive hashing (LSH) with character n-grams
 * Not as accurate as neural embeddings, but provides consistent baseline
 */
export function hashEmbedding(text: string, dimensions: number = 128): number[] {
  const tokens = tokenize(text);
  const embedding = new Array(dimensions).fill(0);

  // Create n-grams and hash them
  for (const token of tokens) {
    // Character 3-grams for robustness
    for (let i = 0; i <= token.length - 3; i++) {
      const gram = token.slice(i, i + 3);
      const hash = simpleHash(gram);
      // Use multiple hash functions for LSH
      for (let h = 0; h < 3; h++) {
        const idx = (Math.imul(hash, h + 1) >>> 0) % dimensions;
        // Alternate between +1 and -1 based on hash bits
        embedding[idx] += ((hash >> h) & 1) ? 1 : -1;
      }
    }

    // Also hash whole tokens
    const tokenHash = simpleHash(token);
    const idx = Math.abs(tokenHash % dimensions);
    embedding[idx] += 2; // Whole token gets extra weight
  }

  // Normalize to unit vector
  return normalizeVector(embedding);
}

/**
 * Simple deterministic hash function (FNV-1a variant)
 */
function simpleHash(str: string): number {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0; // FNV prime, true 32-bit multiply
  }
  return hash;
}

/**
 * Normalize vector to unit length
 */
function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) return vec;
  return vec.map((v) => v / magnitude);
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    console.warn(
      `[semantic] Cosine similarity dimension mismatch: ${a.length} vs ${b.length}. Returning 0.`
    );
    return 0;
  }
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return dotProduct; // Vectors are already normalized
}

/** Default timeout for model loading (30 seconds) */
const MODEL_LOAD_TIMEOUT_MS = 30000;

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
function timeoutPromise(ms: number, operation: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timed out after ${ms}ms`));
    }, ms);
  });
}

/**
 * Lazy-load the transformer pipeline
 * Catches errors gracefully and sets loadError state
 * Includes timeout protection to prevent hanging on slow networks
 */
async function loadTransformerPipeline(options: SemanticOptions = {}): Promise<unknown | null> {
  if (transformerState.pipeline) {
    return transformerState.pipeline;
  }

  if (transformerState.loadError) {
    return null;
  }

  if (transformerState.loading) {
    await transformerState.loading;
    return transformerState.pipeline;
  }

  const modelId = options.modelId || "Xenova/all-MiniLM-L6-v2";
  const cachePath = options.modelCachePath || getDefaultCachePath();

  transformerState.loading = (async () => {
    try {
      // Dynamic import without a static module reference so bundlers don't
      // require the optional dependency at build time.
      if (typeof window !== "undefined") {
        throw new Error("Transformer pipeline is only available in Node runtimes.");
      }
      const modulePath: string = "@xenova/transformers";
      const { pipeline, env } = (await import(
        /* webpackIgnore: true */
        modulePath
      )) as {
        pipeline: (
          task: string,
          model: string,
          options?: { quantized?: boolean }
        ) => Promise<unknown>;
        env: { cacheDir: string; allowLocalModels: boolean };
      };

      // Configure cache path
      env.cacheDir = cachePath;
      env.allowLocalModels = true;

      // Load feature extraction pipeline (embeddings) with timeout protection
      const loadPipeline = pipeline(
        "feature-extraction",
        modelId,
        {
          quantized: true, // Use quantized model for smaller size
        }
      );

      transformerState.pipeline = await Promise.race([
        loadPipeline,
        timeoutPromise(MODEL_LOAD_TIMEOUT_MS, "Model loading"),
      ]);
    } catch (err) {
      transformerState.loadError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        `[semantic] Failed to load transformer model: ${transformerState.loadError.message}`
      );
      console.warn(`[semantic] Falling back to hash-based embeddings`);
    }
  })();

  await transformerState.loading;
  transformerState.loading = null;
  return transformerState.pipeline;
}

/**
 * Generate embedding using transformer model or hash fallback
 */
async function generateEmbedding(
  text: string,
  options: SemanticOptions = {}
): Promise<number[]> {
  const pipeline = await loadTransformerPipeline(options);

  if (!pipeline) {
    // Fallback to hash embedding
    if (options.fallback === "passthrough") {
      // Return empty embedding for passthrough mode
      return [];
    }
    return hashEmbedding(text);
  }

  try {
    // Use transformer for high-quality embeddings
    const output = await (pipeline as (text: string, options: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array }>)(
      text,
      { pooling: "mean", normalize: true }
    );
    return Array.from(output.data);
  } catch (err) {
    console.warn(`[semantic] Embedding generation failed, using hash fallback: ${err}`);
    return hashEmbedding(text);
  }
}

/**
 * Check if the transformer model is available
 */
export function isModelAvailable(): boolean {
  return transformerState.pipeline !== null;
}

/**
 * Check if model loading failed
 */
export function getModelError(): Error | null {
  return transformerState.loadError;
}

/**
 * Reset model state (useful for testing or forcing reload)
 */
export function resetModelState(): void {
  transformerState.pipeline = null;
  transformerState.loading = null;
  transformerState.loadError = null;
}

/**
 * Semantic rerank: reorder BM25 results using semantic similarity
 *
 * Two-stage pipeline:
 * 1. BM25 provides baseline results (fast, keyword-based)
 * 2. Semantic rerank reorders top N results by meaning similarity
 *
 * @param query - The search query
 * @param baseline - BM25 results with id, score, and text
 * @param options - Semantic options
 * @returns Reranked results
 */
export async function semanticRerank(
  query: string,
  baseline: RankedResult[],
  options: SemanticOptions = {}
): Promise<RankedResult[]> {
  const { topN = 10, fallback = "hash" } = options;

  // Nothing to rerank
  if (baseline.length === 0) {
    return baseline;
  }

  // Take top N for reranking, keep rest in original order
  const toRerank = baseline.slice(0, topN);
  const rest = baseline.slice(topN);

  // Check if we should use passthrough (no semantic enhancement)
  if (fallback === "passthrough" && !transformerState.pipeline && !transformerState.loading) {
    // Quick check if model can load
    const pipeline = await loadTransformerPipeline(options);
    if (!pipeline) {
      return baseline; // Return unchanged
    }
  }

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query, options);

  // If empty embedding (passthrough mode), return baseline
  if (queryEmbedding.length === 0) {
    return baseline;
  }

  // Normalize BM25 scores to [0, 1] range for fair combination with cosine similarity
  const maxBm25Score = Math.max(...toRerank.map((r) => r.score), 1);

  // Calculate semantic scores for top N
  const rerankedScores = await Promise.all(
    toRerank.map(async (result) => {
      const text = result.text || result.id;
      const docEmbedding = await generateEmbedding(text, options);

      if (docEmbedding.length === 0) {
        // Passthrough: keep original score
        return { ...result };
      }

      const semanticScore = cosineSimilarity(queryEmbedding, docEmbedding);

      // Normalize BM25 score to [0, 1] range
      const normalizedBm25 = result.score / maxBm25Score;

      // Combine normalized BM25 score with semantic score
      // BM25 provides recall, semantic provides precision
      // Weight: 40% BM25, 60% semantic (semantic is the refinement stage)
      const combinedScore = normalizedBm25 * 0.4 + semanticScore * 0.6;

      return {
        ...result,
        score: combinedScore,
      };
    })
  );

  // Sort reranked results by new score
  rerankedScores.sort((a, b) => b.score - a.score);

  // Combine reranked top N with rest
  return [...rerankedScores, ...rest];
}

/**
 * Semantic rerank using only hash embeddings (synchronous, no model loading)
 * Useful for quick reranking without network or model dependencies
 */
export function semanticRerankHash(
  query: string,
  baseline: RankedResult[]
): RankedResult[] {
  const topN = 10;

  if (baseline.length === 0) {
    return baseline;
  }

  const toRerank = baseline.slice(0, topN);
  const rest = baseline.slice(topN);

  const queryEmbedding = hashEmbedding(query);

  // Normalize BM25 scores to [0, 1] range for fair combination with cosine similarity
  const maxBm25Score = Math.max(...toRerank.map((r) => r.score), 1);

  const rerankedScores = toRerank.map((result) => {
    const text = result.text || result.id;
    const docEmbedding = hashEmbedding(text);
    const semanticScore = cosineSimilarity(queryEmbedding, docEmbedding);

    // Normalize BM25 score to [0, 1] range
    const normalizedBm25 = result.score / maxBm25Score;

    // Same weighting as full semantic rerank
    const combinedScore = normalizedBm25 * 0.4 + semanticScore * 0.6;

    return {
      ...result,
      score: combinedScore,
    };
  });

  rerankedScores.sort((a, b) => b.score - a.score);

  return [...rerankedScores, ...rest];
}

/**
 * Pre-warm the semantic model (call during idle time)
 */
export async function warmupModel(options: SemanticOptions = {}): Promise<boolean> {
  const pipeline = await loadTransformerPipeline(options);
  return pipeline !== null;
}
