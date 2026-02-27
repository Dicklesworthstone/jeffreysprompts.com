// packages/core/src/search/scorer.ts
// Single-pass search scorer — replaces BM25 as the primary ranking engine.
//
// Precomputed ScorerIndex: Set-based O(1) exact lookups, proportional prefix,
// Levenshtein fuzzy, phrase adjacency, acronym matching, exact-ID boost,
// and native synonym expansion (no BM25 needed).

import type { Prompt } from "../prompts/types";
import { tokenize, STOPWORDS } from "./tokenize";
import { expandQuery } from "./synonyms";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FIELD_WEIGHTS: Record<string, number> = {
  title: 10,
  id: 8,
  tags: 5,
  description: 3,
  content: 1,
};

const COVERAGE_BONUS = 1.3;
const SYNONYM_DISCOUNT = 0.5;
const ACRONYM_SCORE = 6;
const EXACT_ID_BONUS = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScorerField {
  name: string;
  tokens: string[];
  tokenSet: Set<string>;
  raw: string;
  weight: number;
}

interface ScorerPromptEntry {
  id: string;
  fields: ScorerField[];
  titleAcronym: string;  // "rmm" for "Robot Mode Maker"
  idNormalized: string;  // "ideawizard" for "idea-wizard"
}

export interface ScorerIndex {
  entries: ScorerPromptEntry[];
}

export interface ScorerResult {
  id: string;
  score: number;
  matchedFields: string[];
}

export interface ScorerSearchOptions {
  expandSynonyms?: boolean;
}

// ---------------------------------------------------------------------------
// Index building
// ---------------------------------------------------------------------------

function buildField(name: string, text: string, weight: number): ScorerField {
  const tokens = tokenize(text);
  return {
    name,
    tokens,
    tokenSet: new Set(tokens),
    raw: text.toLowerCase(),
    weight,
  };
}

