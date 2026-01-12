import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SUPPORT_EMAIL,
  isSupportCategory,
  isSupportPriority,
} from "@/lib/support/tickets";
import {
  addSupportTicketReply,
  createSupportTicket,
  getSupportTicket,
  getSupportTicketsForEmail,
} from "@/lib/support/ticket-store";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 80;
const MAX_SUBJECT_LENGTH = 140;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TICKETS_PER_WINDOW = 5;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const ipBuckets = new Map<string, { count: number; resetAt: number }>();
const emailBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return ip;
}

function pruneBuckets(now: number) {
  for (const [key, bucket] of ipBuckets) {
    if (bucket.resetAt <= now) {
      ipBuckets.delete(key);
    }
  }
  for (const [key, bucket] of emailBuckets) {
    if (bucket.resetAt <= now) {
      emailBuckets.delete(key);
    }
  }
}

function getBucket(map: Map<string, { count: number; resetAt: number }>, key: string, now: number) {
  const existing = map.get(key);
  if (!existing || now > existing.resetAt) {
    const bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    map.set(key, bucket);
    return bucket;
  }
  return existing;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export async function POST(request: NextRequest) {
  const now = Date.now();
  pruneBuckets(now);

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

  const ipKey = getClientKey(request);
  const ipBucket = getBucket(ipBuckets, ipKey, now);
  ipBucket.count += 1;

  const emailBucket = getBucket(emailBuckets, email, now);
  emailBucket.count += 1;

  if (ipBucket.count > MAX_TICKETS_PER_WINDOW || emailBucket.count > MAX_TICKETS_PER_WINDOW) {
    const retryAfterSeconds = Math.max(1, Math.ceil((ipBucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Support request limit reached. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": retryAfterSeconds.toString() },
      }
    );
  }

  if (!isSupportCategory(category) || !isSupportPriority(priority)) {
    return NextResponse.json({ error: "Invalid category or priority." }, { status: 400 });
  }

  const ticket = createSupportTicket({
    name,
    email,
    subject,
    message,
    category,
    priority,
  });

  // In production, send confirmation email and notify support staff here.

  return NextResponse.json({
    success: true,
    ticket: {
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      category: ticket.category,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      supportEmail: SUPPORT_EMAIL,
    },
    message: "Support request received.",
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const ticketNumber = searchParams.get("ticketNumber")?.trim().toUpperCase() ?? "";

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  if (ticketNumber) {
    const ticket = getSupportTicket(ticketNumber);
    if (!ticket || ticket.email !== email) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    return NextResponse.json({
      ticket: {
        ticketNumber: ticket.ticketNumber,
        name: ticket.name,
        email: ticket.email,
        status: ticket.status,
        category: ticket.category,
        priority: ticket.priority,
        subject: ticket.subject,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        messages: ticket.messages.filter((msg) => !msg.internal),
      },
    });
  }

  const tickets = getSupportTicketsForEmail(email).map((ticket) => ({
    ticketNumber: ticket.ticketNumber,
    name: ticket.name,
    email: ticket.email,
    status: ticket.status,
    category: ticket.category,
    priority: ticket.priority,
    subject: ticket.subject,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  }));

  return NextResponse.json({ tickets });
}

export async function PUT(request: NextRequest) {
  let payload: {
    ticketNumber?: string;
    email?: string;
    message?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ticketNumber = payload.ticketNumber?.trim().toUpperCase() ?? "";
  const email = payload.email?.trim().toLowerCase() ?? "";
  const message = normalizeText(payload.message ?? "");

  if (!ticketNumber || !email || !message) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  const ticket = getSupportTicket(ticketNumber);
  if (!ticket || ticket.email !== email) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  if (ticket.status === "closed") {
    return NextResponse.json({ error: "This ticket is closed." }, { status: 400 });
  }

  const updated = addSupportTicketReply({
    ticketNumber,
    author: "user",
    body: message,
  });

  if (!updated) {
    return NextResponse.json({ error: "Unable to update ticket." }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    ticket: {
      ticketNumber: updated.ticketNumber,
      status: updated.status,
      updatedAt: updated.updatedAt,
      messages: updated.messages.filter((msg) => !msg.internal),
    },
  });
}
