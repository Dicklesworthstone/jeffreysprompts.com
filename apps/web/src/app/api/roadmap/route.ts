import { NextResponse, type NextRequest } from "next/server";
import {
  getFeatures,
  getRoadmapByStatus,
  getRoadmapStats,
  submitFeature,
  type FeatureStatus,
} from "@/lib/roadmap/roadmap-store";
import { getOrCreateUserId } from "@/lib/user-id";

/**
 * GET /api/roadmap
 *
 * Get roadmap features with optional filtering and grouping.
 *
 * Query params:
 * - grouped: "true" to get features grouped by status
 * - status: filter by status (can be comma-separated)
 * - sortBy: "votes" | "newest" | "oldest"
 * - limit: max number of features
 * - stats: "true" to include statistics
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Check if grouped view is requested
  const grouped = searchParams.get("grouped") === "true";
  const includeStats = searchParams.get("stats") === "true";

  if (grouped) {
    const roadmap = getRoadmapByStatus();
    const response: Record<string, unknown> = { roadmap };

    if (includeStats) {
      response.stats = getRoadmapStats();
    }

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  }

  // Parse filter options with runtime validation
  const validStatuses = new Set<FeatureStatus>(["under_review", "planned", "in_progress", "shipped", "declined"]);
  const statusParam = searchParams.get("status");
  const filteredStatuses = statusParam
    ? statusParam.split(",").filter((s): s is FeatureStatus => validStatuses.has(s as FeatureStatus))
    : [];
  // Empty filter (all invalid values) = no filter, not "match nothing"
  const status = filteredStatuses.length > 0 ? filteredStatuses : undefined;

  const validSortBy = new Set(["votes", "newest", "oldest"]);
  const sortByParam = searchParams.get("sortBy");
  const sortBy = sortByParam && validSortBy.has(sortByParam)
    ? (sortByParam as "votes" | "newest" | "oldest")
    : undefined;

  const limitParam = searchParams.get("limit");
  const parsedLimit = limitParam ? parseInt(limitParam, 10) : undefined;
  const limit =
    parsedLimit !== undefined && Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : undefined;

  const features = getFeatures({ status, sortBy, limit });

  const response: Record<string, unknown> = { features };

  if (includeStats) {
    response.stats = getRoadmapStats();
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

/**
 * POST /api/roadmap
 *
 * Submit a new feature request.
 *
 * Body:
 * - title: string (required)
 * - description: string (required)
 * - useCase: string (optional)
 * - userName: string (optional)
 *
 * Uses the signed anonymous user cookie to track the submitter.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { title, description, useCase, userName } = body;

    if (!title || typeof title !== "string" || title.trim().length < 5) {
      return NextResponse.json(
        { error: "invalid_title", message: "Title must be at least 5 characters" },
        { status: 400 }
      );
    }

    if (
      !description ||
      typeof description !== "string" ||
      description.trim().length < 20
    ) {
      return NextResponse.json(
        {
          error: "invalid_description",
          message: "Description must be at least 20 characters",
        },
        { status: 400 }
      );
    }

    if (title.trim().length > 100) {
      return NextResponse.json(
        { error: "title_too_long", message: "Title must be 100 characters or less" },
        { status: 400 }
      );
    }

    if (description.trim().length > 2000) {
      return NextResponse.json(
        {
          error: "description_too_long",
          message: "Description must be 2000 characters or less",
        },
        { status: 400 }
      );
    }

    const { userId, cookie } = getOrCreateUserId(request);
    const feature = submitFeature({
      title: title.trim(),
      description: description.trim(),
      useCase: useCase?.trim(),
      submittedBy: userId,
      submittedByName: userName,
    });

    const response = NextResponse.json({ feature }, { status: 201 });

    if (cookie) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }

    return response;
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Invalid JSON body" },
      { status: 400 }
    );
  }
}
