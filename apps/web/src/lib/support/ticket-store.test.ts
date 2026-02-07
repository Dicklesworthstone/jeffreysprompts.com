/**
 * Unit tests for ticket-store
 * @module lib/support/ticket-store.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createSupportTicket,
  listSupportTickets,
  getSupportTicket,
  getSupportTicketsForEmail,
  updateSupportTicketStatus,
  addSupportTicketReply,
  addSupportTicketNote,
} from "./ticket-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_support_ticket_store__"];
}

function seedTicket(overrides?: Record<string, unknown>) {
  return createSupportTicket({
    name: "Test User",
    email: "test@example.com",
    subject: "Test Subject",
    message: "Test message body.",
    category: "technical",
    priority: "normal",
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ticket-store", () => {
  beforeEach(() => {
    clearStore();
  });

  // -----------------------------------------------------------------------
  // createSupportTicket
  // -----------------------------------------------------------------------

  describe("createSupportTicket", () => {
    it("creates a ticket with correct fields", () => {
      const ticket = createSupportTicket({
        name: "Jane Doe",
        email: "Jane@Example.com",
        subject: "Help with billing",
        message: "I have a question about my invoice.",
        category: "billing",
        priority: "high",
      });

      expect(ticket.id).toBeTruthy();
      expect(ticket.ticketNumber).toMatch(/^SUP-/);
      expect(ticket.accessToken).toMatch(/^[a-f0-9]{64}$/);
      expect(ticket.name).toBe("Jane Doe");
      expect(ticket.email).toBe("jane@example.com"); // normalized
      expect(ticket.subject).toBe("Help with billing");
      expect(ticket.category).toBe("billing");
      expect(ticket.priority).toBe("high");
      expect(ticket.status).toBe("open");
      expect(ticket.messages).toHaveLength(1);
      expect(ticket.messages[0].author).toBe("user");
      expect(ticket.notes).toEqual([]);
    });

    it("trims whitespace from input fields", () => {
      const ticket = createSupportTicket({
        name: "  Spaces  ",
        email: "  spaced@example.com  ",
        subject: "  Spaced  ",
        message: "  Spaced body  ",
        category: "technical",
        priority: "normal",
      });

      expect(ticket.name).toBe("Spaces");
      expect(ticket.email).toBe("spaced@example.com");
      expect(ticket.subject).toBe("Spaced");
      expect(ticket.message).toBe("Spaced body");
    });

    it("defaults status to open", () => {
      const ticket = seedTicket();
      expect(ticket.status).toBe("open");
    });

    it("allows custom initial status", () => {
      const ticket = seedTicket({ status: "pending" });
      expect(ticket.status).toBe("pending");
    });

    it("generates unique ticket numbers", () => {
      const t1 = seedTicket();
      const t2 = seedTicket();
      expect(t1.ticketNumber).not.toBe(t2.ticketNumber);
    });
  });

  // -----------------------------------------------------------------------
  // getSupportTicket
  // -----------------------------------------------------------------------

  describe("getSupportTicket", () => {
    it("returns ticket by ticket number", () => {
      const ticket = seedTicket();
      const found = getSupportTicket(ticket.ticketNumber);
      expect(found?.id).toBe(ticket.id);
    });

    it("normalizes ticket number to uppercase", () => {
      const ticket = seedTicket();
      const found = getSupportTicket(ticket.ticketNumber.toLowerCase());
      expect(found?.id).toBe(ticket.id);
    });

    it("returns null for unknown ticket number", () => {
      expect(getSupportTicket("SUP-00000000-0000")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // listSupportTickets
  // -----------------------------------------------------------------------

  describe("listSupportTickets", () => {
    it("returns all tickets", () => {
      seedTicket();
      seedTicket();
      expect(listSupportTickets()).toHaveLength(2);
    });

    it("filters by status", () => {
      seedTicket();
      const t2 = seedTicket();
      updateSupportTicketStatus(t2.ticketNumber, "resolved");

      expect(listSupportTickets({ status: "open" })).toHaveLength(1);
      expect(listSupportTickets({ status: "resolved" })).toHaveLength(1);
    });

    it("returns all when status is 'all'", () => {
      seedTicket();
      const t2 = seedTicket();
      updateSupportTicketStatus(t2.ticketNumber, "closed");
      expect(listSupportTickets({ status: "all" })).toHaveLength(2);
    });

    it("filters by category", () => {
      seedTicket({ category: "billing" });
      seedTicket({ category: "technical" });
      expect(listSupportTickets({ category: "billing" })).toHaveLength(1);
    });

    it("filters by priority", () => {
      seedTicket({ priority: "urgent" });
      seedTicket({ priority: "low" });
      expect(listSupportTickets({ priority: "urgent" })).toHaveLength(1);
    });

    it("supports search across fields", () => {
      seedTicket({ name: "Alice", subject: "Login issue", email: "alice@test.com" });
      seedTicket({ name: "Bob", subject: "Payment bug", email: "bob@test.com" });

      expect(listSupportTickets({ search: "alice" })).toHaveLength(1);
      expect(listSupportTickets({ search: "Login" })).toHaveLength(1);
      expect(listSupportTickets({ search: "bob@test" })).toHaveLength(1);
    });

    it("respects limit", () => {
      for (let i = 0; i < 5; i++) seedTicket();
      expect(listSupportTickets({ limit: 3 })).toHaveLength(3);
    });

    it("most recently touched ticket is first", () => {
      const t1 = seedTicket({ subject: "First" });
      seedTicket({ subject: "Second" });
      // Touch first by adding a reply
      addSupportTicketReply({
        ticketNumber: t1.ticketNumber,
        author: "support",
        body: "Thanks!",
      });

      const tickets = listSupportTickets();
      expect(tickets[0].subject).toBe("First");
    });
  });

  // -----------------------------------------------------------------------
  // getSupportTicketsForEmail
  // -----------------------------------------------------------------------

  describe("getSupportTicketsForEmail", () => {
    it("returns tickets for a specific email", () => {
      seedTicket({ email: "a@test.com" });
      seedTicket({ email: "a@test.com" });
      seedTicket({ email: "b@test.com" });

      expect(getSupportTicketsForEmail("a@test.com")).toHaveLength(2);
    });

    it("normalizes email for lookup", () => {
      seedTicket({ email: "User@Test.com" });
      expect(getSupportTicketsForEmail("  USER@TEST.COM  ")).toHaveLength(1);
    });

    it("returns empty for unknown email", () => {
      expect(getSupportTicketsForEmail("nobody@test.com")).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // updateSupportTicketStatus
  // -----------------------------------------------------------------------

  describe("updateSupportTicketStatus", () => {
    it("updates ticket status", () => {
      const ticket = seedTicket();
      const updated = updateSupportTicketStatus(ticket.ticketNumber, "resolved");
      expect(updated?.status).toBe("resolved");
      expect(updated?.updatedAt).toBeTruthy();
    });

    it("returns null for unknown ticket", () => {
      expect(updateSupportTicketStatus("SUP-NOPE-0000", "closed")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // addSupportTicketReply
  // -----------------------------------------------------------------------

  describe("addSupportTicketReply", () => {
    it("adds a user reply", () => {
      const ticket = seedTicket();
      const updated = addSupportTicketReply({
        ticketNumber: ticket.ticketNumber,
        author: "user",
        body: "More details here.",
      });

      expect(updated?.messages).toHaveLength(2);
      expect(updated?.messages[1].author).toBe("user");
      expect(updated?.messages[1].body).toBe("More details here.");
      expect(updated?.status).toBe("open"); // user reply keeps/sets open
    });

    it("adds a support reply and sets status to pending", () => {
      const ticket = seedTicket();
      const updated = addSupportTicketReply({
        ticketNumber: ticket.ticketNumber,
        author: "support",
        body: "We are looking into this.",
      });

      expect(updated?.messages).toHaveLength(2);
      expect(updated?.status).toBe("pending");
    });

    it("supports internal messages", () => {
      const ticket = seedTicket();
      const updated = addSupportTicketReply({
        ticketNumber: ticket.ticketNumber,
        author: "support",
        body: "Internal note.",
        internal: true,
      });

      expect(updated?.messages[1].internal).toBe(true);
    });

    it("returns null for unknown ticket", () => {
      expect(
        addSupportTicketReply({
          ticketNumber: "SUP-NOPE-0000",
          author: "user",
          body: "Test",
        })
      ).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // addSupportTicketNote
  // -----------------------------------------------------------------------

  describe("addSupportTicketNote", () => {
    it("adds a note to a ticket", () => {
      const ticket = seedTicket();
      const updated = addSupportTicketNote({
        ticketNumber: ticket.ticketNumber,
        author: "support",
        body: "Escalated to engineering.",
      });

      expect(updated?.notes).toHaveLength(1);
      expect(updated?.notes[0].body).toBe("Escalated to engineering.");
    });

    it("returns null for unknown ticket", () => {
      expect(
        addSupportTicketNote({
          ticketNumber: "SUP-NOPE-0000",
          author: "support",
          body: "Test",
        })
      ).toBeNull();
    });
  });
});
