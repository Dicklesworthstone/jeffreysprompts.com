import type {
  SupportCategory,
  SupportPriority,
  SupportStatus,
} from "./tickets";

export type SupportMessageAuthor = "user" | "support";

export interface SupportTicketMessage {
  id: string;
  author: SupportMessageAuthor;
  body: string;
  createdAt: string;
  internal?: boolean;
}

export interface SupportTicketNote {
  id: string;
  author: SupportMessageAuthor;
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  accessToken: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  messages: SupportTicketMessage[];
  notes: SupportTicketNote[];
}

interface SupportTicketStore {
  tickets: Map<string, SupportTicket>;
  order: string[];
}

const STORE_KEY = "__jfp_support_ticket_store__";

function getStore(): SupportTicketStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: SupportTicketStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      tickets: new Map(),
      order: [],
    };
  }

  return globalStore[STORE_KEY];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createTicketNumber(store: SupportTicketStore): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let ticketNumber = "";
  let attempts = 0;

  while (!ticketNumber || store.tickets.has(ticketNumber)) {
    const random = Math.floor(1000 + (parseInt(crypto.randomUUID().slice(0, 4), 16) % 9000));
    ticketNumber = `SUP-${date}-${random}`;
    attempts += 1;
    if (attempts > 10) {
      ticketNumber = `SUP-${date}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    }
  }

  return ticketNumber;
}

function createTicketAccessToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

function touchTicket(store: SupportTicketStore, ticketNumber: string) {
  store.order = [ticketNumber, ...store.order.filter((id) => id !== ticketNumber)];
}

export function createSupportTicket(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: SupportCategory;
  priority: SupportPriority;
  status?: SupportStatus;
}): SupportTicket {
  const store = getStore();
  const now = new Date().toISOString();
  const ticketNumber = createTicketNumber(store);

  const ticket: SupportTicket = {
    id: crypto.randomUUID(),
    ticketNumber,
    accessToken: createTicketAccessToken(),
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    subject: input.subject.trim(),
    message: input.message.trim(),
    category: input.category,
    priority: input.priority,
    status: input.status ?? "open",
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: crypto.randomUUID(),
        author: "user",
        body: input.message.trim(),
        createdAt: now,
      },
    ],
    notes: [],
  };

  store.tickets.set(ticketNumber, ticket);
  touchTicket(store, ticketNumber);
  return ticket;
}

export function listSupportTickets(filters?: {
  status?: SupportStatus | "all";
  category?: SupportCategory | "all";
  priority?: SupportPriority | "all";
  search?: string;
  limit?: number;
}): SupportTicket[] {
  const store = getStore();
  const normalizedSearch = filters?.search?.trim().toLowerCase();
  const limit = filters?.limit ?? 100;

  const tickets = store.order
    .map((ticketNumber) => store.tickets.get(ticketNumber))
    .filter((ticket): ticket is SupportTicket => Boolean(ticket))
    .filter((ticket) => {
      if (filters?.status && filters.status !== "all" && ticket.status !== filters.status) {
        return false;
      }
      if (filters?.category && filters.category !== "all" && ticket.category !== filters.category) {
        return false;
      }
      if (filters?.priority && filters.priority !== "all" && ticket.priority !== filters.priority) {
        return false;
      }
      if (normalizedSearch) {
        const haystack = [
          ticket.ticketNumber,
          ticket.email,
          ticket.name,
          ticket.subject,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }
      return true;
    });

  return tickets.slice(0, limit);
}

export function getSupportTicket(ticketNumber: string): SupportTicket | null {
  const store = getStore();
  const key = ticketNumber.trim().toUpperCase();
  return store.tickets.get(key) ?? null;
}

export function getSupportTicketsForEmail(email: string): SupportTicket[] {
  const store = getStore();
  const normalized = normalizeEmail(email);
  return store.order
    .map((ticketNumber) => store.tickets.get(ticketNumber))
    .filter((ticket): ticket is SupportTicket => Boolean(ticket))
    .filter((ticket) => ticket.email === normalized);
}

export function updateSupportTicketStatus(
  ticketNumber: string,
  status: SupportStatus
): SupportTicket | null {
  const store = getStore();
  const ticket = getSupportTicket(ticketNumber);
  if (!ticket) return null;

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  store.tickets.set(ticket.ticketNumber, ticket);
  touchTicket(store, ticket.ticketNumber);
  return ticket;
}

export function addSupportTicketReply(input: {
  ticketNumber: string;
  author: SupportMessageAuthor;
  body: string;
  internal?: boolean;
}): SupportTicket | null {
  const store = getStore();
  const ticket = getSupportTicket(input.ticketNumber);
  if (!ticket) return null;

  const now = new Date().toISOString();

  ticket.messages.push({
    id: crypto.randomUUID(),
    author: input.author,
    body: input.body.trim(),
    createdAt: now,
    internal: input.internal,
  });

  ticket.status = input.author === "support" ? "pending" : "open";
  ticket.updatedAt = now;
  store.tickets.set(ticket.ticketNumber, ticket);
  touchTicket(store, ticket.ticketNumber);
  return ticket;
}

export function addSupportTicketNote(input: {
  ticketNumber: string;
  author: SupportMessageAuthor;
  body: string;
}): SupportTicket | null {
  const store = getStore();
  const ticket = getSupportTicket(input.ticketNumber);
  if (!ticket) return null;

  const now = new Date().toISOString();
  ticket.notes.push({
    id: crypto.randomUUID(),
    author: input.author,
    body: input.body.trim(),
    createdAt: now,
  });
  ticket.updatedAt = now;
  store.tickets.set(ticket.ticketNumber, ticket);
  touchTicket(store, ticket.ticketNumber);
  return ticket;
}
