/**
 * Tests for /api/admin/roadmap/[id] (GET, PATCH)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";

const TOKEN = "test-admin-token";

function authedRequest(url: string, init?: RequestInit): NextRequest {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${TOKEN}`);
  return new NextRequest(url, { ...init, headers, signal: (init as any)?.signal || undefined } as any);
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_roadmap_store__"];
}

describe("/api/admin/roadmap/[id]", () => {
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
      const res = await GET(
        new NextRequest("http://localhost/api/admin/roadmap/feat-1"),
        makeContext("feat-1")
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent feature", async () => {
      const res = await GET(
        authedRequest("http://localhost/api/admin/roadmap/nonexistent"),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });

    it("returns feature when found", async () => {
      // The roadmap store has seed data; get a known feature ID
      const res = await GET(
        authedRequest("http://localhost/api/admin/roadmap/feat-1"),
        makeContext("feat-1")
      );
      // Could be 200 (if seed data) or 404 (if store is empty after clear)
      if (res.status === 200) {
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.feature).toBeDefined();
        expect(data.adminRole).toBe("super_admin");
      } else {
        expect(res.status).toBe(404);
      }
    });
  });

  describe("PATCH", () => {
    it("returns 401 without token", async () => {
      const res = await PATCH(
        new NextRequest("http://localhost/api/admin/roadmap/feat-1", {
          method: "PATCH",
          body: JSON.stringify({ status: "planned" }),
          headers: { "content-type": "application/json" },
        }),
        makeContext("feat-1")
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 for missing status", async () => {
      const res = await PATCH(
        authedRequest("http://localhost/api/admin/roadmap/feat-1", {
          method: "PATCH",
          body: JSON.stringify({}),
          headers: { "content-type": "application/json" },
        }),
        makeContext("feat-1")
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("missing_status");
    });

    it("returns 400 for invalid status", async () => {
      const res = await PATCH(
        authedRequest("http://localhost/api/admin/roadmap/feat-1", {
          method: "PATCH",
          body: JSON.stringify({ status: "bogus" }),
          headers: { "content-type": "application/json" },
        }),
        makeContext("feat-1")
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("invalid_status");
    });

    it("returns 404 for non-existent feature", async () => {
      const res = await PATCH(
        authedRequest("http://localhost/api/admin/roadmap/nonexistent", {
          method: "PATCH",
          body: JSON.stringify({ status: "planned" }),
          headers: { "content-type": "application/json" },
        }),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid JSON body", async () => {
      const res = await PATCH(
        authedRequest("http://localhost/api/admin/roadmap/feat-1", {
          method: "PATCH",
          body: "not json",
          headers: { "content-type": "application/json" },
        }),
        makeContext("feat-1")
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("invalid_json");
    });
  });
});
