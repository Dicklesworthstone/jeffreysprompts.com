import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  listReviewsForContent,
  getReviewSummary,
  getUserReview,
  submitReview,
  REVIEW_MAX_LENGTH,
  type ReviewSortBy,
} from "@/lib/reviews/review-store";
import { isRatingContentType } from "@/lib/ratings/rating-store";
import { createRateLimiter, getTrustedClientIp } from "@/lib/rate-limit";
import { getOrCreateUserId, getUserIdFromRequest } from "@/lib/user-id";

const MAX_ID_LENGTH = 200;

const reviewRateLimiter = createRateLimiter({
  name: "reviews",
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
});
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;

function normalizeText(value: string): string {
  return value.trim();
}

function parseNumber(value: string | null, defaultValue: number, max: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return defaultValue;
  return Math.min(parsed, max);
}

const VALID_SORT_VALUES = new Set<ReviewSortBy>(["newest", "oldest", "most-helpful"]);

/**
 * GET /api/reviews
 *
 * Query params:
 * - contentType: "prompt" | "bundle" | "workflow" | "collection" | "skill"
 * - contentId: string
 * - limit?: number (default 10, max 50)
 * - offset?: number (default 0)
 * - sortBy?: "newest" | "oldest" | "most-helpful" (default "newest")
 *
 * Returns list of reviews with pagination info
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const contentType = normalizeText(searchParams.get("contentType") ?? "");
  const contentId = normalizeText(searchParams.get("contentId") ?? "");
  const limit = parseNumber(searchParams.get("limit"), DEFAULT_LIMIT, MAX_LIMIT);
  const offset = parseNumber(searchParams.get("offset"), 0, 10000);
  const sortByRaw = searchParams.get("sortBy") ?? "newest";
  const sortBy: ReviewSortBy = VALID_SORT_VALUES.has(sortByRaw as ReviewSortBy)
    ? (sortByRaw as ReviewSortBy)
    : "newest";
  const userId = getUserIdFromRequest(request);

  if (!contentType || !contentId) {
    return NextResponse.json(
      { error: "contentType and contentId are required." },
      { status: 400 }
    );
  }

  if (!isRatingContentType(contentType)) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 400 });
  }

  if (contentId.length > MAX_ID_LENGTH) {
    return NextResponse.json({ error: "Invalid content id." }, { status: 400 });
  }

  const { reviews, total, hasMore } = listReviewsForContent({
    contentType,
    contentId,
    limit,
    offset,
    includeReported: false,
    sortBy,
  });

  const summary = getReviewSummary({ contentType, contentId });
  const userReview = userId ? getUserReview({ contentType, contentId, userId }) : null;

  // User-specific data means private caching
  const cacheControl = userId
    ? "private, max-age=30"
    : "public, s-maxage=30, stale-while-revalidate=60";

  return NextResponse.json(
    {
      reviews,
      summary,
      userReview,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
      },
    },
    {
      headers: {
        "Cache-Control": cacheControl,
      },
    }
  );
}

/**
 * POST /api/reviews
 *
 * Body:
 * - contentType: "prompt" | "bundle" | "workflow" | "collection" | "skill"
 * - contentId: string
 * - rating: "up" | "down"
 * - content: string (required, max 2000 chars)
 * - displayName?: string
 *
 * Returns the created/updated review
 */
export async function POST(request: NextRequest) {
  const clientIp = getTrustedClientIp(request);
  const rateLimit = await reviewRateLimiter.check(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many reviews. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const contentType = typeof payload.contentType === "string" ? normalizeText(payload.contentType) : "";
  const contentId = typeof payload.contentId === "string" ? normalizeText(payload.contentId) : "";
  const rating = typeof payload.rating === "string" ? normalizeText(payload.rating) : "";
  const content = typeof payload.content === "string" ? normalizeText(payload.content) : "";
  const displayName = typeof payload.displayName === "string" ? normalizeText(payload.displayName) : undefined;

  if (!contentType || !contentId || !rating || !content) {
    return NextResponse.json(
      { error: "contentType, contentId, rating, and content are required." },
      { status: 400 }
    );
  }

  if (!isRatingContentType(contentType)) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 400 });
  }

  if (contentId.length > MAX_ID_LENGTH) {
    return NextResponse.json({ error: "Invalid content id." }, { status: 400 });
  }

  if (rating !== "up" && rating !== "down") {
    return NextResponse.json({ error: "Invalid rating value. Must be 'up' or 'down'." }, { status: 400 });
  }

  if (content.length < 10) {
    return NextResponse.json(
      { error: "Review content must be at least 10 characters." },
      { status: 400 }
    );
  }

  if (content.length > REVIEW_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Review content exceeds maximum length of ${REVIEW_MAX_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const { userId, cookie } = getOrCreateUserId(request);

  const result = submitReview({
    contentType,
    contentId,
    userId,
    displayName,
    rating: rating as "up" | "down",
    content,
  });

  const response = NextResponse.json({
    success: true,
    review: result.review,
    summary: result.summary,
    isNew: result.isNew,
  });

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
