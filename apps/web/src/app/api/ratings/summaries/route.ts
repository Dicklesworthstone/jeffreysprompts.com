import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRatingSummary, type RatingSummary, type RatingContentType } from "@/lib/ratings/rating-store";
import { prompts } from "@jeffreysprompts/core/prompts/registry";

export interface RatingSummariesResponse {
  summaries: Record<string, RatingSummary>;
  generated_at: string;
}

/**
 * GET /api/ratings/summaries
 *
 * Returns rating summaries for all prompts (or specified content type).
 * Used for sorting and filtering by rating in the UI.
 *
 * Query params:
 * - contentType: "prompt" | "bundle" | "workflow" | "collection" | "skill" (default: "prompt")
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const contentType = (searchParams.get("contentType") ?? "prompt") as RatingContentType;

  // Validate content type
  const validTypes: RatingContentType[] = ["prompt", "bundle", "workflow", "collection", "skill"];
  if (!validTypes.includes(contentType)) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 400 });
  }

  // Get all content IDs based on type
  let contentIds: string[] = [];
  if (contentType === "prompt") {
    contentIds = prompts.map((p) => p.id);
  }
  // For other types, we'd need to import those registries
  // For now, we only support prompts

  // Fetch summaries for all content items
  const summaries: Record<string, RatingSummary> = {};
  for (const contentId of contentIds) {
    const summary = getRatingSummary({ contentType, contentId });
    // Only include items with at least one vote
    if (summary.total > 0) {
      summaries[contentId] = summary;
    }
  }

  return NextResponse.json(
    {
      summaries,
      generated_at: new Date().toISOString(),
    } satisfies RatingSummariesResponse,
    {
      headers: {
        // Cache for 30 seconds on edge, allow stale while revalidate for 60s
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
