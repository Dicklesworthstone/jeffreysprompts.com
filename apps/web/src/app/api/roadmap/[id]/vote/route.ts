import { NextResponse, type NextRequest } from "next/server";
import {
  voteForFeature,
  unvoteFeature,
  getFeature,
} from "@/lib/roadmap/roadmap-store";

/**
 * POST /api/roadmap/[id]/vote
 *
 * Vote for a feature request.
 *
 * Body:
 * - userId: string (required)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "user_id_required", message: "User ID is required" },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      voteCount: result.voteCount,
    });
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/roadmap/[id]/vote
 *
 * Remove vote from a feature request.
 *
 * Body:
 * - userId: string (required)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "user_id_required", message: "User ID is required" },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      voteCount: result.voteCount,
    });
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }
}
