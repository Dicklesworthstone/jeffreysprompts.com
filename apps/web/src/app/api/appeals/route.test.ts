/**
 * Tests for /api/appeals (POST, GET)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "./route";

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({
    check: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, retryAfterSeconds: 0 }),
  }),
  getTrustedClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

function clearStores() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_appeal_store__"];
  delete g["__jfp_action_store__"];
}

describe("/api/appeals", () => {
  beforeEach(() => {
    clearStores();
  });

  describe("POST", () => {
    it("returns 400 for invalid JSON", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/appeals", {
          method: "POST",
          body: "not json",
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing required fields", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/appeals", {
          method: "POST",
          body: JSON.stringify({ actionId: "act-1" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid email", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/appeals", {
          method: "POST",
          body: JSON.stringify({
            actionId: "act-1",
            userEmail: "not-an-email",
            explanation: "x".repeat(60),
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for explanation too short", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/appeals", {
          method: "POST",
          body: JSON.stringify({
            actionId: "act-1",
            userEmail: "user@example.com",
            explanation: "Too short",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for explanation too long", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/appeals", {
          method: "POST",
          body: JSON.stringify({
            actionId: "act-1",
            userEmail: "user@example.com",
            explanation: "x".repeat(2001),
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent moderation action", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/appeals", {
          method: "POST",
          body: JSON.stringify({
            actionId: "nonexistent-action",
            userEmail: "user@example.com",
            explanation: "I believe this moderation action was taken in error. I have always followed the community guidelines and my content does not violate any rules.",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 for honeypot field filled", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/appeals", {
          method: "POST",
          body: JSON.stringify({
            actionId: "act-1",
            userEmail: "user@example.com",
            explanation: "x".repeat(60),
            company: "SpamCo",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });
  });

  describe("GET", () => {
    it("returns 400 without appealId and appealToken", async () => {
      const res = await GET(new NextRequest("http://localhost/api/appeals"));
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent appeal", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/appeals?appealId=nonexistent&appealToken=fake")
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 when only appealId is provided", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/appeals?appealId=test")
      );
      expect(res.status).toBe(400);
    });
  });
});
