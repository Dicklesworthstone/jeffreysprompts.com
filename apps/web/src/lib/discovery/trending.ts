/**
 * Trending and Discovery Algorithm
 *
 * Calculates trending scores for community prompts based on multiple factors:
 * - Engagement metrics (views, copies, saves)
 * - Quality signals (rating, rating count)
 * - Freshness (time decay)
 *
 * The algorithm balances recent activity with sustained quality to surface
 * both new popular content and consistently valuable prompts.
 */

import type { CommunityPrompt } from "@/lib/swap-meet/types";

/**
 * Weights for different scoring components.
 * These can be tuned based on desired behavior.
 */
const WEIGHTS = {
  views: 0.25,      // Raw popularity signal
  copies: 0.30,     // Strong utility indicator (users found it useful)
  saves: 0.15,      // Interest signal (users want to use later)
  rating: 0.20,     // Quality signal from community feedback
  freshness: 0.10,  // Boost for recent content
} as const;

/**
 * Time decay configuration
 */
const TIME_DECAY = {
  halfLifeWeeks: 4,       // Score decays to 50% after 4 weeks
  minFreshness: 0.1,      // Minimum freshness score (even for old content)
  maxFreshness: 1.0,      // Maximum freshness score for new content
} as const;

/**
 * Breakdown of trending score components for debugging/analytics
 */
export interface TrendingScoreBreakdown {
  promptId: string;
  totalScore: number;
  components: {
    viewScore: number;
    copyScore: number;
    saveScore: number;
    ratingScore: number;
    freshnessScore: number;
  };
  weights: typeof WEIGHTS;
}

/**
 * Normalize a value to a 0-1 range given min/max bounds
 */
function normalize(value: number, max: number, min = 0): number {
  if (max <= min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/**
 * Calculate the freshness score based on content age.
 * Uses exponential decay with configurable half-life.
 */
function calculateFreshnessScore(updatedAt: string | Date, now: Date = new Date()): number {
  const updateTime = typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const updateMs = updateTime.getTime();
  if (!Number.isFinite(updateMs)) {
    return TIME_DECAY.minFreshness;
  }
  const ageMs = now.getTime() - updateMs;
  const ageWeeks = Math.max(0, ageMs / (1000 * 60 * 60 * 24 * 7));

  // Exponential decay: score = e^(-ageWeeks * ln(2) / halfLife)
  const decayRate = Math.log(2) / TIME_DECAY.halfLifeWeeks;
  const decayFactor = Math.exp(-ageWeeks * decayRate);

  // Scale between min and max freshness
  const range = TIME_DECAY.maxFreshness - TIME_DECAY.minFreshness;
  return TIME_DECAY.minFreshness + range * decayFactor;
}

/**
 * Calculate the composite rating score.
 * Considers both the rating value and the number of ratings (confidence).
 */
function calculateRatingScore(rating: number, ratingCount: number, maxRatingCount: number): number {
  // Normalize rating (0-5 scale to 0-1)
  const normalizedRating = rating / 5;

  // Confidence factor based on number of ratings
  // More ratings = more confident in the score
  const confidenceFactor = Math.min(1, Math.sqrt(ratingCount / Math.max(1, maxRatingCount)));

  // Bayesian average approach: blend towards mean with low confidence
  const meanRating = 0.6; // Prior assumption: 3/5 average
  const blendedRating = confidenceFactor * normalizedRating + (1 - confidenceFactor) * meanRating;

  return blendedRating;
}

/**
 * Calculate the trending score for a single prompt.
 * Returns both the total score and the breakdown of components.
 */
export function calculateTrendingScore(
  prompt: CommunityPrompt,
  context: {
    maxViews: number;
    maxCopies: number;
    maxSaves: number;
    maxRatingCount: number;
    now?: Date;
  }
): TrendingScoreBreakdown {
  const now = context.now ?? new Date();

  // Calculate individual component scores (all normalized to 0-1)
  const viewScore = normalize(prompt.stats.views, context.maxViews);
  const copyScore = normalize(prompt.stats.copies, context.maxCopies);
  const saveScore = normalize(prompt.stats.saves, context.maxSaves);
  const ratingScore = calculateRatingScore(
    prompt.stats.rating,
    prompt.stats.ratingCount,
    context.maxRatingCount
  );
  const freshnessScore = calculateFreshnessScore(prompt.updatedAt, now);

  // Calculate weighted total
  const totalScore =
    viewScore * WEIGHTS.views +
    copyScore * WEIGHTS.copies +
    saveScore * WEIGHTS.saves +
    ratingScore * WEIGHTS.rating +
    freshnessScore * WEIGHTS.freshness;

  return {
    promptId: prompt.id,
    totalScore,
    components: {
      viewScore,
      copyScore,
      saveScore,
      ratingScore,
      freshnessScore,
    },
    weights: WEIGHTS,
  };
}

/**
 * Calculate max values from a collection of prompts for normalization.
 */
function calculateMaxValues(prompts: CommunityPrompt[]) {
  return {
    maxViews: Math.max(1, ...prompts.map((p) => p.stats.views)),
    maxCopies: Math.max(1, ...prompts.map((p) => p.stats.copies)),
    maxSaves: Math.max(1, ...prompts.map((p) => p.stats.saves)),
    maxRatingCount: Math.max(1, ...prompts.map((p) => p.stats.ratingCount)),
  };
}

/**
 * Get trending prompts sorted by trending score.
 */
export function getTrendingPrompts(
  prompts: CommunityPrompt[],
  options?: {
    limit?: number;
    minScore?: number;
    category?: string;
    excludeIds?: string[];
    now?: Date;
  }
): CommunityPrompt[] {
  const now = options?.now ?? new Date();
  const context = { ...calculateMaxValues(prompts), now };

  // Calculate scores for all prompts
  const scored = prompts
    .filter((p) => !options?.excludeIds?.includes(p.id))
    .filter((p) => !options?.category || p.category === options.category)
    .map((prompt) => ({
      prompt,
      score: calculateTrendingScore(prompt, context),
    }))
    .filter((item) => !options?.minScore || item.score.totalScore >= options.minScore);

  // Sort by total score descending
  scored.sort((a, b) => b.score.totalScore - a.score.totalScore);

  // Apply limit
  const limited = options?.limit ? scored.slice(0, options.limit) : scored;

  return limited.map((item) => item.prompt);
}

/**
 * Get trending prompts with their score breakdowns for analytics/debugging.
 */
export function getTrendingPromptsWithScores(
  prompts: CommunityPrompt[],
  options?: {
    limit?: number;
    category?: string;
    now?: Date;
  }
): Array<{ prompt: CommunityPrompt; score: TrendingScoreBreakdown }> {
  const now = options?.now ?? new Date();
  const context = { ...calculateMaxValues(prompts), now };

  const scored = prompts
    .filter((p) => !options?.category || p.category === options.category)
    .map((prompt) => ({
      prompt,
      score: calculateTrendingScore(prompt, context),
    }));

  scored.sort((a, b) => b.score.totalScore - a.score.totalScore);

  return options?.limit ? scored.slice(0, options.limit) : scored;
}

/**
 * Sort prompts by trending score (in-place compatible with existing sort patterns).
 * This function is designed to be used as a drop-in replacement for simple sorts.
 */
export function sortByTrending(prompts: CommunityPrompt[], now?: Date): CommunityPrompt[] {
  return getTrendingPrompts(prompts, { now });
}
