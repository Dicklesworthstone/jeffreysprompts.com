import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createContentReport,
  hasRecentReport,
  isReportContentType,
  isReportReason,
} from "@/lib/reporting/report-store";

const MAX_DETAILS_LENGTH = 500;
const MAX_TITLE_LENGTH = 140;
const MAX_REPORTS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return ip;
}

function getRateLimitBucket(key: string, now: number) {
  const existing = rateLimitBuckets.get(key);
  if (!existing || now > existing.resetAt) {
    const bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitBuckets.set(key, bucket);
    return bucket;
  }
  return existing;
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const key = getClientKey(request);
  const bucket = getRateLimitBucket(key, now);
  bucket.count += 1;

  if (bucket.count > MAX_REPORTS_PER_WINDOW) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Report limit reached. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": retryAfterSeconds.toString() },
      }
    );
  }

  let payload: {
    contentType?: string;
    contentId?: string;
    contentTitle?: string;
    reason?: string;
    details?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { contentType, contentId, contentTitle, reason, details } = payload ?? {};

  if (!contentType || !contentId || !reason) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!isReportContentType(contentType)) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 400 });
  }

  if (!isReportReason(reason)) {
    return NextResponse.json({ error: "Invalid reason value." }, { status: 400 });
  }

  const normalizedTitle = contentTitle?.trim();
  if (normalizedTitle && normalizedTitle.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const normalizedDetails = details?.trim();
  if (normalizedDetails && normalizedDetails.length > MAX_DETAILS_LENGTH) {
    return NextResponse.json(
      { error: "Details must be 500 characters or fewer." },
      { status: 400 }
    );
  }

  if (hasRecentReport({
    contentType,
    contentId,
    reporterId: key,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })) {
    return NextResponse.json(
      { error: "You already reported this content recently. Thank you for helping keep the community safe." },
      { status: 409 }
    );
  }

  const report = createContentReport({
    contentType,
    contentId,
    contentTitle: normalizedTitle ?? null,
    reason,
    details: normalizedDetails ?? null,
    reporter: {
      id: key,
      ip: key,
    },
  });

  return NextResponse.json({
    success: true,
    reportId: report.id,
    content: {
      type: contentType,
      id: contentId,
      title: normalizedTitle ?? null,
    },
  });
}