export function buildScorerIndex(promptsList: Prompt[]): ScorerIndex {
  return {
    entries: promptsList.map((p): ScorerPromptEntry => {
      const titleWords = p.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/-/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 0 && !STOPWORDS.has(w));

      return {
        id: p.id,
        fields: [
          buildField("title", p.title, FIELD_WEIGHTS.title),
          buildField("id", p.id, FIELD_WEIGHTS.id),
          (() => {
            const tagTokens = p.tags.flatMap((t) => tokenize(t));
            return {
              name: "tags",
              tokens: tagTokens,
              tokenSet: new Set(tagTokens),
              raw: p.tags.join(" ").toLowerCase(),
              weight: FIELD_WEIGHTS.tags,
            };
          })(),
          buildField("description", p.description, FIELD_WEIGHTS.description),
          buildField("content", p.content, FIELD_WEIGHTS.content),
        ],
        titleAcronym: titleWords.map((w) => w[0]).join(""),
        idNormalized: p.id.replace(/-/g, ""),
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function editDistance(a: string, b: string, maxDist: number): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > maxDist) return maxDist + 1;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function fuzzyThreshold(len: number): number {
  if (len >= 7) return 2;
  if (len >= 4) return 1;
  return 0;
}

function prefixScore(queryLen: number, fieldTokenLen: number): number {
  return 0.3 + 0.65 * (queryLen / fieldTokenLen);
}

function isPrefixEligible(
  tokenLen: number,
  index: number,
  totalTokens: number,
): boolean {
  return index === totalTokens - 1 || tokenLen <= 3;
}

// ---------------------------------------------------------------------------
// Per-token scoring
// ---------------------------------------------------------------------------

interface TokenFieldResult {
  score: number;
  matchPos: number;
}

function scoreTokenField(
  qt: string,
  field: ScorerField,
  prefixEligible: boolean,
): TokenFieldResult {
  const w = field.weight;

  // 1. Exact — O(1) via Set
  if (field.tokenSet.has(qt)) {
    return { score: w, matchPos: field.tokens.indexOf(qt) };
  }

  // 2. Prefix (proportional)
  if (prefixEligible) {
    for (let k = 0; k < field.tokens.length; k++) {
      const ft = field.tokens[k];
      if (ft.length > qt.length && ft.startsWith(qt)) {
        return {
          score: w * prefixScore(qt.length, ft.length),
          matchPos: k,
        };
      }
    }
  }

  // 3. Fuzzy (Levenshtein)
  const maxDist = fuzzyThreshold(qt.length);
  if (maxDist > 0) {
    for (let k = 0; k < field.tokens.length; k++) {
      const ft = field.tokens[k];
      if (editDistance(qt, ft, maxDist) <= maxDist) {
        return { score: w * 0.4, matchPos: k };
      }
    }
  }

  // 4. Substring
  if (field.raw.includes(qt)) {
    return { score: w * 0.2, matchPos: -1 };
  }

  return { score: 0, matchPos: -1 };
}

// ---------------------------------------------------------------------------
// Per-prompt scoring
// ---------------------------------------------------------------------------

function scoreEntry(
  entry: ScorerPromptEntry,
  queryTokens: string[],
  synonymOnlyTokens: Set<string>,
  rawQueryNormalized: string,
): ScorerResult | null {
  let totalScore = 0;
  let allOriginalMatched = true;
  const matchedFieldSet = new Set<string>();
  const fieldPositions = new Map<string, number[]>();

  for (let i = 0; i < queryTokens.length; i++) {
    const qt = queryTokens[i];
    const isSynonym = synonymOnlyTokens.has(qt);
    const discount = isSynonym ? SYNONYM_DISCOUNT : 1.0;
    const prefixElig = isPrefixEligible(qt.length, i, queryTokens.length);

    let bestScore = 0;
    let bestField: string | null = null;
    let bestPos = -1;

    for (const field of entry.fields) {
      const r = scoreTokenField(qt, field, prefixElig);
      if (r.score > 0) {
        matchedFieldSet.add(field.name);
      }
      if (r.score > bestScore) {
        bestScore = r.score;
        bestField = field.name;
        bestPos = r.matchPos;
      }
    }

    if (bestScore > 0) {
      totalScore += bestScore * discount;
      if (bestField !== null && bestPos >= 0) {
        let positions = fieldPositions.get(bestField);
        if (!positions) {
          positions = [];
          fieldPositions.set(bestField, positions);
        }
        positions.push(bestPos);
      }
    } else if (!isSynonym) {
      allOriginalMatched = false;
    }
  }

  // Exact-ID boost: query (ignoring hyphens/spaces) === prompt ID
  if (
    rawQueryNormalized.length > 0 &&
    rawQueryNormalized === entry.idNormalized
  ) {
    totalScore += EXACT_ID_BONUS;
    matchedFieldSet.add("id");
  }

  // Acronym match: query letters === first letters of title words
  if (
    rawQueryNormalized.length >= 2 &&
    rawQueryNormalized === entry.titleAcronym
  ) {
    totalScore += ACRONYM_SCORE;
    matchedFieldSet.add("title");
  }

  if (totalScore === 0) return null;

  // Coverage bonus (only count original non-synonym tokens)
  const originalCount = queryTokens.filter(
    (t) => !synonymOnlyTokens.has(t),
  ).length;
  if (allOriginalMatched && originalCount > 1) {
    totalScore *= COVERAGE_BONUS;
  }

  // Phrase bonus: consecutive query tokens at consecutive field positions
  for (const [fieldName, positions] of fieldPositions) {
    if (positions.length < 2) continue;
    positions.sort((a, b) => a - b);
    const fw = FIELD_WEIGHTS[fieldName] ?? 1;
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] === positions[i - 1] + 1) {
        totalScore += fw * 0.5;
      }
    }
  }

  return {
    id: entry.id,
    score: totalScore,
    matchedFields: [...matchedFieldSet],
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search the scorer index. Handles synonym expansion internally.
 */
export function searchScorerIndex(
  index: ScorerIndex,
  query: string,
  options: ScorerSearchOptions = {},
): ScorerResult[] {
  const rawTokens = [...new Set(tokenize(query))];

  // Normalized query for exact-ID and acronym matching
  const rawQueryNormalized = query
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  // Handle pure acronym/ID queries that tokenize drops (e.g., single chars)
  if (rawTokens.length === 0) {
    if (rawQueryNormalized.length === 0) return [];
    // Still check acronym + exact-ID even if tokenize produced nothing
    const results: ScorerResult[] = [];
    for (const entry of index.entries) {
      let score = 0;
      const matchedFields: string[] = [];
      if (rawQueryNormalized === entry.idNormalized) {
        score += EXACT_ID_BONUS;
        matchedFields.push("id");
      }
      if (
        rawQueryNormalized.length >= 2 &&
        rawQueryNormalized === entry.titleAcronym
      ) {
        score += ACRONYM_SCORE;
        matchedFields.push("title");
      }
      if (score > 0) results.push({ id: entry.id, score, matchedFields });
    }
    return results.sort((a, b) => b.score - a.score);
  }

  // Synonym expansion
  const synonymOnlyTokens = new Set<string>();
  let allTokens = rawTokens;
  if (options.expandSynonyms) {
    const expanded = [...new Set(expandQuery(rawTokens))];
    const originalSet = new Set(rawTokens);
    for (const t of expanded) {
      if (!originalSet.has(t)) synonymOnlyTokens.add(t);
    }
    allTokens = expanded;
  }

  const results: ScorerResult[] = [];
  for (const entry of index.entries) {
    const result = scoreEntry(
      entry,
      allTokens,
      synonymOnlyTokens,
      rawQueryNormalized,
    );
    if (result) results.push(result);
  }
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Score a single prompt (convenience, builds temporary index).
 */
export function scorePrompt(
  prompt: Prompt,
  query: string,
): ScorerResult | null {
  const idx = buildScorerIndex([prompt]);
  const results = searchScorerIndex(idx, query);
  return results[0] ?? null;
}

/**
 * Score all prompts (convenience wrapper).
 */
export function scoreAll(
  promptsList: Prompt[],
  query: string,
): ScorerResult[] {
  const idx = buildScorerIndex(promptsList);
  return searchScorerIndex(idx, query);
}
