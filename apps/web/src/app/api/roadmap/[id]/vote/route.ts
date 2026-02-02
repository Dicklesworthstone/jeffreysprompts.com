import { NextResponse, type NextRequest } from "next/server";
import {
  voteForFeature,
  unvoteFeature,
  getFeature,
} from "@/lib/roadmap/roadmap-store";
import { getOrCreateUserId } from "@/lib/user-id";

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
