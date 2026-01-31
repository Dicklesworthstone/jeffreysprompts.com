import { NextRequest, NextResponse } from "next/server";
import { getPrompt } from "@jeffreysprompts/core/prompts";
import { getBundle } from "@jeffreysprompts/core/prompts/bundles";
import { getWorkflow } from "@jeffreysprompts/core/prompts/workflows";
import { createShareLink, type ShareContentType } from "@/lib/share-links/share-link-store";

const MAX_PASSWORD_LENGTH = 64;
const MAX_EXPIRES_IN_DAYS = 365;

const CONTENT_TYPE_MAP: Record<string, ShareContentType> = {
  prompt: "prompt",
  user_prompt: "prompt",
  bundle: "bundle",
  workflow: "workflow",
  collection: "collection",
};

function resolveContent(type: ShareContentType, id: string): unknown | null {
  switch (type) {
    case "prompt":
      return getPrompt(id) ?? null;
    case "bundle":
      return getBundle(id) ?? null;
    case "workflow":
      return getWorkflow(id) ?? null;
    case "collection":
      return null;
    default:
      return null;
  }
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

function getUserId(request: NextRequest): string | null {
  // SECURITY WARNING: trusting x-user-id from headers is unsafe unless behind a trusted proxy
  // that strips/overwrites this header. Ensure your deployment environment handles this.
  const headerId = request.headers.get("x-user-id")?.trim();
  if (headerId) return headerId;
  const queryId = request.nextUrl.searchParams.get("userId")?.trim();
  return queryId || null;
}

export async function POST(request: NextRequest) {
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

  const rawType = payload.contentType?.trim() ?? "";
  const contentId = payload.contentId?.trim() ?? "";
  const password = payload.password?.trim();

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

  const link = createShareLink({
    userId: getUserId(request),
    contentType: mappedType,
    contentId,
    password: password ?? null,
    expiresAt: expiresAt || null,
  });

  return NextResponse.json({
    linkCode: link.linkCode,
    url: `https://jeffreysprompts.com/share/${link.linkCode}`,
    expiresAt: link.expiresAt,
  });
}
