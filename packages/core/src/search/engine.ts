// packages/core/src/search/engine.ts
// Composite search engine combining BM25 with optional semantic reranking

import type { Prompt } from "../prompts/types";
import { prompts, getPrompt, promptsById } from "../prompts/registry";
import { buildIndex, search as bm25Search, type BM25Index } from "./bm25";
import { tokenize } from "./tokenize";
import { expandQuery } from "./synonyms";

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

/**
 * Search prompts with BM25
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

  // Optionally expand query with synonyms
  const queryTokens = tokenize(query);
  let searchTokens = queryTokens;
  if (expandSynonyms) {
    searchTokens = expandQuery(queryTokens);
  }

  // Pass tokens directly to avoid re-tokenization
  // We request ALL matches (no limit) so we can filter by category/tags correctly
  const bm25Results = bm25Search(index, searchTokens);

  // 1. Filter first (cheaper than mapping/highlighting)
  const filteredMatches = bm25Results.filter(({ id }) => {
    const prompt = promptsMap.get(id);
    if (!prompt) return false;

    // Apply category filter
    if (category && prompt.category !== category) return false;

    // Apply tags filter (match all)
    if (tags?.length && !tags.every((tag) => prompt.tags.includes(tag))) {
      return false;
    }

    return true;
  });

  // 2. Slice FIRST to avoid expensive tokenization on results we won't show
  const topMatches = filteredMatches.slice(0, limit);

  // 3. Map to full results with highlighting (only for survivors)
  // Use flatMap to safely handle any edge case where prompt might be missing
  const results: SearchResult[] = topMatches.flatMap(({ id, score }) => {
    const prompt = promptsMap.get(id);
    // Defensive: skip if prompt somehow doesn't exist (shouldn't happen due to filter)
    if (!prompt) return [];

    // Determine which fields matched (check both original query and expanded synonyms)
    const matchedFields: string[] = [];

    // Tokenize fields for accurate matching (aligns with BM25 logic)
    // We use a Set for O(1) lookups during the check
    const idTokens = new Set(tokenize(prompt.id));
    const titleTokens = new Set(tokenize(prompt.title));
    const descTokens = new Set(tokenize(prompt.description));
    const tagTokens = new Set(prompt.tags.flatMap(t => tokenize(t)));
    // Content is large, so we tokenize it lazily or just iterate if needed
    // But for consistency and performance on small prompts, tokenizing is fine
    const contentTokens = new Set(tokenize(prompt.content));

    // Check if any search term matches any token in the field
    for (const term of searchTokens) {
      if (!matchedFields.includes("id") && idTokens.has(term)) {
        matchedFields.push("id");
      }
      if (!matchedFields.includes("title") && titleTokens.has(term)) {
        matchedFields.push("title");
      }
      if (!matchedFields.includes("description") && descTokens.has(term)) {
        matchedFields.push("description");
      }
      if (!matchedFields.includes("tags") && tagTokens.has(term)) {
        matchedFields.push("tags");
      }
      if (!matchedFields.includes("content") && contentTokens.has(term)) {
        matchedFields.push("content");
      }
    }

    return [{ prompt, score, matchedFields }];
  });

  return results;
}

/**
 * Quick search for autocomplete (lighter weight)
 */
export function quickSearch(query: string, limit: number = 5): Prompt[] {
  if (!query.trim()) return [];
  return searchPrompts(query, { limit, expandSynonyms: false }).map((r) => r.prompt);
}
