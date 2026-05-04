import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import {
  SUPPORT_STATUSES,
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  isSupportStatus,
  isSupportCategory,
  isSupportPriority,
} from "@/lib/support/tickets";
import {
  addSupportTicketNote,
  addSupportTicketReply,
  getSupportTicket,
  listSupportTickets,
  MAX_TICKETS_IN_MEMORY,
  updateSupportTicketStatus,
} from "@/lib/support/ticket-store";

function adminJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const auth = checkAdminPermission(request, "support.view");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.reason ?? "forbidden" }, { status });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") ?? "all";
  const category = searchParams.get("category") ?? "all";
  const priority = searchParams.get("priority") ?? "all";
  const search = searchParams.get("search") ?? "";
  const parsedPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const parsedLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(50, Math.max(1, parsedLimit)) : 20;

  const normalizedStatus = status === "all" || isSupportStatus(status) ? status : "all";
  const normalizedCategory = category === "all" || isSupportCategory(category) ? category : "all";
  const normalizedPriority = priority === "all" || isSupportPriority(priority) ? priority : "all";

  const allTickets = listSupportTickets({
    status: normalizedStatus,
    category: normalizedCategory,
    priority: normalizedPriority,
    search,
    limit: MAX_TICKETS_IN_MEMORY,
  });

  const start = (page - 1) * limit;
  const pageTickets = allTickets.slice(start, start + limit);

  const stats = SUPPORT_STATUSES.reduce<Record<string, number>>((acc, item) => {
    acc[item.value] = 0;
    return acc;
  }, {});

  allTickets.forEach((ticket) => {
    stats[ticket.status] = (stats[ticket.status] ?? 0) + 1;
  });

  return adminJson({
    tickets: pageTickets,
    pagination: {
      page,
      limit,
      total: allTickets.length,
      totalPages: Math.ceil(allTickets.length / limit),
    },
    filters: {
      statuses: SUPPORT_STATUSES,
      categories: SUPPORT_CATEGORIES,
      priorities: SUPPORT_PRIORITIES,
    },
    stats,
  });
}

export async function PUT(request: NextRequest) {
  const auth = checkAdminPermission(request, "support.manage");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.reason ?? "forbidden" }, { status });
  }

  let payload: Record<string, unknown>;

  try {
    const parsed = await request.json();
    if (!isJsonObject(parsed)) {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    payload = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ticketNumber = typeof payload.ticketNumber === "string" ? payload.ticketNumber.trim().toUpperCase() : "";
  if (!ticketNumber) {
    return NextResponse.json({ error: "ticketNumber is required." }, { status: 400 });
  }

  const ticket = getSupportTicket(ticketNumber);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  let updatedTicket = ticket;

  if (typeof payload.status === "string" && payload.status) {
    if (!isSupportStatus(payload.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const statusUpdate = updateSupportTicketStatus(ticketNumber, payload.status);
    if (statusUpdate) {
      updatedTicket = statusUpdate;
    }
  } else if (payload.status !== undefined) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (typeof payload.reply === "string" && payload.reply.trim()) {
    const replyUpdate = addSupportTicketReply({
      ticketNumber,
      author: "support",
      body: payload.reply.trim(),
    });
    if (replyUpdate) {
      updatedTicket = replyUpdate;
    }
  }

  if (typeof payload.note === "string" && payload.note.trim()) {
    const noteUpdate = addSupportTicketNote({
      ticketNumber,
      author: "support",
      body: payload.note.trim(),
    });
    if (noteUpdate) {
      updatedTicket = noteUpdate;
    }
  }

  return adminJson({
    success: true,
    ticket: updatedTicket,
  });
}
