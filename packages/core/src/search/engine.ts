// packages/core/src/search/engine.ts
// Search engine: thin filter layer over the precomputed multi-signal scorer.
// BM25 is no longer in the hot path — the scorer handles exact, prefix,
// fuzzy, substring, synonym, acronym, and phrase matching natively.

import type { Prompt } from "../prompts/types";
import { prompts, promptsById } from "../prompts/registry";
import {
  buildScorerIndex,
  searchScorerIndex,
  type ScorerIndex,
} from "./scorer";

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
  promptsMap?: Map<string, Prompt>;
  scorerIndex?: ScorerIndex;
}

// Lazy-initialized scorer index
let _scorerIndex: ScorerIndex | null = null;

function getScorerIndex(): ScorerIndex {
  if (!_scorerIndex) {
    _scorerIndex = buildScorerIndex(prompts);
  }
  return _scorerIndex;
}

/**
 * Reset the search index (call when prompts change)
 */
export function resetIndex(): void {
  _scorerIndex = null;
}

/**
 * Search prompts with multi-signal scorer.
 *
 * Handles prefix, fuzzy, exact, substring, synonym, acronym, and phrase
 * matching in a single precomputed index pass. No BM25 needed.
 */
export function searchPrompts(
  query: string,
  options: SearchOptions = {},
): SearchResult[] {
  const {
    limit = 20,
    category,
    tags,
    expandSynonyms = true,
    promptsMap = promptsById,
    scorerIndex = getScorerIndex(),
  } = options;

  const scored = searchScorerIndex(scorerIndex, query, { expandSynonyms });

  // Filter by category/tags and enforce limit
  const results: SearchResult[] = [];
  for (const { id, score, matchedFields } of scored) {
    if (results.length >= limit) break;

    const prompt = promptsMap.get(id);
    if (!prompt) continue;

    if (category && prompt.category !== category) continue;
    if (tags?.length && !tags.some((tag) => prompt.tags.includes(tag)))
      continue;

    results.push({ prompt, score, matchedFields });
  }

  return results;
}

/**
 * Quick search for autocomplete (lighter weight)
 */
export function quickSearch(query: string, limit: number = 5): Prompt[] {
  if (!query.trim()) return [];
  return searchPrompts(query, { limit, expandSynonyms: false }).map(
    (r) => r.prompt,
  );
}
