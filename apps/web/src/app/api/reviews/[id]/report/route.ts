import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getReviewById, reportReview } from "@/lib/reviews/review-store";
import { getOrCreateUserId } from "@/lib/user-id";
import { createRateLimiter } from "@/lib/rate-limit";

const reviewReportRateLimiter = createRateLimiter({
  name: "review-report",
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/reviews/[id]/report
 *
 * Report a review for moderation
 *
 * Body:
 * - reason?: string (optional reason for reporting)
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
    return NextResponse.json({ error: "Review already reported." }, { status: 400 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    // Reason is optional, so empty body is fine
  }

  const reason = typeof payload.reason === "string" ? payload.reason.trim() : undefined;
  const { userId, cookie } = getOrCreateUserId(request);

  const reportRateLimit = await reviewReportRateLimiter.check(`user:${userId}`);
  if (!reportRateLimit.allowed) {
    const response = NextResponse.json(
      { error: "Too many report requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(reportRateLimit.retryAfterSeconds),
        },
      }
    );
    if (cookie) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
  }

  // Prevent self-reporting
  if (review.userId === userId) {
    return NextResponse.json({ error: "You cannot report your own review." }, { status: 400 });
  }

  const success = reportReview({
    reviewId,
    reporterId: userId,
    reason,
  });

  if (!success) {
    return NextResponse.json({ error: "Failed to report review." }, { status: 500 });
  }

  const response = NextResponse.json({
    success: true,
    message: "Thank you for your report. Our team will review it shortly.",
  });

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
