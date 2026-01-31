// packages/core/src/search/recommendations.ts
// Personalized recommendations for core Prompt registry

import type { Prompt } from "../prompts/types";

const CONFIG = {
  tagWeight: 0.6,
  categoryWeight: 0.2,
  authorWeight: 0.1,
  featuredWeight: 0.1,
  maxRecommendations: 10,
  signalWeights: {
    save: 2,
    run: 1.5,
    view: 1,
  },
  recencyHalfLifeDays: 21,
  preferenceTagBoost: 0.9,
  preferenceCategoryBoost: 0.6,
} as const;

export type RecommendationSignalKind = "view" | "save" | "run";
type RecommendationSourceKind = RecommendationSignalKind | "preference";

export interface RecommendationSignal {
  prompt: Prompt;
  kind: RecommendationSignalKind;
  occurredAt?: string;
  weight?: number;
}

export interface RecommendationPreferences {
  tags?: string[];
  categories?: string[];
  excludeTags?: string[];
  excludeCategories?: string[];
}

export interface RecommendationResult {
  prompt: Prompt;
  score: number;
  reasons: string[];
}

function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim();
}

function addWeight(map: Map<string, number>, key: string, weight: number): void {
  map.set(key, (map.get(key) ?? 0) + weight);
}

function addSourceWeight(
  map: Map<string, Map<RecommendationSourceKind, number>>,
  key: string,
  source: RecommendationSourceKind,
  weight: number
): void {
  const bucket = map.get(key) ?? new Map<RecommendationSourceKind, number>();
  bucket.set(source, (bucket.get(source) ?? 0) + weight);
  map.set(key, bucket);
}

function getRecencyWeight(occurredAt?: string): number {
  if (!occurredAt) return 1;
  const timestamp = new Date(occurredAt).getTime();
  if (!Number.isFinite(timestamp)) return 1;
  const ageDays = Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  const decay = Math.LN2 / CONFIG.recencyHalfLifeDays;
  return Math.exp(-decay * ageDays);
}

function getSignalWeight(signal: RecommendationSignal): number {
  const base = CONFIG.signalWeights[signal.kind] ?? 1;
  const recency = getRecencyWeight(signal.occurredAt);
  const extra = signal.weight ?? 1;
  return base * recency * extra;
}

function normalizeSignals(
  input: Array<Prompt | RecommendationSignal> | undefined,
  fallbackKind: RecommendationSignalKind
): RecommendationSignal[] {
  if (!input?.length) return [];
  return input.map((item) => {
    if ("prompt" in item) {
      return {
        prompt: item.prompt,
        kind: item.kind ?? fallbackKind,
        occurredAt: item.occurredAt,
        weight: item.weight,
      };
    }
    return { prompt: item, kind: fallbackKind };
  });
}

function pickTopSource(
  sources: Map<RecommendationSourceKind, number> | undefined
): RecommendationSourceKind | null {
  if (!sources || sources.size === 0) return null;
  let top: RecommendationSourceKind | null = null;
  let topWeight = -Infinity;
  for (const [source, weight] of sources) {
    if (weight > topWeight) {
      top = source;
      topWeight = weight;
    }
  }
  return top;
}

function tagReason(source: RecommendationSourceKind | null, tags: string[]): string {
  const label = tags.slice(0, 3).join(", ");
  switch (source) {
    case "save":
      return `Because you saved prompts tagged: ${label}`;
    case "run":
      return `Based on prompts you've run: ${label}`;
    case "view":
      return `Based on recent views: ${label}`;
    case "preference":
      return `Matches your preferences: ${label}`;
    default:
      return `Matches your interests: ${label}`;
  }
}

function categoryReason(source: RecommendationSourceKind | null, category: string): string {
  switch (source) {
    case "save":
      return `Because you saved prompts in ${category}`;
    case "run":
      return `Based on runs in ${category}`;
    case "view":
      return `Based on recent views in ${category}`;
    case "preference":
      return `Preferred category: ${category}`;
    default:
      return `In a category you like: ${category}`;
  }
}

