import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getRatingSummary,
  getUserRating,
  isRatingContentType,
  submitRating,
} from "@/lib/ratings/rating-store";

const MAX_ID_LENGTH = 200;
const MAX_USER_ID_LENGTH = 200;

function normalizeText(value: string) {
  return value.trim();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const contentType = normalizeText(searchParams.get("contentType") ?? "");
  const contentId = normalizeText(searchParams.get("contentId") ?? "");
  const userId = normalizeText(searchParams.get("userId") ?? "");

  if (!contentType || !contentId) {
    return NextResponse.json({ error: "contentType and contentId are required." }, { status: 400 });
  }

  if (!isRatingContentType(contentType)) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 400 });
  }

  if (contentId.length > MAX_ID_LENGTH) {
    return NextResponse.json({ error: "Invalid content id." }, { status: 400 });
  }

  if (userId && userId.length > MAX_USER_ID_LENGTH) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const summary = getRatingSummary({ contentType, contentId });
  const userRating = userId ? getUserRating({ contentType, contentId, userId }) : null;

  // If userId was provided, the response includes user-specific data
  const cacheControl = userId
    ? "private, max-age=30"
    : "public, s-maxage=30, stale-while-revalidate=60";

  return NextResponse.json(
    {
      summary,
      userRating,
    },
    {
      headers: {
        "Cache-Control": cacheControl,
      },
    }
  );
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const contentType = typeof payload.contentType === "string" ? normalizeText(payload.contentType) : "";
  const contentId = typeof payload.contentId === "string" ? normalizeText(payload.contentId) : "";
  const userId = typeof payload.userId === "string" ? normalizeText(payload.userId) : "";
  const value = typeof payload.value === "string" ? normalizeText(payload.value) : "";

  if (!contentType || !contentId || !userId || !value) {
    return NextResponse.json(
      { error: "contentType, contentId, userId, and value are required." },
      { status: 400 }
    );
  }

  if (!isRatingContentType(contentType)) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 400 });
  }

  if (contentId.length > MAX_ID_LENGTH || userId.length > MAX_USER_ID_LENGTH) {
    return NextResponse.json({ error: "Invalid identifiers." }, { status: 400 });
  }

  if (value !== "up" && value !== "down") {
    return NextResponse.json({ error: "Invalid rating value." }, { status: 400 });
  }

  const result = submitRating({
    contentType,
    contentId,
    userId,
    value: value === "up" ? "up" : "down",
  });

  return NextResponse.json({
    success: true,
    rating: result.rating,
    summary: result.summary,
  });
}
