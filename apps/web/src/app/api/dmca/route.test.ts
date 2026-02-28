/**
 * Tests for /api/dmca (POST, GET, PUT)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET, PUT } from "./route";

const TOKEN = "test-admin-token";

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({
    check: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, retryAfterSeconds: 0 }),
  }),
  getTrustedClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_dmca_store__"];
}

function authedRequest(url: string, init?: RequestInit): NextRequest {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${TOKEN}`);
  return new NextRequest(url, { ...init, headers, signal: (init as unknown as Record<string, unknown>)?.signal || undefined } as unknown as Record<string, unknown>);
}

const validDmcaPayload = {
  claimantName: "Test Claimant",
  claimantEmail: "claimant@example.com",
  claimantAddress: "123 Test St",
  copyrightedWorkDescription: "My original work that was copied",
  infringingContentUrl: "https://example.com/infringing",
  signature: "Test Claimant",
  goodFaithStatement: true,
  accuracyStatement: true,
  ownershipStatement: true,
};

describe("/api/dmca", () => {
  const envBackup: Record<string, string | undefined> = {};

  beforeEach(() => {
    envBackup.JFP_ADMIN_TOKEN = process.env.JFP_ADMIN_TOKEN;
    envBackup.JFP_ADMIN_ROLE = process.env.JFP_ADMIN_ROLE;
    process.env.JFP_ADMIN_TOKEN = TOKEN;
    process.env.JFP_ADMIN_ROLE = "super_admin";
    clearStore();
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  describe("POST (DMCA request)", () => {
    it("returns 400 for missing required fields", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/dmca", {
          method: "POST",
          body: JSON.stringify({ claimantName: "Test" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid email", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/dmca", {
          method: "POST",
          body: JSON.stringify({ ...validDmcaPayload, claimantEmail: "not-an-email" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when legal attestations not accepted", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/dmca", {
          method: "POST",
          body: JSON.stringify({ ...validDmcaPayload, goodFaithStatement: false }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for overly long description", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/dmca", {
          method: "POST",
          body: JSON.stringify({
            ...validDmcaPayload,
            copyrightedWorkDescription: "x".repeat(2001),
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("creates DMCA request with valid payload", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/dmca", {
          method: "POST",
          body: JSON.stringify(validDmcaPayload),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.requestId).toBeDefined();
      expect(data.status).toBeDefined();
    });

    it("returns 400 for invalid JSON", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/dmca", {
          method: "POST",
          body: "not json",
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });
  });

  describe("POST (counter-notice)", () => {
    it("returns 400 for missing counter-notice fields", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/dmca", {
          method: "POST",
          body: JSON.stringify({ type: "counter", requestId: "test" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent request", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/dmca", {
          method: "POST",
          body: JSON.stringify({
            type: "counter",
            requestId: "nonexistent",
            name: "Counter Claimant",
            email: "counter@example.com",
            address: "456 Test Ave",
            statement: "This is my original work",
            signature: "Counter Claimant",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(404);
    });
  });

  describe("GET (admin)", () => {
    it("returns 401 without admin token", async () => {
      const res = await GET(new NextRequest("http://localhost/api/dmca"));
      expect(res.status).toBe(401);
    });

    it("returns DMCA requests list", async () => {
      const res = await GET(authedRequest("http://localhost/api/dmca"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.requests).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.pagination).toBeDefined();
    });
  });

  describe("PUT (admin status update)", () => {
    it("returns 401 without admin token", async () => {
      const res = await PUT(
        new NextRequest("http://localhost/api/dmca", {
          method: "PUT",
          body: JSON.stringify({ requestId: "r1", status: "resolved" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 for missing fields", async () => {
      const res = await PUT(
        authedRequest("http://localhost/api/dmca", {
          method: "PUT",
          body: JSON.stringify({}),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid status", async () => {
      const res = await PUT(
        authedRequest("http://localhost/api/dmca", {
          method: "PUT",
          body: JSON.stringify({ requestId: "nonexistent", status: "invalid_status" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent request", async () => {
      const res = await PUT(
        authedRequest("http://localhost/api/dmca", {
          method: "PUT",
          body: JSON.stringify({ requestId: "nonexistent", status: "removed" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(404);
    });
  });
});
