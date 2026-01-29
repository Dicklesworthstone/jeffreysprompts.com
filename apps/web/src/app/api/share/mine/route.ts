import { NextRequest, NextResponse } from "next/server";
import { listShareLinks } from "@/lib/share-links/share-link-store";

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
}

function getUserId(request: NextRequest): string | null {
  const headerId = request.headers.get("x-user-id")?.trim();
  if (headerId) return headerId;
  const queryId = request.nextUrl.searchParams.get("userId")?.trim();
  return queryId || null;
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
  const links = listShareLinks({ userId, includeInactive });

  return NextResponse.json(
    {
      links: links.map((link) => ({
        code: link.linkCode,
        contentType: link.contentType,
        contentId: link.contentId,
        viewCount: link.viewCount,
        expiresAt: link.expiresAt,
        isExpired: isExpired(link.expiresAt),
        isActive: link.isActive,
        createdAt: link.createdAt,
        url: `https://jeffreysprompts.com/share/${link.linkCode}`,
      })),
    },
    {
      headers: {
        // User-specific data - prevent CDN caching
        "Cache-Control": "private, max-age=60",
      },
    }
  );
}
