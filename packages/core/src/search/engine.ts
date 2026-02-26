// packages/core/src/search/engine.ts
// Composite search engine combining multi-signal scorer with BM25 tiebreaker

import type { Prompt } from "../prompts/types";
import { prompts, promptsById } from "../prompts/registry";
import { buildIndex, search as bm25Search, type BM25Index } from "./bm25";
import { tokenize } from "./tokenize";
import { expandQuery } from "./synonyms";
import { scorePrompt } from "./scorer";

export interface SearchResult {
  prompt: Prompt;
  score: number;
  matchedFields: string[];
}

export interface SearchOptions {
  limit?: number;
  category?: string;
  tags?: string[];
  expandSynonyms?: boolean;
  index?: BM25Index;
  promptsMap?: Map<string, Prompt>;
}

// Lazy-initialized index
let _index: BM25Index | null = null;

function getIndex(): BM25Index {
  if (!_index) {
    _index = buildIndex(prompts);
  }
  return _index;
}

/**
 * Reset the search index (call when prompts change)
 */
export function resetIndex(): void {
  _index = null;
}

/** Blend weights: multi-signal dominates, BM25 is tiebreaker */
const MULTI_SIGNAL_WEIGHT = 0.9;
const BM25_WEIGHT = 0.1;

/**
 * Search prompts with multi-signal scorer + BM25 tiebreaker.
 *
 * The scorer does prefix/substring/exact matching against each field,
 * so partial queries like "rob" match "robot" immediately. BM25 serves
 * as a tiebreaker for results with equal multi-signal scores.
 */
export function searchPrompts(
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  const {
    limit = 20,
    category,
    tags,
    expandSynonyms = true,
    index = getIndex(),
    promptsMap = promptsById,
  } = options;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  let searchTokens = queryTokens;
  if (expandSynonyms) {
    searchTokens = expandQuery(queryTokens);
  }

  // --- BM25 scores (keyed by id) ---
  const bm25Results = bm25Search(index, searchTokens);
  const bm25Scores = new Map<string, number>();
  let bm25Max = 0;
  for (const { id, score } of bm25Results) {
    bm25Scores.set(id, score);
    if (score > bm25Max) bm25Max = score;
  }

  // --- Multi-signal scores + merge ---
  const allPrompts = [...promptsMap.values()];
  const merged = new Map<
    string,
    { multiSignal: number; bm25: number; matchedFields: string[] }
  >();

  let multiMax = 0;
  for (const prompt of allPrompts) {
    const sr = scorePrompt(prompt, query);
    const ms = sr?.score ?? 0;
    const bm = bm25Scores.get(prompt.id) ?? 0;

    if (ms === 0 && bm === 0) continue;

    if (ms > multiMax) multiMax = ms;

    merged.set(prompt.id, {
      multiSignal: ms,
      bm25: bm,
      matchedFields: sr?.matchedFields ?? [],
    });
  }

  // Also include BM25-only hits (no multi-signal match)
  for (const { id } of bm25Results) {
    if (!merged.has(id)) {
      merged.set(id, { multiSignal: 0, bm25: bm25Scores.get(id)!, matchedFields: [] });
    }
  }

  // Normalize and combine
  const safeMultiMax = multiMax || 1;
  const safeBm25Max = bm25Max || 1;

  const scored: Array<{ id: string; score: number; matchedFields: string[] }> = [];
  for (const [id, { multiSignal, bm25, matchedFields }] of merged) {
    const normalizedMS = multiSignal / safeMultiMax;
    const normalizedBM = bm25 / safeBm25Max;
    const finalScore =
      normalizedMS * MULTI_SIGNAL_WEIGHT + normalizedBM * BM25_WEIGHT;

    scored.push({ id, score: finalScore, matchedFields });
  }

  scored.sort((a, b) => b.score - a.score);

  // Filter and limit
  const results: SearchResult[] = [];
  for (const { id, score, matchedFields } of scored) {
    if (results.length >= limit) break;

    const prompt = promptsMap.get(id);
    if (!prompt) continue;

    if (category && prompt.category !== category) continue;
    if (tags?.length && !tags.some((tag) => prompt.tags.includes(tag))) continue;

    // Enrich matchedFields with BM25 field matches if scorer didn't find them
    if (matchedFields.length === 0) {
      const searchableFields: Record<string, string> = {
        id: prompt.id.toLowerCase(),
        title: prompt.title.toLowerCase(),
        description: prompt.description.toLowerCase(),
        tags: prompt.tags.join(" ").toLowerCase(),
        content: prompt.content.toLowerCase(),
      };
      for (const term of searchTokens) {
        for (const [fieldName, content] of Object.entries(searchableFields)) {
          if (!matchedFields.includes(fieldName) && content.includes(term)) {
            matchedFields.push(fieldName);
          }
        }
      }
    }

    results.push({ prompt, score, matchedFields });
  }

  return results;
}

/**
 * Quick search for autocomplete (lighter weight)
 */
export function quickSearch(query: string, limit: number = 5): Prompt[] {
  if (!query.trim()) return [];
  return searchPrompts(query, { limit, expandSynonyms: false }).map((r) => r.prompt);
}
