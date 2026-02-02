import { NextResponse, type NextRequest } from "next/server";
import {
  getFeature,
  getFeatureComments,
  hasUserVoted,
} from "@/lib/roadmap/roadmap-store";
import { getUserIdFromRequest } from "@/lib/user-id";

/**
 * GET /api/roadmap/[id]
 *
 * Get a single feature request with comments.
 *
 * Uses the signed anonymous user cookie to include voting status.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const feature = getFeature(id);

  if (!feature) {
    return NextResponse.json(
      { error: "not_found", message: "Feature not found" },
      { status: 404 }
    );
  }

  const comments = getFeatureComments(id);

  // Check if user has voted
  const userId = getUserIdFromRequest(request);
  const hasVoted = userId ? hasUserVoted(id, userId) : false;

  const cacheControl = userId
    ? "private, max-age=30"
    : "public, s-maxage=30, stale-while-revalidate=60";

  return NextResponse.json(
    {
      feature,
      comments,
      hasVoted,
    },
    {
      headers: {
        "Cache-Control": cacheControl,
      },
    }
  );
}
