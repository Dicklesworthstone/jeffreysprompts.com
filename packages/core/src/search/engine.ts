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

    // Apply tags filter (match any)
    if (tags?.length && !tags.some((tag) => prompt.tags.includes(tag))) {
      return false;
    }

    return true;
  });

  // 2. Slice FIRST to avoid expensive tokenization on results we won't show
  const topMatches = filteredMatches.slice(0, limit);

  // 3. Map to full results with basic field matching info
  const results: SearchResult[] = topMatches.flatMap(({ id, score }) => {
    const prompt = promptsMap.get(id);
    if (!prompt) return [];

    // Quickly determine which fields matched the query tokens
    const matchedFields: string[] = [];
    const searchableFields = {
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
