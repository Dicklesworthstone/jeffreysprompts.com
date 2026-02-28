import { NextRequest, NextResponse } from "next/server";
import { getPrompt } from "@jeffreysprompts/core/prompts";
import { getBundle } from "@jeffreysprompts/core/prompts/bundles";
import { getWorkflow } from "@jeffreysprompts/core/prompts/workflows";
import { createShareLink, type ShareContentType } from "@/lib/share-links/share-link-store";
import { getOrCreateUserId } from "@/lib/user-id";
import { createRateLimiter, getTrustedClientIp } from "@/lib/rate-limit";

const MAX_PASSWORD_LENGTH = 64;
const MAX_EXPIRES_IN_DAYS = 365;

const MAX_CREATIONS_PER_WINDOW = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_RATE_LIMIT_BUCKETS = 10_000;
const shareCreationLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: MAX_CREATIONS_PER_WINDOW,
  maxBuckets: MAX_RATE_LIMIT_BUCKETS,
  name: "share-link-creation",
});

const CONTENT_TYPE_MAP: Record<string, ShareContentType> = {
  prompt: "prompt",
  user_prompt: "prompt",
  bundle: "bundle",
  pack: "bundle",     // ShareDialog sends "pack" for bundles
  workflow: "workflow",
  skill: "prompt",    // ShareDialog sends "skill" for individual prompts
  // "collection" is defined in ShareContentType but not yet resolvable
  // (no getCollection function exists). Uncomment when collections are implemented.
};

function resolveContent(type: ShareContentType, id: string): unknown | null {
  if (type === "prompt") return getPrompt(id) ?? null;
  if (type === "bundle") return getBundle(id) ?? null;
  if (type === "workflow") return getWorkflow(id) ?? null;
  return null;
}

function parseExpiresAt(
  payload: { expiresIn?: unknown; expiresAt?: unknown }
): string | null | "invalid" | "too_long" | "past" {
  if (payload.expiresAt !== undefined && payload.expiresAt !== null) {
    if (typeof payload.expiresAt !== "string") return "invalid";
    const candidate = payload.expiresAt.trim();
    if (!candidate) return null;
    const parsed = new Date(candidate);
    if (Number.isNaN(parsed.getTime())) return "invalid";
    if (parsed.getTime() < Date.now()) return "past";
    if (parsed.getTime() - Date.now() > MAX_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000) {
      return "too_long";
    }
    return parsed.toISOString();
  }

  if (payload.expiresIn === undefined || payload.expiresIn === null || payload.expiresIn === "") {
    return null;
  }

  const expiresInValue = payload.expiresIn;
  const days = typeof expiresInValue === "string"
    ? Number(expiresInValue)
    : typeof expiresInValue === "number"
    ? expiresInValue
    : NaN;
  // Allow fractional days (e.g. 0.5 = 12 hours)
  if (!Number.isFinite(days) || days <= 0) return "invalid";
  if (days > MAX_EXPIRES_IN_DAYS) return "too_long";

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return expiresAt.toISOString();
}

export async function POST(request: NextRequest) {
  const clientIp = getTrustedClientIp(request);
  const rateLimitResult = await shareCreationLimiter.check(clientIp);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many share links created. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": rateLimitResult.retryAfterSeconds.toString() },
      }
    );
  }

  let payload: {
    contentType?: string;
    contentId?: string;
    password?: string | null;
    expiresIn?: number | string | null;
    expiresAt?: string | null;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawType = typeof payload.contentType === "string" ? payload.contentType.trim() : "";
  const contentId = typeof payload.contentId === "string" ? payload.contentId.trim() : "";
  let password: string | null = null;
  if (payload.password === undefined || payload.password === null) {
    password = null;
  } else if (typeof payload.password === "string") {
    password = payload.password.trim();
  } else {
    return NextResponse.json({ error: "Invalid password value." }, { status: 400 });
  }

  if (!rawType || !contentId) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const mappedType = CONTENT_TYPE_MAP[rawType];
  if (!mappedType) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 400 });
  }

  if (password && password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  if (!resolveContent(mappedType, contentId)) {
    return NextResponse.json({ error: "Content not found." }, { status: 404 });
  }

  const expiresAt = parseExpiresAt({ expiresIn: payload.expiresIn, expiresAt: payload.expiresAt });
  if (expiresAt === "invalid") {
    return NextResponse.json({ error: "Invalid expiration value." }, { status: 400 });
  }
  if (expiresAt === "past") {
    return NextResponse.json({ error: "Expiration must be in the future." }, { status: 400 });
  }
  if (expiresAt === "too_long") {
    return NextResponse.json(
      { error: `Expiration must be ${MAX_EXPIRES_IN_DAYS} days or fewer.` },
      { status: 400 }
    );
  }

  const { userId, cookie } = getOrCreateUserId(request);
  const link = createShareLink({
    userId,
    contentType: mappedType,
    contentId,
    password: password === "" ? null : password,
    expiresAt: expiresAt || null,
  });

  const response = NextResponse.json({
    linkCode: link.linkCode,
    url: `${request.nextUrl.origin}/share/${link.linkCode}`,
    expiresAt: link.expiresAt,
  });

  if (cookie) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
