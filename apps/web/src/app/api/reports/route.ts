import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createContentReport,
  hasRecentReport,
  isReportContentType,
  isReportReason,
} from "@/lib/reporting/report-store";
import { createRateLimiter, getTrustedClientIp } from "@/lib/rate-limit";

const MAX_DETAILS_LENGTH = 500;
const MAX_TITLE_LENGTH = 140;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const reportRateLimiter = createRateLimiter({
  name: "reports",
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: 10,
});

export async function POST(request: NextRequest) {
  const key = getTrustedClientIp(request);
  const rateLimit = await reportRateLimiter.check(key);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Report limit reached. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
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

  const normalizedTitle = typeof contentTitle === "string" ? contentTitle.trim() : undefined;
  if (normalizedTitle && normalizedTitle.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const normalizedDetails = typeof details === "string" ? details.trim() : undefined;
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
