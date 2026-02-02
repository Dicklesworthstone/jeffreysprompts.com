import { NextRequest, NextResponse } from "next/server";
import { getPrompt } from "@jeffreysprompts/core/prompts";
import { getBundle } from "@jeffreysprompts/core/prompts/bundles";
import { getWorkflow } from "@jeffreysprompts/core/prompts/workflows";
import {
  getShareLinkByCode,
  recordShareLinkView,
  revokeShareLink,
  updateShareLinkSettings,
  type ShareLink,
} from "@/lib/share-links/share-link-store";
import { getUserIdFromRequest } from "@/lib/user-id";

const MAX_PASSWORD_LENGTH = 64;
const MAX_EXPIRES_IN_DAYS = 365;

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
}

function isOwner(link: ShareLink, userId: string | null): boolean {
  if (!userId) return false;
  if (!link.userId) return false;
  return link.userId === userId;
}

function resolveContent(contentType: string, contentId: string): unknown | null {
  if (contentType === "prompt") return getPrompt(contentId) ?? null;
  if (contentType === "bundle") return getBundle(contentId) ?? null;
  if (contentType === "workflow") return getWorkflow(contentId) ?? null;
  return null;
}

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return true;
  return parsed.getTime() < Date.now();
}

function parseExpiresAt(
  value: unknown
): string | null | "invalid" | "past" | "too_long" | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "invalid";
  if (parsed.getTime() < Date.now()) return "past";
  if (parsed.getTime() - Date.now() > MAX_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000) {
    return "too_long";
  }
  return parsed.toISOString();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode?.trim();
  if (!code) {
    return NextResponse.json({ error: "Missing share code." }, { status: 400 });
  }

  const link = getShareLinkByCode(code);
  if (!link || !link.isActive) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  if (isExpired(link.expiresAt)) {
    return NextResponse.json({ error: "Share link expired." }, { status: 410 });
  }

  if (link.passwordHash) {
    return NextResponse.json({ requiresPassword: true }, { status: 401 });
  }

  const content = resolveContent(link.contentType, link.contentId);
  if (!content) {
    return NextResponse.json({ error: "Shared content not found." }, { status: 404 });
  }

  recordShareLinkView({
    linkId: link.id,
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json(
    {
      link: {
        code: link.linkCode,
        contentType: link.contentType,
        contentId: link.contentId,
        viewCount: link.viewCount,
        expiresAt: link.expiresAt,
        createdAt: link.createdAt,
      },
      content,
    },
    {
      headers: {
        // Public share links - short cache since view count updates
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode?.trim();
  if (!code) {
    return NextResponse.json({ error: "Missing share code." }, { status: 400 });
  }

  const existing = getShareLinkByCode(code);
  if (!existing || !existing.isActive) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  const userId = getUserIdFromRequest(request);
  if (!isOwner(existing, userId)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  let payload: { password?: string | null; expiresAt?: string | null };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let password: string | null | undefined;
  if (payload.password === undefined) {
    password = undefined;
  } else if (payload.password === null) {
    password = null;
  } else if (typeof payload.password === "string") {
    password = payload.password.trim();
  } else {
    return NextResponse.json({ error: "Invalid password value." }, { status: 400 });
  }

  if (password && password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const parsedExpiresAt = parseExpiresAt(payload.expiresAt);
  if (parsedExpiresAt === "invalid") {
    return NextResponse.json({ error: "Invalid expiration date." }, { status: 400 });
  }
  if (parsedExpiresAt === "past") {
    return NextResponse.json({ error: "Expiration must be in the future." }, { status: 400 });
  }
  if (parsedExpiresAt === "too_long") {
    return NextResponse.json(
      { error: `Expiration must be ${MAX_EXPIRES_IN_DAYS} days or fewer.` },
      { status: 400 }
    );
  }

  const updated = updateShareLinkSettings({
    code,
    password: password === "" ? null : password,
    expiresAt: parsedExpiresAt === undefined ? undefined : parsedExpiresAt,
  });

  if (!updated) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  return NextResponse.json({
    link: {
      code: updated.linkCode,
      contentType: updated.contentType,
      contentId: updated.contentId,
      viewCount: updated.viewCount,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
      isActive: updated.isActive,
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode?.trim();
  if (!code) {
    return NextResponse.json({ error: "Missing share code." }, { status: 400 });
  }

  const existing = getShareLinkByCode(code);
  if (!existing || !existing.isActive) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  const userId = getUserIdFromRequest(request);
  if (!isOwner(existing, userId)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  const revoked = revokeShareLink(code);
  if (!revoked) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    link: {
      code: revoked.linkCode,
      isActive: revoked.isActive,
    },
  });
}
