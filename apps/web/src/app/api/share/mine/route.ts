import { NextRequest, NextResponse } from "next/server";
import { listShareLinks } from "@/lib/share-links/share-link-store";
import { getOrCreateUserId } from "@/lib/user-id";

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
}

export async function GET(request: NextRequest) {
  const { userId, cookie } = getOrCreateUserId(request);

  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
  const links = listShareLinks({ userId, includeInactive });

  const response = NextResponse.json(
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

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
