/**
 * Tests for /api/admin/incidents (GET, POST, PUT)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PUT } from "./route";

const TOKEN = "test-admin-token";

function authedRequest(
  url: string,
  init?: RequestInit
): NextRequest {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${TOKEN}`);
  return new NextRequest(url, { ...init, headers, signal: (init as unknown as Record<string, unknown>)?.signal || undefined } as unknown as Record<string, unknown>);
}

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_status_store__"];
}

describe("/api/admin/incidents", () => {
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
      const res = await GET(new NextRequest("http://localhost/api/admin/incidents"));
      expect(res.status).toBe(401);
    });

    it("returns 403 for wrong role", async () => {
      process.env.JFP_ADMIN_ROLE = "moderator";
      const res = await GET(authedRequest("http://localhost/api/admin/incidents"));
      expect(res.status).toBe(403);
    });

    it("returns incidents list", async () => {
      const res = await GET(authedRequest("http://localhost/api/admin/incidents"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.incidents).toBeDefined();
      expect(typeof data.total).toBe("number");
    });

    it("returns stats when action=stats", async () => {
      const res = await GET(authedRequest("http://localhost/api/admin/incidents?action=stats"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.stats).toBeDefined();
    });
  });

  describe("POST", () => {
    it("returns 401 without token", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/admin/incidents", {
          method: "POST",
          body: JSON.stringify({ title: "t", impact: "minor", message: "m" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 for missing fields", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "POST",
          body: JSON.stringify({ title: "test" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid impact", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "POST",
          body: JSON.stringify({ title: "test", impact: "extreme", message: "msg" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("creates incident with valid payload", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "POST",
          body: JSON.stringify({
            title: "Database outage",
            impact: "major",
            message: "Primary DB is down",
            affectedComponents: ["database"],
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.incident).toBeDefined();
      expect(data.incident.title).toBe("Database outage");
    });
  });

  describe("PUT", () => {
    it("returns 400 without incidentId", async () => {
      const res = await PUT(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "PUT",
          body: JSON.stringify({}),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for unknown incident", async () => {
      const res = await PUT(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "PUT",
          body: JSON.stringify({ incidentId: "nonexistent" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 when status provided without message", async () => {
      // First create an incident
      const createRes = await POST(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "POST",
          body: JSON.stringify({ title: "Test", impact: "minor", message: "Initial" }),
          headers: { "content-type": "application/json" },
        })
      );
      const created = await createRes.json();

      const res = await PUT(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "PUT",
          body: JSON.stringify({
            incidentId: created.incident.id,
            status: "identified",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("updates incident with status and message", async () => {
      const createRes = await POST(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "POST",
          body: JSON.stringify({ title: "Outage", impact: "critical", message: "Down" }),
          headers: { "content-type": "application/json" },
        })
      );
      const created = await createRes.json();

      const res = await PUT(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "PUT",
          body: JSON.stringify({
            incidentId: created.incident.id,
            status: "identified",
            message: "Root cause found",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("updates impact independently", async () => {
      const createRes = await POST(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "POST",
          body: JSON.stringify({ title: "Test", impact: "minor", message: "Small" }),
          headers: { "content-type": "application/json" },
        })
      );
      const created = await createRes.json();

      const res = await PUT(
        authedRequest("http://localhost/api/admin/incidents", {
          method: "PUT",
          body: JSON.stringify({
            incidentId: created.incident.id,
            impact: "major",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
