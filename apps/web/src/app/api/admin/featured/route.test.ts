/**
 * Tests for /api/admin/featured (GET, POST, PATCH, DELETE)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, PATCH, DELETE } from "./route";

const TOKEN = "test-admin-token";

function authedRequest(url: string, init?: RequestInit): NextRequest {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${TOKEN}`);
  return new NextRequest(url, { ...init, headers, signal: (init as unknown as Record<string, unknown>)?.signal || undefined } as unknown as Record<string, unknown>);
}

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_featured_store__"];
}

describe("/api/admin/featured", () => {
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
      const res = await GET(new NextRequest("http://localhost/api/admin/featured"));
      expect(res.status).toBe(401);
    });

    it("returns featured content list", async () => {
      const res = await GET(authedRequest("http://localhost/api/admin/featured"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.meta.count).toBeDefined();
    });

    it("clamps limit between 1 and 100", async () => {
      const res = await GET(authedRequest("http://localhost/api/admin/featured?limit=200"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.meta.limit).toBe(100);
    });
  });

  describe("POST", () => {
    it("returns 401 without token", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/admin/featured", {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 for missing required fields", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/featured", {
          method: "POST",
          body: JSON.stringify({ resourceType: "prompt" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("missing_fields");
    });

    it("returns 400 for invalid resource type", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/featured", {
          method: "POST",
          body: JSON.stringify({
            resourceType: "invalid_type",
            resourceId: "test-1",
            featureType: "featured",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("invalid_resource_type");
    });

    it("returns 400 for invalid feature type", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/featured", {
          method: "POST",
          body: JSON.stringify({
            resourceType: "prompt",
            resourceId: "test-1",
            featureType: "invalid_feature",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("invalid_feature_type");
    });

    it("creates featured content with valid payload", async () => {
      const res = await POST(
        authedRequest("http://localhost/api/admin/featured", {
          method: "POST",
          body: JSON.stringify({
            resourceType: "prompt",
            resourceId: "test-prompt-1",
            featureType: "featured",
            headline: "Test Headline",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.resourceId).toBe("test-prompt-1");
    });

    it("returns 409 for duplicate featured content", async () => {
      const body = JSON.stringify({
        resourceType: "prompt",
        resourceId: "dup-prompt",
        featureType: "featured",
      });
      const init = {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      };

      await POST(authedRequest("http://localhost/api/admin/featured", init));
      const res = await POST(
        authedRequest("http://localhost/api/admin/featured", {
          ...init,
          body, // recreate body since it was consumed
        })
      );
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe("already_featured");
    });
  });

  describe("PATCH", () => {
    it("returns 400 without id for non-reorder", async () => {
      const res = await PATCH(
        authedRequest("http://localhost/api/admin/featured", {
          method: "PATCH",
          body: JSON.stringify({ headline: "new" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("missing_id");
    });

    it("handles reorder action", async () => {
      const res = await PATCH(
        authedRequest("http://localhost/api/admin/featured", {
          method: "PATCH",
          body: JSON.stringify({ action: "reorder", ids: ["id1", "id2"] }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("returns 404 for non-existent item", async () => {
      const res = await PATCH(
        authedRequest("http://localhost/api/admin/featured", {
          method: "PATCH",
          body: JSON.stringify({ id: "nonexistent", headline: "new" }),
          headers: { "content-type": "application/json" },
        })
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE", () => {
    it("returns 400 without id", async () => {
      const res = await DELETE(
        authedRequest("http://localhost/api/admin/featured", { method: "DELETE" })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("missing_id");
    });

    it("returns 404 for non-existent item", async () => {
      const res = await DELETE(
        authedRequest("http://localhost/api/admin/featured?id=nonexistent", { method: "DELETE" })
      );
      expect(res.status).toBe(404);
    });

    it("deletes existing featured content", async () => {
      // Create first
      const createRes = await POST(
        authedRequest("http://localhost/api/admin/featured", {
          method: "POST",
          body: JSON.stringify({
            resourceType: "prompt",
            resourceId: "del-prompt",
            featureType: "featured",
          }),
          headers: { "content-type": "application/json" },
        })
      );
      const created = await createRes.json();

      const res = await DELETE(
        authedRequest(`http://localhost/api/admin/featured?id=${created.data.id}`, {
          method: "DELETE",
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
