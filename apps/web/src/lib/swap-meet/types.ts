/**
 * Types for the Swap Meet (Community Prompts) feature
 */

import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";

/**
 * Author information for community prompts
 */
export interface CommunityAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  reputation: number;
}

/**
 * Statistics for a community prompt
 */
export interface CommunityPromptStats {
  views: number;
  copies: number;
  saves: number;
  rating: number;
  ratingCount: number;
}

/**
 * A community-contributed prompt
 */
export interface CommunityPrompt {
  id: string;
  title: string;
  description: string;
  content: string;
  category: PromptCategory;
  tags: string[];
  author: CommunityAuthor;
  stats: CommunityPromptStats;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sort options for community prompts
 */
export type CommunitySortOption = "trending" | "newest" | "top-rated" | "most-copied";

/**
 * Filter options for community prompts
 */
export interface CommunityFilters {
  query: string;
  category: PromptCategory | null;
  tags: string[];
  sortBy: CommunitySortOption;
}
