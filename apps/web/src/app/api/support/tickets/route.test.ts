import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST, PUT } from "./route";

type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>;

function clearSupportStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.__jfp_support_ticket_store__;
}

function makeRequest(url: string, init?: NextRequestInit): NextRequest {
  return new NextRequest(url, init);
}

async function createTicket(ip = "198.51.100.10") {
  const response = await POST(
    makeRequest("http://localhost/api/support/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({
        name: "Alice Tester",
        email: "alice@example.com",
        subject: "Need help with prompt usage",
        message: "I need help understanding the best way to use this prompt in daily workflows.",
        category: "technical",
        priority: "normal",
      }),
    })
  );

  const payload = await response.json();
  return { response, payload } as const;
}

describe("/api/support/tickets", () => {
  beforeEach(() => {
    clearSupportStore();
  });

  it("does not let unauthenticated attempts consume per-ticket reply quota", async () => {
    const { response, payload } = await createTicket("198.51.100.11");
    expect(response.status).toBe(200);

    const ticketNumber = payload.ticket.ticketNumber as string;
    const ticketToken = payload.ticket.accessToken as string;

    for (let i = 0; i < 15; i += 1) {
      const badReply = await PUT(
        makeRequest("http://localhost/api/support/tickets", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "203.0.113.50",
          },
          body: JSON.stringify({
            ticketNumber,
            ticketToken: "invalid-token",
            message: `Bad auth attempt ${i}`,
          }),
        })
      );

      expect(badReply.status).toBe(404);
    }

    const legitReply = await PUT(
      makeRequest("http://localhost/api/support/tickets", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.51",
        },
        body: JSON.stringify({
          ticketNumber,
          ticketToken,
          message: "Following up with valid credentials after failed attempts.",
        }),
      })
    );

    const legitPayload = await legitReply.json();
    expect(legitReply.status).toBe(200);
    expect(legitPayload.success).toBe(true);
  });

  it("still enforces per-ticket reply throttling for authenticated clients", async () => {
    const { response, payload } = await createTicket("198.51.100.12");
    expect(response.status).toBe(200);

    const ticketNumber = payload.ticket.ticketNumber as string;
    const ticketToken = payload.ticket.accessToken as string;

    for (let i = 0; i < 15; i += 1) {
      const reply = await PUT(
        makeRequest("http://localhost/api/support/tickets", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "203.0.113.60",
          },
          body: JSON.stringify({
            ticketNumber,
            ticketToken,
            message: `Legit reply ${i}`,
          }),
        })
      );

      expect(reply.status).toBe(200);
    }

    const limitedReply = await PUT(
      makeRequest("http://localhost/api/support/tickets", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.60",
        },
        body: JSON.stringify({
          ticketNumber,
          ticketToken,
          message: "This reply should exceed the per-ticket quota.",
        }),
      })
    );

    const limitedPayload = await limitedReply.json();
    expect(limitedReply.status).toBe(429);
    expect(limitedPayload.error).toContain("Too many replies");
  });
});
