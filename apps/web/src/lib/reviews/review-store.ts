/**
 * Review Store
 *
 * In-memory store for written reviews (V2 of Ratings & Reviews).
 * Follows the same patterns as rating-store.ts for consistency.
 *
 * Features:
 * - Written reviews with optional text
 * - Author responses to reviews
 * - Helpful/not helpful voting
 * - Moderation support (reported reviews)
 */

import type { RatingContentType, RatingValue } from "../ratings/rating-store";

export type { RatingContentType };

export interface ReviewReport {
  reporterId: string;
  reason?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  contentType: RatingContentType;
  contentId: string;
  userId: string;
  displayName: string | null;
  rating: RatingValue;
  content: string;
  createdAt: string;
  updatedAt: string;
  helpfulCount: number;
  notHelpfulCount: number;
  reported: boolean;
  reportInfo: ReviewReport | null;
  authorResponse: AuthorResponse | null;
}

export interface AuthorResponse {
  id: string;
  reviewId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewVote {
  id: string;
  reviewId: string;
  userId: string;
  isHelpful: boolean;
  createdAt: string;
}

export interface ReviewSummary {
  contentType: RatingContentType;
  contentId: string;
  totalReviews: number;
  averageHelpfulness: number;
  recentReviews: number; // Reviews in last 30 days
}

interface ReviewStore {
  reviews: Map<string, Review>;
  votes: Map<string, ReviewVote>;
  responses: Map<string, AuthorResponse>;
  order: string[]; // Review IDs in reverse chronological order
}

const STORE_KEY = "__jfp_review_store__";
const MAX_REVIEW_LENGTH = 2000;
const MAX_RESPONSE_LENGTH = 1000;

/**
 * Sanitize user input to prevent XSS attacks.
 * This is more comprehensive than just stripping < and >.
 *
 * Security approach:
 * 1. Remove all HTML tags and their contents for script/style
 * 2. Escape HTML entities to prevent injection
 * 3. Remove javascript: and data: URLs
 * 4. Remove event handlers (onclick, onerror, etc.)
 */
function sanitizeUserInput(input: string): string {
  let text = input;

  // Remove script and style tags with content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  // Remove all HTML tags
  text = text.replace(/<[^>]*>/g, "");
  // Remove javascript: URLs (only in URL-like contexts, not bare text)
  text = text.replace(/javascript:/gi, "");
  // Remove common event handlers patterns
  text = text.replace(/on\w+\s*=/gi, "");

  // Decode any existing entities first to prevent double-encoding on re-edits,
  // then re-encode. This makes sanitization idempotent.
  text = text
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");

  // Encode special characters
  text = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

  return text;
}

function getStore(): ReviewStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: ReviewStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      reviews: new Map(),
      votes: new Map(),
      responses: new Map(),
      order: [],
    };
  }

  return globalStore[STORE_KEY];
}

function makeReviewId(contentType: RatingContentType, contentId: string, userId: string): string {
  return `review:${contentType}:${contentId}:${userId}`;
}

function makeVoteKey(reviewId: string, visitorId: string): string {
  return `vote:${reviewId}:${visitorId}`;
}

function touchReview(store: ReviewStore, reviewId: string): void {
  store.order = [reviewId, ...store.order.filter((id) => id !== reviewId)];
}

export function getReviewById(reviewId: string): Review | null {
  const store = getStore();
  return store.reviews.get(reviewId) ?? null;
}

export function getUserReview(input: {
  contentType: RatingContentType;
  contentId: string;
  userId: string;
}): Review | null {
  const store = getStore();
  const reviewId = makeReviewId(input.contentType, input.contentId, input.userId);
  return store.reviews.get(reviewId) ?? null;
}

export type ReviewSortBy = "newest" | "oldest" | "most-helpful";

