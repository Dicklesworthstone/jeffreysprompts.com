/**
 * Tests for /api/admin/tag-mappings (GET, POST, DELETE)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";

const TOKEN = "test-admin-token";

function authedRequest(url: string, init?: RequestInit): NextRequest {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${TOKEN}`);
  return new NextRequest(url, { ...init, headers, signal: (init as any)?.signal || undefined } as any);
}

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_tag_mapping_store__"];
}

describe("/api/admin/tag-mappings", () => {
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
      const res = await GET(new NextRequest("http://localhost/api/admin/tag-mappings"));
      expect(res.status).toBe(401);
    });

    it("returns tag mappings data", async () => {
      const res = await GET(authedRequest("http://localhost/api/admin/tag-mappings"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.record).toBeDefined();
      expect(data.meta).toBeDefined();
      expect(typeof data.meta.count).toBe("number");
    });
  });

  describe("POST", () => {
    it("returns 400 for missing alias", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/tag-mappings", {
          method: "POST",
          body: JSON.stringify({ canonical: "coding" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("missing_fields");
    });

    it("returns 400 for missing canonical", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/tag-mappings", {
          method: "POST",
          body: JSON.stringify({ alias: "code" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });

    it("creates tag mapping with valid payload", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/tag-mappings", {
          method: "POST",
          body: JSON.stringify({ alias: "ai", canonical: "artificial-intelligence" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it("handles invalid JSON body gracefully", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/tag-mappings", {
          method: "POST",
          body: "not json",
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("returns 400 without alias", async () => {
      const res = await DELETE(
        authedRequest("http://localhost/api/admin/tag-mappings", { method: "DELETE" })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("missing_alias");
    });

    it("returns 404 for unknown alias", async () => {
      const res = await DELETE(
        authedRequest("http://localhost/api/admin/tag-mappings?alias=nonexistent", {
          method: "DELETE",
        })
      );
      expect(res.status).toBe(404);
    });

    it("deletes existing tag mapping via query param", async () => {
      // Create first
      await POST(
        authedRequest("http://localhost/api/admin/tag-mappings", {
          method: "POST",
          body: JSON.stringify({ alias: "ml", canonical: "machine-learning" }),
          headers: { "content-type": "application/json" },
        })
      );

      const res = await DELETE(
        authedRequest("http://localhost/api/admin/tag-mappings?alias=ml", {
          method: "DELETE",
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
