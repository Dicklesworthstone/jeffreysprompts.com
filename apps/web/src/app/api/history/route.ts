import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearHistory, listHistory, recordView } from "@/lib/history/history-store";
import { isHistoryResourceType } from "@/lib/history/types";

const MAX_ID_LENGTH = 200;
const MAX_USER_ID_LENGTH = 200;
const MAX_SOURCE_LENGTH = 100;
const MAX_QUERY_LENGTH = 500;
const MAX_LIMIT = 100;

function normalizeText(value: string) {
  return value.trim();
}

function getUserId(request: NextRequest): string | null {
  const headerId = request.headers.get("x-user-id")?.trim();
  if (headerId) return headerId;
  const queryId = request.nextUrl.searchParams.get("userId")?.trim();
  return queryId || null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = getUserId(request) ?? "";
  const resourceType = searchParams.get("resourceType") ?? "";
  const limitParam = searchParams.get("limit") ?? "";

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  if (userId.length > MAX_USER_ID_LENGTH) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  const parsedLimit = limitParam ? Number(limitParam) : NaN;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(1, parsedLimit), MAX_LIMIT)
    : 20;

  if (resourceType && !isHistoryResourceType(resourceType)) {
    return NextResponse.json({ error: "Invalid resource type." }, { status: 400 });
  }

  // After validation, narrow the type for TypeScript
  const validResourceType = resourceType && isHistoryResourceType(resourceType) ? resourceType : null;

  const items = listHistory({
    userId,
    resourceType: validResourceType,
    limit,
  });

  return NextResponse.json(
    {
      items,
      count: items.length,
    },
    {
      headers: {
        // User-specific data - prevent CDN caching, allow browser caching
        "Cache-Control": "private, max-age=60",
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

  const userId = typeof payload.userId === "string" ? normalizeText(payload.userId) : "";
  const resourceType =
    typeof payload.resourceType === "string" ? normalizeText(payload.resourceType) : "";
  const resourceId =
    typeof payload.resourceId === "string" ? normalizeText(payload.resourceId) : "";
  const searchQuery =
    typeof payload.searchQuery === "string" ? normalizeText(payload.searchQuery) : "";
  const source = typeof payload.source === "string" ? normalizeText(payload.source) : "";

  if (!userId || !resourceType) {
    return NextResponse.json(
      { error: "userId and resourceType are required." },
      { status: 400 }
    );
  }

  if (userId.length > MAX_USER_ID_LENGTH) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  if (!isHistoryResourceType(resourceType)) {
    return NextResponse.json({ error: "Invalid resource type." }, { status: 400 });
  }

  if (resourceType !== "search") {
    if (!resourceId) {
      return NextResponse.json({ error: "resourceId is required." }, { status: 400 });
    }
    if (resourceId.length > MAX_ID_LENGTH) {
      return NextResponse.json({ error: "Invalid resource id." }, { status: 400 });
    }
  } else if (!searchQuery) {
    return NextResponse.json({ error: "searchQuery is required." }, { status: 400 });
  }

  if (searchQuery.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: "Search query too long." }, { status: 400 });
  }

  if (source && source.length > MAX_SOURCE_LENGTH) {
    return NextResponse.json({ error: "Invalid source." }, { status: 400 });
  }

  const item = recordView({
    userId,
    resourceType,
    resourceId: resourceId || null,
    searchQuery: searchQuery || null,
    source: source || null,
  });

  return NextResponse.json({
    success: true,
    item,
  });
}

export async function DELETE(request: NextRequest) {
  const userId = getUserId(request) ?? "";

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  if (userId.length > MAX_USER_ID_LENGTH) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
  }

  clearHistory(userId);

  return NextResponse.json({ success: true });
}
