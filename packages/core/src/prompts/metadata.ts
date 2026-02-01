// packages/core/src/prompts/metadata.ts
// Deterministic metadata suggestions + duplicate detection

import type { Prompt, PromptCategory } from "./types";
import { hashEmbedding, cosineSimilarity } from "../search/semantic";
import { tokenize } from "../search/tokenize";

export interface SimilarPrompt {
  prompt: Prompt;
  score: number;
  sharedTags: string[];
  sharedTokens: string[];
  titleMatch: boolean;
}

export interface TagSuggestion {
  tag: string;
  score: number;
  reasons: string[];
}

export interface CategorySuggestion {
  category: PromptCategory;
  score: number;
  reasons: string[];
}

export interface DescriptionSuggestion {
  description: string;
  reason: string;
}

export interface MetadataSuggestions {
  promptId: string;
  similar: SimilarPrompt[];
  tags: TagSuggestion[];
  categories: CategorySuggestion[];
  descriptions: DescriptionSuggestion[];
}

export interface DuplicateCandidate {
  promptA: Prompt;
  promptB: Prompt;
  score: number;
  reasons: string[];
  sharedTags: string[];
  sharedTokens: string[];
  titleMatch: boolean;
}

export interface MetadataOptions {
  maxSimilar?: number;
  maxTagSuggestions?: number;
  maxCategorySuggestions?: number;
  maxDescriptionSuggestions?: number;
  similarityThreshold?: number;
  tagMappings?: Record<string, string>;
}

export interface DuplicateOptions {
  minScore?: number;
  maxPairs?: number;
  tagMappings?: Record<string, string>;
}

const DEFAULTS = {
  maxSimilar: 5,
  maxTagSuggestions: 6,
  maxCategorySuggestions: 3,
  maxDescriptionSuggestions: 3,
  similarityThreshold: 0.35,
} as const;

const DUPLICATE_DEFAULTS = {
  minScore: 0.85,
  maxPairs: 50,
} as const;

