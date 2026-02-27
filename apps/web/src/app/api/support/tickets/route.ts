import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import {
  SUPPORT_EMAIL,
  isSupportCategory,
  isSupportPriority,
} from "@/lib/support/tickets";
import {
  addSupportTicketReply,
  addSupportTicketNote,
  createSupportTicket,
  getSupportTicket,
} from "@/lib/support/ticket-store";
import { checkContentForSpam } from "@/lib/moderation/spam-check";
import { createRateLimiter, checkMultipleLimits, getTrustedClientIp } from "@/lib/rate-limit";

/** Constant-time token comparison to prevent timing attacks */
function safeTokenEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  const maxLen = Math.max(aBuf.length, bBuf.length);
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);
  aBuf.copy(paddedA);
  bBuf.copy(paddedB);
  const equal = timingSafeEqual(paddedA, paddedB);
  return equal && aBuf.length === bBuf.length;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 80;
const MAX_SUBJECT_LENGTH = 140;
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Rate limiters for support ticket creation.
 *
 * LIMITATION: These use in-memory storage which resets on Vercel deployments
 * and serverless cold starts. This provides per-instance protection only.
 * For stronger protection, configure Upstash Redis via environment variables.
 *
 * @see /src/lib/rate-limit/rate-limiter.ts for upgrade instructions
 */
const ipRateLimiter = createRateLimiter({
  name: "support-ip",
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 5,
});

const emailRateLimiter = createRateLimiter({
  name: "support-email",
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 5,
});

const lookupRateLimiter = createRateLimiter({
  name: "support-lookup-ip",
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 40,
});

const replyIpRateLimiter = createRateLimiter({
  name: "support-reply-ip",
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
});

