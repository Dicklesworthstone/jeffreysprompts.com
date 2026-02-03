import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getReviewById,
  deleteReview,
  REVIEW_MAX_LENGTH,
} from "@/lib/reviews/review-store";
import { getUserIdFromRequest } from "@/lib/user-id";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reviews/[id]
 *
 * Returns a single review by ID
 */
export async function GET(request: NextRequest, context: RouteParams) {
  const { id: reviewId } = await context.params;

  if (!reviewId) {
    return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
  }

  const review = getReviewById(reviewId);

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  if (review.reported) {
    return NextResponse.json({ error: "Review not available." }, { status: 404 });
  }

  return NextResponse.json({ review });
}

/**
 * DELETE /api/reviews/[id]
 *
 * Deletes a review (only by the author)
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  const { id: reviewId } = await context.params;
  const userId = getUserIdFromRequest(request);

  if (!reviewId) {
    return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const review = getReviewById(reviewId);

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  if (review.userId !== userId) {
    return NextResponse.json({ error: "You can only delete your own reviews." }, { status: 403 });
  }

  const success = deleteReview({ reviewId, userId });

  if (!success) {
    return NextResponse.json({ error: "Failed to delete review." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * PUT /api/reviews/[id]
 *
 * Updates a review (only by the author)
 *
 * Body:
 * - content?: string (new review text)
 * - rating?: "up" | "down" (new rating)
 */
export async function PUT(request: NextRequest, context: RouteParams) {
  const { id: reviewId } = await context.params;
  const userId = getUserIdFromRequest(request);

  if (!reviewId) {
    return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const review = getReviewById(reviewId);

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  if (review.userId !== userId) {
    return NextResponse.json({ error: "You can only edit your own reviews." }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const newContent = typeof payload.content === "string" ? payload.content.trim() : undefined;
  const newRating = typeof payload.rating === "string" ? payload.rating.trim() : undefined;

  if (newContent !== undefined) {
    if (newContent.length < 10) {
      return NextResponse.json(
        { error: "Review content must be at least 10 characters." },
        { status: 400 }
      );
    }
    if (newContent.length > REVIEW_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Review content exceeds maximum length of ${REVIEW_MAX_LENGTH} characters.` },
        { status: 400 }
      );
    }
  }

  if (newRating !== undefined && newRating !== "up" && newRating !== "down") {
    return NextResponse.json({ error: "Invalid rating value. Must be 'up' or 'down'." }, { status: 400 });
  }

  // Update the review in place
  const now = new Date().toISOString();
  const updatedReview = {
    ...review,
    content: newContent !== undefined ? newContent.replace(/[<>]/g, "") : review.content,
    rating: newRating !== undefined ? (newRating as "up" | "down") : review.rating,
    updatedAt: now,
  };

  // Re-import to get the store update function
  const { submitReview } = await import("@/lib/reviews/review-store");

  // We need to use submitReview which handles store updates
  const result = submitReview({
    contentType: updatedReview.contentType,
    contentId: updatedReview.contentId,
    userId: updatedReview.userId,
    displayName: updatedReview.displayName ?? undefined,
    rating: updatedReview.rating,
    content: updatedReview.content,
  });

  return NextResponse.json({
    success: true,
    review: result.review,
    summary: result.summary,
  });
}
