import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRatingSummary, type RatingSummary } from "@/lib/ratings/rating-store";
import { prompts } from "@jeffreysprompts/core/prompts/registry";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

export interface LeaderboardEntry {
  prompt: Prompt;
  rating: RatingSummary;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  generated_at: string;
}

/**
 * GET /api/ratings/leaderboard
 *
 * Returns top-rated prompts sorted by approval rate.
 *
 * Query params:
 * - limit: Number of entries to return (default: 10, max: 50)
 * - minVotes: Minimum votes required to qualify (default: 1)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit");
  const minVotesParam = searchParams.get("minVotes");

  const limit = Math.min(Math.max(parseInt(limitParam ?? "10", 10) || 10, 1), 50);
  const minVotes = Math.max(parseInt(minVotesParam ?? "1", 10) || 1, 1);

  // Get ratings for all prompts
  const promptsWithRatings: LeaderboardEntry[] = [];

  for (const prompt of prompts) {
    const rating = getRatingSummary({ contentType: "prompt", contentId: prompt.id });
    if (rating.total >= minVotes) {
      promptsWithRatings.push({ prompt, rating });
    }
  }

  // Sort by approval rate (descending), then by total votes (descending) as tiebreaker
  promptsWithRatings.sort((a, b) => {
    if (b.rating.approvalRate !== a.rating.approvalRate) {
      return b.rating.approvalRate - a.rating.approvalRate;
    }
    return b.rating.total - a.rating.total;
  });

  // Take top entries
  const entries = promptsWithRatings.slice(0, limit);

  return NextResponse.json(
    {
      entries,
      generated_at: new Date().toISOString(),
    } satisfies LeaderboardResponse,
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
