import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  createAppeal,
  canAppealAction,
  getAppeal,
} from "@/lib/moderation/appeal-store";
import { getModerationAction } from "@/lib/moderation/action-store";
import { checkContentForSpam } from "@/lib/moderation/spam-check";
import { getUserIdFromRequest } from "@/lib/user-id";
import { createRateLimiter, getTrustedClientIp } from "@/lib/rate-limit";

const appealRateLimiter = createRateLimiter({
  name: "appeals",
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
});

/** Constant-time token comparison to prevent timing attacks */
function safeTokenEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf); // constant-time even on length mismatch
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EXPLANATION_LENGTH = 2000;
const MIN_EXPLANATION_LENGTH = 50;

/**
 * POST /api/appeals
 * Submit a new moderation appeal.
 *
 * Body:
 * - actionId: string - The moderation action being appealed
 * - userId: string - The user's ID
 * - userEmail: string - The user's email
 * - userName: string (optional) - The user's display name
 * - explanation: string - Why the user is appealing (50-2000 chars)
 */
export async function POST(request: NextRequest) {
  const clientIp = getTrustedClientIp(request);
  const rateLimit = await appealRateLimiter.check(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests", message: "You have exceeded the maximum number of appeals." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let payload: {
    actionId?: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
    explanation?: string;
    company?: string; // honeypot
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const actionId = typeof payload.actionId === "string" ? payload.actionId.trim() : "";
  const userId = typeof payload.userId === "string" ? payload.userId.trim() : "";
  const userEmail = typeof payload.userEmail === "string" ? payload.userEmail.trim().toLowerCase() : "";
  const userName = typeof payload.userName === "string" ? payload.userName.trim() : "";
  const explanation = typeof payload.explanation === "string" ? payload.explanation.trim() : "";
  const honeypot = typeof payload.company === "string" ? payload.company.trim() : undefined;

  // Honeypot check
  if (honeypot) {
    return NextResponse.json({ error: "Spam detected." }, { status: 400 });
  }

  // Validate required fields
  if (!actionId || !userEmail || !explanation) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!EMAIL_REGEX.test(userEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (explanation.length < MIN_EXPLANATION_LENGTH) {
    return NextResponse.json(
      { error: `Explanation must be at least ${MIN_EXPLANATION_LENGTH} characters.` },
      { status: 400 }
    );
  }

  if (explanation.length > MAX_EXPLANATION_LENGTH) {
    return NextResponse.json(
      { error: `Explanation must be ${MAX_EXPLANATION_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  // Verify the action exists
  const action = getModerationAction(actionId);
  if (!action) {
    return NextResponse.json({ error: "Moderation action not found." }, { status: 404 });
  }

  // Authorize with signed user cookie to avoid trusting client-submitted userId.
  const requesterUserId = getUserIdFromRequest(request);
  if (!requesterUserId) {
    return NextResponse.json({ error: "Authentication required to submit an appeal." }, { status: 401 });
  }
  if (requesterUserId !== action.userId) {
    return NextResponse.json({ error: "You cannot appeal this action." }, { status: 403 });
  }
  if (userId && userId !== requesterUserId) {
    return NextResponse.json({ error: "User identity mismatch." }, { status: 403 });
  }

  // Check if appeal is allowed
  const appealCheck = canAppealAction(actionId, action.createdAt);
  if (!appealCheck.canAppeal) {
    return NextResponse.json(
      { error: appealCheck.reason ?? "Cannot appeal this action." },
      { status: 400 }
    );
  }

  // Check for spam
  const spamCheck = checkContentForSpam(explanation);
  if (spamCheck.isSpam) {
    return NextResponse.json(
      {
        error: "Your explanation was flagged as potential spam. Please revise and try again.",
        reasons: spamCheck.reasons,
      },
      { status: 400 }
    );
  }

  // Create the appeal
  const result = createAppeal({
    actionId,
    userId: requesterUserId,
    userEmail,
    userName: userName || null,
    explanation,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    appeal: {
      id: result.id,
      accessToken: result.accessToken,
      actionId: result.actionId,
      status: result.status,
      submittedAt: result.submittedAt,
      deadlineAt: result.deadlineAt,
    },
    message: "Your appeal has been submitted and will be reviewed.",
  });
}

/**
 * GET /api/appeals
 * Get appeals for a user, or a specific appeal by ID.
 *
 * Query params:
 * - appealId: Get a specific appeal
 * - appealToken: Required access token for the appeal
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const appealId = searchParams.get("appealId")?.trim() ?? "";
  const appealToken = searchParams.get("appealToken")?.trim() ?? "";

  if (!appealId || !appealToken) {
    return NextResponse.json(
      { error: "appealId and appealToken are required." },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const appeal = getAppeal(appealId);
  if (!appeal || !safeTokenEqual(appeal.accessToken, appealToken)) {
    return NextResponse.json(
      { error: "Appeal not found." },
      { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const action = getModerationAction(appeal.actionId);

  return NextResponse.json(
    {
      appeal: {
        id: appeal.id,
        actionId: appeal.actionId,
        status: appeal.status,
        explanation: appeal.explanation,
        submittedAt: appeal.submittedAt,
        deadlineAt: appeal.deadlineAt,
        reviewedAt: appeal.reviewedAt,
        adminResponse: appeal.adminResponse,
        action: action
          ? {
              actionType: action.actionType,
              reason: action.reason,
              details: action.details,
              createdAt: action.createdAt,
            }
          : null,
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