export function listReviewsForContent(input: {
  contentType: RatingContentType;
  contentId: string;
  limit?: number;
  offset?: number;
  includeReported?: boolean;
  sortBy?: ReviewSortBy;
}): { reviews: Review[]; total: number; hasMore: boolean } {
  const store = getStore();
  const limit = input.limit ?? 10;
  const offset = input.offset ?? 0;
  const sortBy = input.sortBy ?? "newest";

  const allReviews = store.order
    .map((id) => store.reviews.get(id))
    .filter((review): review is Review => Boolean(review))
    .filter(
      (review) =>
        review.contentType === input.contentType &&
        review.contentId === input.contentId &&
        (input.includeReported || !review.reported)
    );

  if (sortBy === "oldest") {
    allReviews.reverse();
  } else if (sortBy === "most-helpful") {
    allReviews.sort((a, b) => b.helpfulCount - a.helpfulCount || b.createdAt.localeCompare(a.createdAt));
  }
  // "newest" is already the default order from store.order (reverse chronological)

  const total = allReviews.length;
  const reviews = allReviews.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return { reviews, total, hasMore };
}

export function getReviewSummary(input: {
  contentType: RatingContentType;
  contentId: string;
}): ReviewSummary {
  const { reviews, total } = listReviewsForContent({
    ...input,
    limit: 1000,
    includeReported: false,
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  const recentReviews = reviews.filter((r) => r.createdAt >= thirtyDaysAgoStr).length;

  const totalVotes = reviews.reduce((sum, r) => sum + r.helpfulCount + r.notHelpfulCount, 0);
  const helpfulVotes = reviews.reduce((sum, r) => sum + r.helpfulCount, 0);
  const averageHelpfulness = totalVotes === 0 ? 0 : Math.round((helpfulVotes / totalVotes) * 100);

  return {
    contentType: input.contentType,
    contentId: input.contentId,
    totalReviews: total,
    averageHelpfulness,
    recentReviews,
  };
}

export interface SubmitReviewInput {
  contentType: RatingContentType;
  contentId: string;
  userId: string;
  displayName?: string;
  rating: RatingValue;
  content: string;
}

export interface SubmitReviewResult {
  review: Review;
  summary: ReviewSummary;
  isNew: boolean;
}

export function submitReview(input: SubmitReviewInput): SubmitReviewResult {
  const store = getStore();
  const now = new Date().toISOString();
  const reviewId = makeReviewId(input.contentType, input.contentId, input.userId);
  const existing = store.reviews.get(reviewId);

  // Sanitize and truncate content
  const sanitizedContent = sanitizeUserInput(input.content.trim()).slice(0, MAX_REVIEW_LENGTH);

  // Sanitize displayName as well
  const sanitizedDisplayName = input.displayName
    ? sanitizeUserInput(input.displayName.trim()).slice(0, 50)
    : null;

  const review: Review = existing
    ? {
        ...existing,
        rating: input.rating,
        content: sanitizedContent,
        displayName: sanitizedDisplayName ?? existing.displayName,
        updatedAt: now,
      }
    : {
        id: reviewId,
        contentType: input.contentType,
        contentId: input.contentId,
        userId: input.userId,
        displayName: sanitizedDisplayName,
        rating: input.rating,
        content: sanitizedContent,
        createdAt: now,
        updatedAt: now,
        helpfulCount: 0,
        notHelpfulCount: 0,
        reported: false,
        reportInfo: null,
        authorResponse: null,
      };

  store.reviews.set(reviewId, review);
  touchReview(store, reviewId);

  return {
    review,
    summary: getReviewSummary({ contentType: input.contentType, contentId: input.contentId }),
    isNew: !existing,
  };
}

export function deleteReview(input: {
  reviewId: string;
  userId: string;
}): boolean {
  const store = getStore();
  const review = store.reviews.get(input.reviewId);

  if (!review || review.userId !== input.userId) {
    return false;
  }

  store.reviews.delete(input.reviewId);
  store.order = store.order.filter((id) => id !== input.reviewId);

  // Clean up votes for this review
  for (const [key, vote] of store.votes) {
    if (vote.reviewId === input.reviewId) {
      store.votes.delete(key);
    }
  }

  // Clean up author response
  if (review.authorResponse) {
    store.responses.delete(review.authorResponse.id);
  }

  return true;
}

export function voteReview(input: {
  reviewId: string;
  visitorId: string;
  isHelpful: boolean;
}): { review: Review; vote: ReviewVote } | null {
  const store = getStore();
  const review = store.reviews.get(input.reviewId);

  if (!review) {
    return null;
  }

  const voteKey = makeVoteKey(input.reviewId, input.visitorId);
  const existingVote = store.votes.get(voteKey);
  const now = new Date().toISOString();

  // Remove old vote counts if changing vote
  if (existingVote) {
    if (existingVote.isHelpful) {
      review.helpfulCount = Math.max(0, review.helpfulCount - 1);
    } else {
      review.notHelpfulCount = Math.max(0, review.notHelpfulCount - 1);
    }
  }

  // Apply new vote
  if (input.isHelpful) {
    review.helpfulCount += 1;
  } else {
    review.notHelpfulCount += 1;
  }

  const vote: ReviewVote = {
    id: voteKey,
    reviewId: input.reviewId,
    userId: input.visitorId,
    isHelpful: input.isHelpful,
    createdAt: existingVote?.createdAt ?? now,
  };

  store.votes.set(voteKey, vote);
  review.updatedAt = now;
  store.reviews.set(input.reviewId, review);

  return { review, vote };
}

export function getVote(input: {
  reviewId: string;
  visitorId: string;
}): ReviewVote | null {
  const store = getStore();
  const voteKey = makeVoteKey(input.reviewId, input.visitorId);
  return store.votes.get(voteKey) ?? null;
}

export function submitAuthorResponse(input: {
  reviewId: string;
  authorId: string;
  content: string;
}): { review: Review; response: AuthorResponse } | null {
  const store = getStore();
  const review = store.reviews.get(input.reviewId);

  if (!review) {
    return null;
  }

  const now = new Date().toISOString();
  const responseId = `response:${input.reviewId}`;

  // Sanitize and truncate content
  const sanitizedContent = sanitizeUserInput(input.content.trim()).slice(0, MAX_RESPONSE_LENGTH);

  const existing = review.authorResponse;

  const response: AuthorResponse = existing
    ? {
        ...existing,
        content: sanitizedContent,
        updatedAt: now,
      }
    : {
        id: responseId,
        reviewId: input.reviewId,
        authorId: input.authorId,
        content: sanitizedContent,
        createdAt: now,
        updatedAt: now,
      };

  store.responses.set(responseId, response);
  review.authorResponse = response;
  review.updatedAt = now;
  store.reviews.set(input.reviewId, review);

  return { review, response };
}

export function deleteAuthorResponse(input: {
  reviewId: string;
  authorId: string;
}): boolean {
  const store = getStore();
  const review = store.reviews.get(input.reviewId);

  if (!review || !review.authorResponse || review.authorResponse.authorId !== input.authorId) {
    return false;
  }

  const responseId = review.authorResponse.id;
  store.responses.delete(responseId);
  review.authorResponse = null;
  review.updatedAt = new Date().toISOString();
  store.reviews.set(input.reviewId, review);

  return true;
}

export function reportReview(input: {
  reviewId: string;
  reporterId: string;
  reason?: string;
}): boolean {
  const store = getStore();
  const review = store.reviews.get(input.reviewId);

  if (!review) {
    return false;
  }

  const now = new Date().toISOString();
  review.reported = true;
  review.reportInfo = {
    reporterId: input.reporterId,
    reason: input.reason,
    createdAt: now,
  };
  review.updatedAt = now;
  store.reviews.set(input.reviewId, review);

  return true;
}

// Export constants for validation
export const REVIEW_MAX_LENGTH = MAX_REVIEW_LENGTH;
export const RESPONSE_MAX_LENGTH = MAX_RESPONSE_LENGTH;
