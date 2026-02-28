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
  updateSupportTicketStatus,
} from "@/lib/support/ticket-store";

const ADMIN_HEADERS = { "Cache-Control": "no-store" };

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
    limit: 500,
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

  return NextResponse.json({
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
  }, { headers: ADMIN_HEADERS });
}

export async function PUT(request: NextRequest) {
  const auth = checkAdminPermission(request, "support.manage");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.reason ?? "forbidden" }, { status });
  }

  let payload: {
    ticketNumber?: string;
    status?: string;
    reply?: string;
    note?: string;
  };

  try {
    payload = await request.json();
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

  if (payload.status) {
    if (!isSupportStatus(payload.status as string)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const statusUpdate = updateSupportTicketStatus(ticketNumber, payload.status as any);
    if (statusUpdate) {
      updatedTicket = statusUpdate;
    }
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

  return NextResponse.json({
    success: true,
    ticket: updatedTicket,
  }, { headers: ADMIN_HEADERS });
}
