/**
 * Personalized Recommendations
 *
 * Generates prompt recommendations based on:
 * - User's viewing history (similar to what they've viewed)
 * - User's saved prompts (content affinity)
 * - Collaborative filtering (users like you also liked)
 * - Tag/category preferences
 *
 * For now, this module provides content-based recommendations
 * since we don't have user history data yet.
 */

import type { CommunityPrompt } from "@/lib/swap-meet/types";

/**
 * Configuration for recommendation generation
 */
const CONFIG = {
  tagWeight: 0.6,           // Weight for tag overlap similarity
  categoryWeight: 0.2,      // Weight for same category
  authorWeight: 0.1,        // Weight for same author
  popularityWeight: 0.1,    // Weight for overall popularity
  maxRecommendations: 10,   // Default max recommendations
} as const;

/**
 * Recommendation result with explanation
 */
export interface Recommendation {
  prompt: CommunityPrompt;
  score: number;
  reasons: string[];
}

/**
 * Calculate Jaccard similarity between two tag sets
 */
function calculateTagSimilarity(tagsA: string[], tagsB: string[]): number {
  const setA = new Set(tagsA.map((t) => t.toLowerCase()));
  const setB = new Set(tagsB.map((t) => t.toLowerCase()));

  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = [...setA].filter((tag) => setB.has(tag)).length;
  const union = new Set([...setA, ...setB]).size;

  return intersection / union;
}

/**
 * Calculate a normalized popularity score for a prompt
 */
function calculatePopularityScore(
  prompt: CommunityPrompt,
  maxViews: number,
  maxCopies: number
): number {
  const viewScore = prompt.stats.views / Math.max(1, maxViews);
  const copyScore = prompt.stats.copies / Math.max(1, maxCopies);
  const ratingScore = prompt.stats.rating / 5;

  return (viewScore + copyScore + ratingScore) / 3;
}

/**
 * Get recommendations based on a source prompt (similar to / related to)
 */
export function getRelatedRecommendations(
  sourcePrompt: CommunityPrompt,
  allPrompts: CommunityPrompt[],
  options?: {
    limit?: number;
    excludeIds?: string[];
    minScore?: number;
  }
): Recommendation[] {
  const limit = options?.limit ?? CONFIG.maxRecommendations;
  const excludeIds = new Set([sourcePrompt.id, ...(options?.excludeIds ?? [])]);

  // Calculate max values for normalization (filter out undefined/NaN to prevent propagation)
  const safeMax = (values: number[]) => {
    const validValues = values.filter((v) => Number.isFinite(v));
    return validValues.length > 0 ? Math.max(1, ...validValues) : 1;
  };
  const maxViews = safeMax(allPrompts.map((p) => p.stats?.views ?? 0));
  const maxCopies = safeMax(allPrompts.map((p) => p.stats?.copies ?? 0));

  const recommendations: Recommendation[] = [];

  for (const candidate of allPrompts) {
    if (excludeIds.has(candidate.id)) continue;

    const reasons: string[] = [];
    let score = 0;

    // Tag similarity
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

    // Same category
    if (candidate.category === sourcePrompt.category) {
      score += CONFIG.categoryWeight;
      reasons.push(`Same category: ${candidate.category}`);
    }

    // Same author
    if (candidate.author.id === sourcePrompt.author.id) {
      score += CONFIG.authorWeight;
      reasons.push(`By the same author: ${candidate.author.displayName}`);
    }

    // Popularity bonus
    const popularity = calculatePopularityScore(candidate, maxViews, maxCopies);
    score += popularity * CONFIG.popularityWeight;

    if (score > (options?.minScore ?? 0)) {
      recommendations.push({
        prompt: candidate,
        score,
        reasons,
      });
    }
  }

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.slice(0, limit);
}

/**
 * Get recommendations based on multiple source prompts (e.g., user's saved prompts)
 */
