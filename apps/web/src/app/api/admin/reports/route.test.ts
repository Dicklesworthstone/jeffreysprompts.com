/**
 * Tests for /api/admin/reports (GET, PUT)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "./route";

const TOKEN = "test-admin-token";

function authedRequest(url: string, init?: RequestInit): NextRequest {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${TOKEN}`);
  return new NextRequest(url, { ...init, headers, signal: (init as unknown as Record<string, unknown>)?.signal || undefined } as unknown as Record<string, unknown>);
}

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_report_store__"];
}

describe("/api/admin/reports", () => {
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

  describe("GET", () => {
    it("returns 401 without token", async () => {
      const res = await GET(new NextRequest("http://localhost/api/admin/reports"));
      expect(res.status).toBe(401);
    });

    it("returns reports with pagination", async () => {
      const res = await GET(authedRequest("http://localhost/api/admin/reports"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.reports)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.page).toBe(1);
      expect(data.stats).toBeDefined();
    });

    it("defaults to pending status filter", async () => {
      const res = await GET(authedRequest("http://localhost/api/admin/reports"));
      expect(res.status).toBe(200);
    });

    it("accepts status=all filter", async () => {
      const res = await GET(authedRequest("http://localhost/api/admin/reports?status=all"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.pagination).toBeDefined();
    });

    it("clamps limit to max 50", async () => {
      const res = await GET(authedRequest("http://localhost/api/admin/reports?limit=200"));
      const data = await res.json();
      expect(data.pagination.limit).toBe(50);
    });

    it("includes report stats", async () => {
      const res = await GET(authedRequest("http://localhost/api/admin/reports?status=all"));
      const data = await res.json();
      expect(typeof data.stats.pending).toBe("number");
      expect(typeof data.stats.reviewed).toBe("number");
      expect(typeof data.stats.actioned).toBe("number");
      expect(typeof data.stats.dismissed).toBe("number");
    });
  });

  describe("PUT", () => {
    it("returns 401 without token", async () => {
      const res = await PUT(
        new NextRequest("http://localhost/api/admin/reports", {
          method: "PUT",
          body: JSON.stringify({ reportId: "r1", action: "dismiss" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 for missing reportId", async () => {
      const res = await PUT(
        authedRequest("http://localhost/api/admin/reports", {
          method: "PUT",
          body: JSON.stringify({ action: "dismiss" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing action", async () => {
      const res = await PUT(
        authedRequest("http://localhost/api/admin/reports", {
          method: "PUT",
          body: JSON.stringify({ reportId: "r1" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid action", async () => {
      const res = await PUT(
        authedRequest("http://localhost/api/admin/reports", {
          method: "PUT",
          body: JSON.stringify({ reportId: "r1", action: "nuke" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for unknown report", async () => {
      const res = await PUT(
        authedRequest("http://localhost/api/admin/reports", {
          method: "PUT",
          body: JSON.stringify({ reportId: "nonexistent", action: "dismiss" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(404);
    });
  });
});
