import { NextResponse, type NextRequest } from "next/server";
import {
  voteForFeature,
  unvoteFeature,
  getFeature,
} from "@/lib/roadmap/roadmap-store";
import { getOrCreateUserId } from "@/lib/user-id";
import { createRateLimiter } from "@/lib/rate-limit";

const roadmapVoteRateLimiter = createRateLimiter({
  name: "roadmap-vote",
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
});

/**
 * POST /api/roadmap/[id]/vote
 *
 * Vote for a feature request.
 *
 * Uses the signed anonymous user cookie to identify the voter.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { userId, cookie } = getOrCreateUserId(request);
  const voteRateLimit = await roadmapVoteRateLimiter.check(`user:${userId}`);
  if (!voteRateLimit.allowed) {
    const response = NextResponse.json(
      { error: "Too many vote requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(voteRateLimit.retryAfterSeconds) },
      }
    );
    if (cookie) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
  }

  const feature = getFeature(id);
  if (!feature) {
    return NextResponse.json(
      { error: "not_found", message: "Feature not found" },
      { status: 404 }
    );
  }

  const result = voteForFeature(id, userId);

  if (!result.success) {
    return NextResponse.json(
      { error: "vote_failed", message: result.error },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    success: true,
    voteCount: result.voteCount,
  });

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

/**
 * DELETE /api/roadmap/[id]/vote
 *
 * Remove vote from a feature request.
 *
 * Uses the signed anonymous user cookie to identify the voter.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { userId, cookie } = getOrCreateUserId(request);
  const voteRateLimit = await roadmapVoteRateLimiter.check(`user:${userId}`);
  if (!voteRateLimit.allowed) {
    const response = NextResponse.json(
      { error: "Too many vote requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(voteRateLimit.retryAfterSeconds) },
      }
    );
    if (cookie) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
  }

  const feature = getFeature(id);
  if (!feature) {
    return NextResponse.json(
      { error: "not_found", message: "Feature not found" },
      { status: 404 }
    );
  }

  const result = unvoteFeature(id, userId);

  if (!result.success) {
    const status = result.error === "Feature not found" ? 404 : 400;
    return NextResponse.json(
      { error: "unvote_failed", message: result.error ?? "Unable to remove vote" },
      { status }
    );
  }

  const response = NextResponse.json({
    success: true,
    voteCount: result.voteCount,
  });

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