function normalizeTagMappings(
  tagMappings?: Record<string, string>
): Record<string, string> | null {
  if (!tagMappings) return null;
  const normalized: Record<string, string> = {};
  for (const [alias, canonical] of Object.entries(tagMappings)) {
    if (!alias || !canonical) continue;
    normalized[alias.toLowerCase()] = canonical.toLowerCase();
  }
  return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeTag(
  tag: string,
  tagMappings: Record<string, string> | null
): string {
  if (!tagMappings) return tag;
  const mapped = tagMappings[tag.toLowerCase()];
  return mapped ?? tag;
}

function normalizeTags(
  tags: string[],
  tagMappings: Record<string, string> | null
): string[] {
  if (!tagMappings) return tags;
  return unique(tags.map((tag) => normalizeTag(tag, tagMappings)));
}

function buildPromptText(prompt: Prompt): string {
  return [prompt.title, prompt.description, prompt.content, prompt.tags.join(" ")]
    .filter(Boolean)
    .join("\n");
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function intersection(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return unique(a.filter((item) => setB.has(item)));
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersectionCount = 0;
  for (const item of setA) {
    if (setB.has(item)) intersectionCount += 1;
  }
  const unionCount = new Set([...setA, ...setB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

function getEmbedding(prompt: Prompt, cache: Map<string, number[]>): number[] {
  const cached = cache.get(prompt.id);
  if (cached) return cached;
  const embedding = hashEmbedding(buildPromptText(prompt));
  cache.set(prompt.id, embedding);
  return embedding;
}

function summarizeText(text: string, maxLength: number = 140): string | null {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLength) return trimmed;
  const truncated = trimmed.slice(0, maxLength + 1);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 40) {
    return `${truncated.slice(0, lastSpace)}...`;
  }
  return `${trimmed.slice(0, maxLength)}...`;
}

function deriveDescription(prompt: Prompt, topTags: string[]): string | null {
  const summary = summarizeText(prompt.content);
  if (summary) return summary;
  if (topTags.length > 0) {
    return `${prompt.title} - ${topTags.slice(0, 3).join(", ")}`;
  }
  return null;
}

function analyzeSimilarity(
  base: Prompt,
  candidate: Prompt,
  cache: Map<string, number[]>,
  tagMappings: Record<string, string> | null
): SimilarPrompt {
  const embeddingA = getEmbedding(base, cache);
  const embeddingB = getEmbedding(candidate, cache);
  const contentScore = cosineSimilarity(embeddingA, embeddingB);

  const titleTokensA = tokenize(base.title);
  const titleTokensB = tokenize(candidate.title);
  const titleOverlap = jaccard(titleTokensA, titleTokensB);

  const baseTags = normalizeTags(base.tags, tagMappings);
  const candidateTags = normalizeTags(candidate.tags, tagMappings);
  const sharedTags = intersection(baseTags, candidateTags);
  const tagOverlap = jaccard(baseTags, candidateTags);

  const sharedTokens = intersection(
    tokenize(buildPromptText(base)),
    tokenize(buildPromptText(candidate))
  ).slice(0, 8);

  const titleMatch = normalizeTitle(base.title) === normalizeTitle(candidate.title);

  let score = contentScore * 0.7 + tagOverlap * 0.2 + titleOverlap * 0.1;
  score = Math.max(score, contentScore);
  if (titleMatch) {
    score = Math.max(score, 0.98);
  }

  if (score > 1) score = 1;

  return {
    prompt: candidate,
    score,
    sharedTags,
    sharedTokens,
    titleMatch,
  };
}

export function findSimilarPrompts(
  prompt: Prompt,
  prompts: Prompt[],
  options: MetadataOptions = {}
): SimilarPrompt[] {
  const settings = { ...DEFAULTS, ...options };
  const tagMappings = normalizeTagMappings(settings.tagMappings);
  const cache = new Map<string, number[]>();

  const results = prompts
    .filter((candidate) => candidate.id !== prompt.id)
    .map((candidate) => analyzeSimilarity(prompt, candidate, cache, tagMappings))
    .filter((result) => result.score >= settings.similarityThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, settings.maxSimilar);

  return results;
}

export function suggestPromptMetadata(
  prompt: Prompt,
  prompts: Prompt[],
  options: MetadataOptions = {}
): MetadataSuggestions {
  const settings = { ...DEFAULTS, ...options };
  const tagMappings = normalizeTagMappings(settings.tagMappings);
  const similar = findSimilarPrompts(prompt, prompts, settings);

  const tagScores = new Map<string, number>();
  const baseTags = new Set(normalizeTags(prompt.tags, tagMappings));
  const tagCounts = new Map<string, number>();
  for (const item of similar) {
    for (const tag of normalizeTags(item.prompt.tags, tagMappings)) {
      if (baseTags.has(tag)) continue;
      tagScores.set(tag, (tagScores.get(tag) ?? 0) + item.score);
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const tags: TagSuggestion[] = [...tagScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, settings.maxTagSuggestions)
    .map(([tag, score]) => ({
      tag,
      score,
      reasons: [`Appears in ${tagCounts.get(tag) ?? 0} similar prompts`],
    }));

  const categoryScores = new Map<PromptCategory, number>();
  for (const item of similar) {
    categoryScores.set(
      item.prompt.category,
      (categoryScores.get(item.prompt.category) ?? 0) + item.score
    );
  }

  const categories: CategorySuggestion[] = [...categoryScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, settings.maxCategorySuggestions)
    .map(([category, score]) => ({
      category,
      score,
      reasons: [`Matches ${similar.filter((item) => item.prompt.category === category).length} similar prompts`],
    }));

  const descriptions: DescriptionSuggestion[] = [];
  const topTags = tags.map((t) => t.tag);

  const derived = deriveDescription(prompt, topTags);
  if (derived) {
    descriptions.push({
      description: derived,
      reason: "Derived from prompt content and top tags",
    });
  }

  const topSimilar = similar[0]?.prompt;
  if (topSimilar?.description) {
    descriptions.push({
      description: topSimilar.description,
      reason: `Matches description style from similar prompt "${topSimilar.title}"`,
    });
  }

  const uniqueDescriptions = unique(descriptions.map((item) => item.description))
    .slice(0, settings.maxDescriptionSuggestions)
    .map((description) => descriptions.find((item) => item.description === description)!)
    .filter(Boolean);

  return {
    promptId: prompt.id,
    similar,
    tags,
    categories,
    descriptions: uniqueDescriptions,
  };
}

export function findDuplicateCandidates(
  prompts: Prompt[],
  options: DuplicateOptions = {}
): DuplicateCandidate[] {
  const settings = { ...DUPLICATE_DEFAULTS, ...options };
  const tagMappings = normalizeTagMappings(settings.tagMappings);
  const cache = new Map<string, number[]>();
  const results: DuplicateCandidate[] = [];

  for (let i = 0; i < prompts.length; i += 1) {
    for (let j = i + 1; j < prompts.length; j += 1) {
      const a = prompts[i];
      const b = prompts[j];
      const similarity = analyzeSimilarity(a, b, cache, tagMappings);

      if (similarity.score < settings.minScore && !similarity.titleMatch) {
        continue;
      }

      const reasons: string[] = [];
      if (similarity.titleMatch) {
        reasons.push("Titles normalize to the same text");
      }
      if (similarity.sharedTags.length > 0) {
        reasons.push(`Shared tags: ${similarity.sharedTags.slice(0, 3).join(", ")}`);
      }
      if (similarity.sharedTokens.length > 0) {
        reasons.push(`Shared tokens: ${similarity.sharedTokens.slice(0, 5).join(", ")}`);
      }

      results.push({
        promptA: a,
        promptB: b,
        score: similarity.score,
        reasons,
        sharedTags: similarity.sharedTags,
        sharedTokens: similarity.sharedTokens,
        titleMatch: similarity.titleMatch,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, settings.maxPairs);
}