const replyTicketRateLimiter = createRateLimiter({
  name: "support-reply-ticket",
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 15,
});

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export async function POST(request: NextRequest) {
  let payload: {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    category?: string;
    priority?: string;
    company?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = payload.name?.trim() ?? "";
  const email = payload.email?.trim().toLowerCase() ?? "";
  const subject = normalizeText(payload.subject ?? "");
  const message = normalizeText(payload.message ?? "");
  const category = payload.category ?? "";
  const priority = payload.priority ?? "";
  const honeypot = payload.company?.trim();

  if (honeypot) {
    return NextResponse.json({ error: "Spam detected." }, { status: 400 });
  }

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` }, { status: 400 });
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (subject.length > MAX_SUBJECT_LENGTH) {
    return NextResponse.json(
      { error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const rateLimitResult = await checkMultipleLimits([
    { limiter: ipRateLimiter, key: `ip:${getTrustedClientIp(request)}` },
    { limiter: emailRateLimiter, key: `email:${email}` },
  ]);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Support request limit reached. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": rateLimitResult.retryAfterSeconds.toString() },
      }
    );
  }

  if (!isSupportCategory(category) || !isSupportPriority(priority)) {
    return NextResponse.json({ error: "Invalid category or priority." }, { status: 400 });
  }

  const spamCheck = checkContentForSpam(`${subject}\n\n${message}`);
  if (spamCheck.isSpam) {
    return NextResponse.json(
      {
        error: "Your message was flagged as potential spam. Please remove links or excessive formatting and try again.",
        reasons: spamCheck.reasons,
      },
      { status: 400 }
    );
  }

  const ticket = createSupportTicket({
    name,
    email,
    subject,
    message,
    category,
    priority,
    status: spamCheck.requiresReview ? "pending" : "open",
  });

  if (spamCheck.requiresReview) {
    addSupportTicketNote({
      ticketNumber: ticket.ticketNumber,
      author: "support",
      body: `Auto-flagged for review (${Math.round(spamCheck.confidence * 100)}% confidence): ${spamCheck.reasons.join("; ")}`,
    });
  }

  // In production, send confirmation email and notify support staff here.

  return NextResponse.json({
    success: true,
    ticket: {
      ticketNumber: ticket.ticketNumber,
      accessToken: ticket.accessToken,
      status: ticket.status,
      category: ticket.category,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      supportEmail: SUPPORT_EMAIL,
    },
    reviewRequired: spamCheck.requiresReview,
    message: "Support request received.",
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticketNumber = searchParams.get("ticketNumber")?.trim().toUpperCase() ?? "";
  const ticketToken = searchParams.get("ticketToken")?.trim() ?? "";

  const lookupLimit = await lookupRateLimiter.check(`ip:${getTrustedClientIp(request)}`);
  if (!lookupLimit.allowed) {
    return NextResponse.json(
      { error: "Too many lookup requests. Please try again later." },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": lookupLimit.retryAfterSeconds.toString(),
        },
      }
    );
  }

  if (!ticketNumber || !ticketToken) {
    return NextResponse.json(
      { error: "ticketNumber and ticketToken are required." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const ticket = getSupportTicket(ticketNumber);
  if (!ticket || !safeTokenEqual(ticket.accessToken, ticketToken)) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(
    {
      ticket: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        category: ticket.category,
        priority: ticket.priority,
        subject: ticket.subject,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        messages: ticket.messages.filter((msg) => !msg.internal),
      },
    },
    { headers: NO_STORE_HEADERS }
  );
}

export async function PUT(request: NextRequest) {
  let payload: {
    ticketNumber?: string;
    ticketToken?: string;
    message?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ticketNumber = payload.ticketNumber?.trim().toUpperCase() ?? "";
  const ticketToken = payload.ticketToken?.trim() ?? "";
  const message = normalizeText(payload.message ?? "");

  if (!ticketNumber || !ticketToken || !message) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  // Authenticate before rate limiting to avoid leaking ticket existence
  // via rate limit bucket consumption on unauthenticated requests.
  const ticket = getSupportTicket(ticketNumber);
  if (!ticket || !safeTokenEqual(ticket.accessToken, ticketToken)) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (ticket.status === "closed") {
    return NextResponse.json({ error: "This ticket is closed." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const clientIp = getTrustedClientIp(request);
  const ipReplyLimit = await replyIpRateLimiter.check(`ip:${clientIp}`);
  if (!ipReplyLimit.allowed) {
    return NextResponse.json(
      { error: "Too many replies. Please try again later." },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": ipReplyLimit.retryAfterSeconds.toString(),
        },
      }
    );
  }

  // Apply per-ticket throttling only after the request is authenticated.
  const ticketReplyLimit = await replyTicketRateLimiter.check(`ticket:${ticketNumber}`);
  if (!ticketReplyLimit.allowed) {
    return NextResponse.json(
      { error: "Too many replies. Please try again later." },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": ticketReplyLimit.retryAfterSeconds.toString(),
        },
      }
    );
  }

  const spamCheck = checkContentForSpam(message);
  if (spamCheck.isSpam) {
    return NextResponse.json(
      {
        error: "Your message was flagged as potential spam. Please remove links or excessive formatting and try again.",
        reasons: spamCheck.reasons,
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const updated = addSupportTicketReply({
    ticketNumber,
    author: "user",
    body: message,
  });

  if (!updated) {
    return NextResponse.json({ error: "Unable to update ticket." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (spamCheck.requiresReview) {
    addSupportTicketNote({
      ticketNumber: ticket.ticketNumber,
      author: "support",
      body: `Reply auto-flagged for review (${Math.round(spamCheck.confidence * 100)}% confidence): ${spamCheck.reasons.join("; ")}`,
    });
  }

  return NextResponse.json(
    {
      success: true,
      ticket: {
        ticketNumber: updated.ticketNumber,
        status: updated.status,
        updatedAt: updated.updatedAt,
        messages: updated.messages.filter((msg) => !msg.internal),
      },
    },
    { headers: NO_STORE_HEADERS }
  );
}
