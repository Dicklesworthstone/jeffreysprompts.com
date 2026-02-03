import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getReviewById,
  submitAuthorResponse,
  deleteAuthorResponse,
  RESPONSE_MAX_LENGTH,
} from "@/lib/reviews/review-store";
import { getUserIdFromRequest } from "@/lib/user-id";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/reviews/[id]/respond
 *
 * Add or update an author response to a review
 *
 * Body:
 * - content: string (response text, max 1000 chars)
 *
 * SECURITY NOTE: This endpoint currently requires server-side author verification.
 * The contentId from the review is used to look up the actual content author.
 * For MVP without a user/content ownership system, this is disabled.
 */
export async function POST(request: NextRequest, context: RouteParams) {
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

  // SECURITY: Author verification is disabled for MVP.
  // In production, this should verify the user owns the content being reviewed
  // by checking against a content ownership database/service.
  //
  // DO NOT trust client headers like x-content-author-id - they can be spoofed.
  // The proper implementation would be:
  //   const content = await getContentById(review.contentId);
  //   const isAuthor = content?.authorId === userId;
  //
  // For now, author responses are disabled in production to prevent abuse.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Author responses are not available yet." },
      { status: 403 }
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const content = typeof payload.content === "string" ? payload.content.trim() : "";

  if (!content) {
    return NextResponse.json({ error: "Response content is required." }, { status: 400 });
  }

  if (content.length < 5) {
    return NextResponse.json(
      { error: "Response must be at least 5 characters." },
      { status: 400 }
    );
  }

  if (content.length > RESPONSE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Response exceeds maximum length of ${RESPONSE_MAX_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const result = submitAuthorResponse({
    reviewId,
    authorId: userId,
    content,
  });

  if (!result) {
    return NextResponse.json({ error: "Failed to submit response." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    review: result.review,
    response: result.response,
  });
}

/**
 * DELETE /api/reviews/[id]/respond
 *
 * Delete an author response
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

  if (!review.authorResponse) {
    return NextResponse.json({ error: "No response to delete." }, { status: 404 });
  }

  if (review.authorResponse.authorId !== userId) {
    return NextResponse.json(
      { error: "You can only delete your own responses." },
      { status: 403 }
    );
  }

  const success = deleteAuthorResponse({
    reviewId,
    authorId: userId,
  });

  if (!success) {
    return NextResponse.json({ error: "Failed to delete response." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
