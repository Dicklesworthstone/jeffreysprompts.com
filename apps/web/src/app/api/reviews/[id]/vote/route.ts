import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getReviewById, voteReview, getVote } from "@/lib/reviews/review-store";
import { getOrCreateUserId, getUserIdFromRequest } from "@/lib/user-id";
import { createRateLimiter } from "@/lib/rate-limit";

const reviewVoteRateLimiter = createRateLimiter({
  name: "review-vote",
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reviews/[id]/vote
 *
 * Returns the current user's vote on a review
 */
export async function GET(request: NextRequest, context: RouteParams) {
  const { id: reviewId } = await context.params;
  const userId = getUserIdFromRequest(request);

  if (!reviewId) {
    return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
  }

  const review = getReviewById(reviewId);

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  const vote = userId ? getVote({ reviewId, visitorId: userId }) : null;

  return NextResponse.json({
    reviewId,
    vote: vote ? { isHelpful: vote.isHelpful } : null,
  });
}

/**
 * POST /api/reviews/[id]/vote
 *
 * Vote on a review as helpful or not helpful
 *
 * Body:
 * - isHelpful: boolean
 */
export async function POST(request: NextRequest, context: RouteParams) {
  const { id: reviewId } = await context.params;

  if (!reviewId) {
    return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
  }

  const review = getReviewById(reviewId);

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  if (review.reported) {
    return NextResponse.json({ error: "Cannot vote on this review." }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof payload.isHelpful !== "boolean") {
    return NextResponse.json({ error: "isHelpful (boolean) is required." }, { status: 400 });
  }

  const { userId, cookie } = getOrCreateUserId(request);

  const voteRateLimit = await reviewVoteRateLimiter.check(`user:${userId}`);
  if (!voteRateLimit.allowed) {
    const response = NextResponse.json(
      { error: "Too many vote requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(voteRateLimit.retryAfterSeconds),
        },
      }
    );
    if (cookie) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
  }

  // Prevent self-voting
  if (review.userId === userId) {
    return NextResponse.json({ error: "You cannot vote on your own review." }, { status: 400 });
  }

  const result = voteReview({
    reviewId,
    visitorId: userId,
    isHelpful: payload.isHelpful,
  });

  if (!result) {
    return NextResponse.json({ error: "Failed to submit vote." }, { status: 500 });
  }

  const response = NextResponse.json({
    success: true,
    review: result.review,
    vote: result.vote,
  });

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