function calculateTagSimilarity(tagsA: string[], tagsB: string[]): number {
  const setA = new Set(tagsA.map((t) => t.toLowerCase()));
  const setB = new Set(tagsB.map((t) => t.toLowerCase()));

  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const tag of setA) {
    if (setB.has(tag)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function calculateFeaturedScore(prompt: Prompt): number {
  return prompt.featured ? 1 : 0;
}

export function getRelatedRecommendations(
  sourcePrompt: Prompt,
  allPrompts: Prompt[],
  options?: {
    limit?: number;
    excludeIds?: string[];
    minScore?: number;
  }
): RecommendationResult[] {
  const limit = options?.limit ?? CONFIG.maxRecommendations;
  const excludeIds = new Set([sourcePrompt.id, ...(options?.excludeIds ?? [])]);

  const recommendations: RecommendationResult[] = [];

  for (const candidate of allPrompts) {
    if (excludeIds.has(candidate.id)) continue;

    const reasons: string[] = [];
    let score = 0;

    const tagSimilarity = calculateTagSimilarity(sourcePrompt.tags, candidate.tags);
    if (tagSimilarity > 0) {
      score += tagSimilarity * CONFIG.tagWeight;
      const commonTags = sourcePrompt.tags.filter((t) =>
        candidate.tags.map((ct) => ct.toLowerCase()).includes(t.toLowerCase())
      );
      if (commonTags.length > 0) {
        reasons.push(`Similar tags: ${commonTags.slice(0, 3).join(", ")}`);
      }
    }

    if (candidate.category === sourcePrompt.category) {
      score += CONFIG.categoryWeight;
      reasons.push(`Same category: ${candidate.category}`);
    }

    if (candidate.author === sourcePrompt.author) {
      score += CONFIG.authorWeight;
      reasons.push(`By the same author: ${candidate.author}`);
    }

    const featuredScore = calculateFeaturedScore(candidate);
    if (featuredScore > 0) {
      score += featuredScore * CONFIG.featuredWeight;
      reasons.push("Featured prompt");
    }

    if (score > (options?.minScore ?? 0)) {
      recommendations.push({ prompt: candidate, score, reasons });
    }
  }

  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, limit);
}

export function getRecommendationsFromHistory(
  sourcePrompts: Array<Prompt | RecommendationSignal>,
  allPrompts: Prompt[],
  options?: {
    limit?: number;
    excludeIds?: string[];
    preferences?: RecommendationPreferences;
  }
): RecommendationResult[] {
  const limit = options?.limit ?? CONFIG.maxRecommendations;
  const signals = normalizeSignals(sourcePrompts, "view");
  const sourceIds = new Set(signals.map((s) => s.prompt.id));
  const excludeIds = new Set([...sourceIds, ...(options?.excludeIds ?? [])]);

  const tagWeights = new Map<string, number>();
  const categoryWeights = new Map<string, number>();
  const tagSources = new Map<string, Map<RecommendationSourceKind, number>>();
  const categorySources = new Map<string, Map<RecommendationSourceKind, number>>();

  for (const signal of signals) {
    const weight = getSignalWeight(signal);
    if (weight <= 0) continue;
    for (const tag of signal.prompt.tags) {
      const normalized = normalizeTag(tag);
      addWeight(tagWeights, normalized, weight);
      addSourceWeight(tagSources, normalized, signal.kind, weight);
    }
    addWeight(categoryWeights, signal.prompt.category, weight);
    addSourceWeight(categorySources, signal.prompt.category, signal.kind, weight);
  }

  const preferences = options?.preferences;
  if (preferences?.tags?.length) {
    for (const tag of preferences.tags) {
      const normalized = normalizeTag(tag);
      addWeight(tagWeights, normalized, CONFIG.preferenceTagBoost);
      addSourceWeight(tagSources, normalized, "preference", CONFIG.preferenceTagBoost);
    }
  }

  if (preferences?.categories?.length) {
    for (const category of preferences.categories) {
      addWeight(categoryWeights, category, CONFIG.preferenceCategoryBoost);
      addSourceWeight(categorySources, category, "preference", CONFIG.preferenceCategoryBoost);
    }
  }

  const excludedTags = new Set((preferences?.excludeTags ?? []).map(normalizeTag));
  const excludedCategories = new Set(preferences?.excludeCategories ?? []);

  const maxTagWeight = Math.max(1, ...tagWeights.values());
  const maxCatWeight = Math.max(1, ...categoryWeights.values());

  const recommendations: RecommendationResult[] = [];

  for (const candidate of allPrompts) {
    if (excludeIds.has(candidate.id)) continue;
    if (excludedCategories.has(candidate.category)) continue;
    if (candidate.tags.some((tag) => excludedTags.has(normalizeTag(tag)))) continue;

    const reasons: string[] = [];
    let score = 0;

    let tagScore = 0;
    const matchedTags: string[] = [];
    const tagSourceTotals = new Map<RecommendationSourceKind, number>();
    for (const tag of candidate.tags) {
      const normalized = normalizeTag(tag);
      const weight = tagWeights.get(normalized) ?? 0;
      if (weight > 0) {
        tagScore += weight / maxTagWeight;
        matchedTags.push(tag);
        const sources = tagSources.get(normalized);
        if (sources) {
          for (const [source, value] of sources) {
            tagSourceTotals.set(source, (tagSourceTotals.get(source) ?? 0) + value);
          }
        }
      }
    }
    if (matchedTags.length > 0) {
      score += (tagScore / Math.max(1, candidate.tags.length)) * CONFIG.tagWeight;
      const source = pickTopSource(tagSourceTotals);
      reasons.push(tagReason(source, matchedTags));
    }

    const catWeight = categoryWeights.get(candidate.category) ?? 0;
    if (catWeight > 0) {
      score += (catWeight / maxCatWeight) * CONFIG.categoryWeight;
      const source = pickTopSource(categorySources.get(candidate.category));
      reasons.push(categoryReason(source, candidate.category));
    }

    const featuredScore = calculateFeaturedScore(candidate);
    if (featuredScore > 0) {
      score += featuredScore * CONFIG.featuredWeight;
      reasons.push("Featured prompt");
    }

    if (score > 0) {
      recommendations.push({ prompt: candidate, score, reasons });
    }
  }

  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, limit);
}

