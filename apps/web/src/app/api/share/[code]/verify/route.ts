import { NextRequest, NextResponse } from "next/server";
import { getPrompt } from "@jeffreysprompts/core/prompts";
import { getBundle } from "@jeffreysprompts/core/prompts/bundles";
import { getWorkflow } from "@jeffreysprompts/core/prompts/workflows";
import {
  getShareLinkByCode,
  recordShareLinkView,
  verifyPassword,
} from "@/lib/share-links/share-link-store";
import { createRateLimiter, getTrustedClientIp } from "@/lib/rate-limit";

// Rate limiting for password verification to prevent brute-force attacks
// More restrictive than general reports: 5 attempts per 15 minutes per IP+code combo
const MAX_ATTEMPTS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RATE_LIMIT_BUCKETS = 10_000;
const verifyRateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: MAX_ATTEMPTS_PER_WINDOW,
  maxBuckets: MAX_RATE_LIMIT_BUCKETS,
  name: "share-link-verify",
});

function getRateLimitKey(ip: string, code: string): string {
  // Rate limit per IP + share code combination to prevent targeted attacks
  return `${ip}:${code}`;
}

function resolveContent(contentType: string, contentId: string): unknown | null {
  if (contentType === "prompt") {
    return getPrompt(contentId) ?? null;
  }
  if (contentType === "bundle") {
    return getBundle(contentId) ?? null;
  }
  if (contentType === "workflow") {
    return getWorkflow(contentId) ?? null;
  }
  return null;
}

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) return true;
  return parsed.getTime() < Date.now();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode?.trim();
  if (!code) {
    return NextResponse.json({ error: "Missing share code." }, { status: 400 });
  }

  // Apply rate limiting BEFORE processing to prevent enumeration attacks
  const clientIp = getTrustedClientIp(request);
  const rateLimitKey = getRateLimitKey(clientIp, code);
  const rateLimitResult = await verifyRateLimiter.check(rateLimitKey);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": rateLimitResult.retryAfterSeconds.toString() },
      }
    );
  }

  let payload: { password?: string | null };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (payload.password === undefined || payload.password === null) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }
  if (typeof payload.password !== "string") {
    return NextResponse.json({ error: "Invalid password value." }, { status: 400 });
  }
  const passwordInput = payload.password.trim();
  if (!passwordInput) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const link = getShareLinkByCode(code);
  if (!link || !link.isActive) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  if (isExpired(link.expiresAt)) {
    return NextResponse.json({ error: "Share link expired." }, { status: 410 });
  }

  if (!verifyPassword(passwordInput, link.passwordHash)) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const content = resolveContent(link.contentType, link.contentId);
  if (!content) {
    return NextResponse.json({ error: "Shared content not found." }, { status: 404 });
  }

  recordShareLinkView({
    linkId: link.id,
    ip: getTrustedClientIp(request),
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
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
