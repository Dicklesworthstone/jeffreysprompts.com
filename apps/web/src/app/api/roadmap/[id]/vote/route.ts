import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  voteForFeature,
  unvoteFeature,
  getFeature,
} from "@/lib/roadmap/roadmap-store";
import { getOrCreateUserId } from "@/lib/user-id";
import { checkMultipleLimits, createRateLimiter, getTrustedClientIp } from "@/lib/rate-limit";

const roadmapVoteRateLimiter = createRateLimiter({
  name: "roadmap-vote",
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
});

function getRoadmapVoteFingerprint(request: NextRequest): string {
  const clientIp = getTrustedClientIp(request);
  const userAgent = request.headers.get("user-agent")?.slice(0, 256) ?? "unknown";

  // Clearing the anonymous cookie should not mint a fresh vote identity for
  // the same client, so we keep a coarse per-client fingerprint for duplicate
  // vote suppression only. It is not strong enough to authorize unvoting on
  // behalf of a different anonymous user behind the same NAT/browser profile.
  return createHash("sha256")
    .update(`${clientIp}\n${userAgent}`)
    .digest("hex");
}

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
  const clientFingerprint = getRoadmapVoteFingerprint(request);
  const voteRateLimit = await checkMultipleLimits([
    { limiter: roadmapVoteRateLimiter, key: `user:${userId}` },
    { limiter: roadmapVoteRateLimiter, key: `client:${clientFingerprint}` },
  ]);
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

  const result = voteForFeature(id, userId, { clientFingerprint });

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
  const clientFingerprint = getRoadmapVoteFingerprint(request);
  const voteRateLimit = await checkMultipleLimits([
    { limiter: roadmapVoteRateLimiter, key: `user:${userId}` },
    { limiter: roadmapVoteRateLimiter, key: `client:${clientFingerprint}` },
  ]);
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

  const result = unvoteFeature(id, userId, { clientFingerprint });

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
