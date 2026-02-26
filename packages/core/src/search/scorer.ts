// packages/core/src/search/scorer.ts
// Multi-signal scorer for Algolia-style instant prefix search

import type { Prompt } from "../prompts/types";
import { tokenize } from "./tokenize";

/** Field weights ordered by user scanning priority */
export const FIELD_WEIGHTS: Record<string, number> = {
  title: 10,
  id: 8,
  tags: 5,
  description: 3,
  content: 1,
};

/** Score multiplier when all query tokens match at least one field */
const COVERAGE_BONUS = 1.2;

export interface ScorerResult {
  id: string;
  score: number;
  matchedFields: string[];
}

/**
 * Determine whether a query token should be treated as a prefix.
 * - The last token is always prefix-eligible (user is still typing)
 * - Short tokens (<=3 chars) are prefix-eligible at any position
 */
function isPrefixEligible(
  token: string,
  index: number,
  totalTokens: number
): boolean {
  return index === totalTokens - 1 || token.length <= 3;
}

/**
 * Score a single query token against a single field.
 * Returns the best match type score (exact > prefix > substring > 0).
 */
function scoreTokenField(
  queryToken: string,
  fieldTokens: string[],
  fieldRaw: string,
  fieldWeight: number,
  prefixEligible: boolean
): number {
  // 1. Exact word match
  if (fieldTokens.includes(queryToken)) {
    return fieldWeight * 1.0;
  }

  // 2. Prefix match (doc token starts with query token)
  if (prefixEligible) {
    for (const ft of fieldTokens) {
      if (ft.startsWith(queryToken)) {
        return fieldWeight * 0.7;
      }
    }
  }

  // 3. Substring match (raw field text contains query token)
  if (fieldRaw.includes(queryToken)) {
    return fieldWeight * 0.4;
  }

  return 0;
}

/**
 * Score a prompt against a query using multi-signal matching.
 * Returns null if no signals match (score === 0).
 */
export function scorePrompt(prompt: Prompt, query: string): ScorerResult | null {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return null;

  // Pre-tokenize and lowercase each field once
  const fields: Array<{
    name: string;
    tokens: string[];
    raw: string;
    weight: number;
  }> = [
    {
      name: "title",
      tokens: tokenize(prompt.title),
      raw: prompt.title.toLowerCase(),
      weight: FIELD_WEIGHTS.title,
    },
    {
      name: "id",
      tokens: tokenize(prompt.id),
      raw: prompt.id.toLowerCase(),
      weight: FIELD_WEIGHTS.id,
    },
    {
      name: "tags",
      tokens: prompt.tags.flatMap((t) => tokenize(t)),
      raw: prompt.tags.join(" ").toLowerCase(),
      weight: FIELD_WEIGHTS.tags,
    },
    {
      name: "description",
      tokens: tokenize(prompt.description),
      raw: prompt.description.toLowerCase(),
      weight: FIELD_WEIGHTS.description,
    },
    {
      name: "content",
      tokens: tokenize(prompt.content),
      raw: prompt.content.toLowerCase(),
      weight: FIELD_WEIGHTS.content,
    },
  ];

  let totalScore = 0;
  let allTokensMatched = true;
  const matchedFieldSet = new Set<string>();

  for (let i = 0; i < queryTokens.length; i++) {
    const qt = queryTokens[i];
    const prefixEligible = isPrefixEligible(qt, i, queryTokens.length);

    // Find best score across all fields for this query token,
    // and collect ALL fields that matched (for matchedFields output)
    let bestScore = 0;

    for (const field of fields) {
      const s = scoreTokenField(
        qt,
        field.tokens,
        field.raw,
        field.weight,
        prefixEligible
      );
      if (s > 0) {
        matchedFieldSet.add(field.name);
        if (s > bestScore) {
          bestScore = s;
        }
      }
    }

    if (bestScore > 0) {
      totalScore += bestScore;
    } else {
      allTokensMatched = false;
    }
  }

  if (totalScore === 0) return null;

  // Coverage bonus: reward when every query token matched something
  if (allTokensMatched && queryTokens.length > 1) {
    totalScore *= COVERAGE_BONUS;
  }

  return {
    id: prompt.id,
    score: totalScore,
    matchedFields: [...matchedFieldSet],
  };
}

/**
 * Score all prompts against a query, returning scored results sorted descending.
 */
export function scoreAll(
  promptsList: Prompt[],
  query: string
): ScorerResult[] {
  const results: ScorerResult[] = [];

  for (const prompt of promptsList) {
    const result = scorePrompt(prompt, query);
    if (result) {
      results.push(result);
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
