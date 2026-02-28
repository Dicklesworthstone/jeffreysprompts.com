export type RatingValue = "up" | "down";

export type RatingContentType =
  | "prompt"
  | "bundle"
  | "workflow"
  | "collection"
  | "skill";

export const RATING_CONTENT_TYPES: RatingContentType[] = [
  "prompt",
  "bundle",
  "workflow",
  "collection",
  "skill",
];

export function isRatingContentType(value: string): value is RatingContentType {
  return RATING_CONTENT_TYPES.includes(value as RatingContentType);
}

export interface ContentRating {
  id: string;
  contentType: RatingContentType;
  contentId: string;
  userId: string;
  value: RatingValue;
  createdAt: string;
  updatedAt: string;
}

export interface RatingSummary {
  contentType: RatingContentType;
  contentId: string;
  upvotes: number;
  downvotes: number;
  total: number;
  approvalRate: number; // 0-100
  lastUpdated: string | null;
}

interface RatingStore {
  ratings: Map<string, ContentRating>;
  order: string[];
}

const STORE_KEY = "__jfp_rating_store__";
const MAX_RATINGS_IN_MEMORY = 100000;

function getStore(): RatingStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: RatingStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      ratings: new Map(),
      order: [],
    };
  }

  return globalStore[STORE_KEY];
}

function makeRatingKey(input: {
  contentType: RatingContentType;
  contentId: string;
  userId: string;
}) {
  return `${input.contentType}:${input.contentId}:${input.userId}`;
}

function touchRating(store: RatingStore, ratingId: string) {
  store.order = [ratingId, ...store.order.filter((id) => id !== ratingId)];
}

function evictOldestRatingsIfNeeded(store: RatingStore): void {
  if (store.ratings.size <= MAX_RATINGS_IN_MEMORY) return;

  // order is newest first, pop from end
  const numToRemove = Math.ceil(MAX_RATINGS_IN_MEMORY * 0.1);
  for (let i = 0; i < numToRemove; i++) {
    const oldestId = store.order.pop();
    if (oldestId) {
      store.ratings.delete(oldestId);
    }
  }
}

export function getUserRating(input: {
  contentType: RatingContentType;
  contentId: string;
  userId: string;
}): RatingValue | null {
  const store = getStore();
  const key = makeRatingKey(input);
  return store.ratings.get(key)?.value ?? null;
}

export function listRatingsForContent(input: {
  contentType: RatingContentType;
  contentId: string;
}): ContentRating[] {
  const store = getStore();
  return store.order
    .map((id) => store.ratings.get(id))
    .filter((rating): rating is ContentRating => Boolean(rating))
    .filter((rating) => rating.contentType === input.contentType && rating.contentId === input.contentId);
}

export function getRatingSummary(input: {
  contentType: RatingContentType;
  contentId: string;
}): RatingSummary {
  const ratings = listRatingsForContent(input);
  const upvotes = ratings.filter((rating) => rating.value === "up").length;
  const downvotes = ratings.filter((rating) => rating.value === "down").length;
  const total = upvotes + downvotes;
  const approvalRate = total === 0 ? 0 : Math.round((upvotes / total) * 100);
  const lastUpdated = ratings[0]?.updatedAt ?? null;

  return {
    contentType: input.contentType,
    contentId: input.contentId,
    upvotes,
    downvotes,
    total,
    approvalRate,
    lastUpdated,
  };
}

export function submitRating(input: {
  contentType: RatingContentType;
  contentId: string;
  userId: string;
  value: RatingValue;
}): { rating: ContentRating; summary: RatingSummary } {
  const store = getStore();
  evictOldestRatingsIfNeeded(store);

  const now = new Date().toISOString();
  const key = makeRatingKey(input);
  const existing = store.ratings.get(key);

  const rating: ContentRating = existing
    ? { ...existing, value: input.value, updatedAt: now }
    : {
        id: key,
        contentType: input.contentType,
        contentId: input.contentId,
        userId: input.userId,
        value: input.value,
        createdAt: now,
        updatedAt: now,
      };

  store.ratings.set(key, rating);
  touchRating(store, key);

  return {
    rating,
    summary: getRatingSummary({ contentType: input.contentType, contentId: input.contentId }),
  };
}