export function getForYouRecommendations(
  userHistory: {
    viewed?: Array<Prompt | RecommendationSignal>;
    saved?: Array<Prompt | RecommendationSignal>;
    runs?: Array<Prompt | RecommendationSignal>;
    preferences?: RecommendationPreferences;
  },
  allPrompts: Prompt[],
  options?: {
    limit?: number;
    excludeIds?: string[];
  }
): RecommendationResult[] {
  const limit = options?.limit ?? CONFIG.maxRecommendations;
  const excludeIds = new Set(options?.excludeIds ?? []);
  const sourcePrompts: RecommendationSignal[] = [];

  const savedSignals = normalizeSignals(userHistory.saved, "save");
  const viewSignals = normalizeSignals(userHistory.viewed, "view");
  const runSignals = normalizeSignals(userHistory.runs, "run");

  for (const signal of savedSignals) {
    sourcePrompts.push(signal, { ...signal });
    excludeIds.add(signal.prompt.id);
  }

  for (const signal of runSignals) {
    sourcePrompts.push(signal);
    excludeIds.add(signal.prompt.id);
  }

  for (const signal of viewSignals) {
    sourcePrompts.push(signal);
    excludeIds.add(signal.prompt.id);
  }

  const hasPreferences =
    Boolean(userHistory.preferences?.tags?.length) ||
    Boolean(userHistory.preferences?.categories?.length);

  if (sourcePrompts.length === 0 && !hasPreferences) {
    const preferences = userHistory.preferences;
    const excludedTags = new Set((preferences?.excludeTags ?? []).map(normalizeTag));
    const excludedCategories = new Set(preferences?.excludeCategories ?? []);

    return allPrompts
      .filter((prompt) => !excludeIds.has(prompt.id))
      .filter((prompt) => !excludedCategories.has(prompt.category))
      .filter((prompt) => !prompt.tags.some((tag) => excludedTags.has(normalizeTag(tag))))
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
      .slice(0, limit)
      .map((prompt) => ({
        prompt,
        score: prompt.featured ? 1 : 0.5,
        reasons: [prompt.featured ? "Featured prompt" : "Popular in the library"],
      }));
  }

  return getRecommendationsFromHistory(sourcePrompts, allPrompts, {
    limit,
    excludeIds: [...excludeIds],
    preferences: userHistory.preferences,
  });
}