export function getRecommendationsFromHistory(
  sourcePrompts: CommunityPrompt[],
  allPrompts: CommunityPrompt[],
  options?: {
    limit?: number;
    excludeIds?: string[];
  }
): Recommendation[] {
  const limit = options?.limit ?? CONFIG.maxRecommendations;
  const sourceIds = new Set(sourcePrompts.map((p) => p.id));
  const excludeIds = new Set([...sourceIds, ...(options?.excludeIds ?? [])]);

  // Aggregate tag frequencies from source prompts
  const tagFrequency = new Map<string, number>();
  const categoryFrequency = new Map<string, number>();

  for (const source of sourcePrompts) {
    for (const tag of source.tags) {
      const normalizedTag = tag.toLowerCase();
      tagFrequency.set(normalizedTag, (tagFrequency.get(normalizedTag) ?? 0) + 1);
    }
    categoryFrequency.set(source.category, (categoryFrequency.get(source.category) ?? 0) + 1);
  }

  // Calculate max values for normalization (filter out undefined/NaN to prevent propagation)
  const safeMaxArr = (values: number[]) => {
    const validValues = values.filter((v) => Number.isFinite(v));
    return validValues.length > 0 ? Math.max(1, ...validValues) : 1;
  };
  const safeMaxIter = (values: Iterable<number>) => {
    const arr = [...values].filter((v) => Number.isFinite(v));
    return arr.length > 0 ? Math.max(1, ...arr) : 1;
  };
  const maxViews = safeMaxArr(allPrompts.map((p) => p.stats?.views ?? 0));
  const maxCopies = safeMaxArr(allPrompts.map((p) => p.stats?.copies ?? 0));
  const maxTagFreq = safeMaxIter(tagFrequency.values());
  const maxCatFreq = safeMaxIter(categoryFrequency.values());

  const recommendations: Recommendation[] = [];

  for (const candidate of allPrompts) {
    if (excludeIds.has(candidate.id)) continue;

    const reasons: string[] = [];
    let score = 0;

    // Tag affinity (how many of the candidate's tags appear in user's history)
    let tagScore = 0;
    const matchedTags: string[] = [];
    for (const tag of candidate.tags) {
      const freq = tagFrequency.get(tag.toLowerCase()) ?? 0;
      if (freq > 0) {
        tagScore += freq / maxTagFreq;
        matchedTags.push(tag);
      }
    }
    if (matchedTags.length > 0) {
      score += (tagScore / candidate.tags.length) * CONFIG.tagWeight;
      reasons.push(`Matches your interests: ${matchedTags.slice(0, 3).join(", ")}`);
    }

    // Category affinity
    const catFreq = categoryFrequency.get(candidate.category) ?? 0;
    if (catFreq > 0) {
      score += (catFreq / maxCatFreq) * CONFIG.categoryWeight;
      reasons.push(`In a category you like: ${candidate.category}`);
    }

    // Popularity bonus
    const popularity = calculatePopularityScore(candidate, maxViews, maxCopies);
    score += popularity * CONFIG.popularityWeight;

    if (score > 0.1) {
      recommendations.push({
        prompt: candidate,
        score,
        reasons,
      });
    }
  }

  // Sort by score descending
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.slice(0, limit);
}

/**
 * Get "For You" recommendations mixing different strategies
 */
export function getForYouRecommendations(
  userHistory: {
    viewed?: CommunityPrompt[];
    saved?: CommunityPrompt[];
  },
  allPrompts: CommunityPrompt[],
  options?: {
    limit?: number;
    excludeIds?: string[];
  }
): Recommendation[] {
  const limit = options?.limit ?? CONFIG.maxRecommendations;

  // Combine viewed and saved prompts, weighting saved higher
  const sourcePrompts: CommunityPrompt[] = [];
  const excludeIds = new Set(options?.excludeIds ?? []);

  // Add saved prompts (they matter more)
  if (userHistory.saved) {
    for (const prompt of userHistory.saved) {
      sourcePrompts.push(prompt, prompt); // Double weight by adding twice
      excludeIds.add(prompt.id);
    }
  }

  // Add viewed prompts
  if (userHistory.viewed) {
    for (const prompt of userHistory.viewed) {
      sourcePrompts.push(prompt);
      excludeIds.add(prompt.id);
    }
  }

  // If no history, return popular/trending items
  if (sourcePrompts.length === 0) {
    return allPrompts
      .filter((p) => !excludeIds.has(p.id))
      .sort((a, b) => b.stats.copies - a.stats.copies)
      .slice(0, limit)
      .map((prompt) => ({
        prompt,
        score: prompt.stats.copies / 1000,
        reasons: ["Popular in the community"],
      }));
  }

  return getRecommendationsFromHistory(sourcePrompts, allPrompts, {
    limit,
    excludeIds: [...excludeIds],
  });
}
