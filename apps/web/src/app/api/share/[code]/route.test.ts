/**
 * Tests for /api/share/[code] (GET, PUT, DELETE)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "./route";
import { createShareLink } from "@/lib/share-links/share-link-store";

function clearStores() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_share_link_store__"];
  delete g["__jfp_rate_limiter_share-link-lookups__"];
}

function makeContext(code: string) {
  return { params: Promise.resolve({ code }) };
}

describe("/api/share/[code]", () => {
  beforeEach(() => {
    clearStores();
  });

  describe("GET", () => {
    it("returns 400 for empty code", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/share/ "),
        makeContext(" ")
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent code", async () => {
      const res = await GET(
        new NextRequest("http://localhost/api/share/nonexistent"),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });

    it("returns expiresAt for expired links", async () => {
      const expiredAt = new Date(Date.now() - 60_000).toISOString();
      const link = createShareLink({
        contentType: "prompt",
        contentId: "idea-wizard",
        expiresAt: expiredAt,
      });

      const res = await GET(
        new NextRequest(`http://localhost/api/share/${link.linkCode}`),
        makeContext(link.linkCode)
      );

      expect(res.status).toBe(410);
      const payload = await res.json();
      expect(payload.expiresAt).toBe(expiredAt);
    });
  });

  describe("PUT", () => {
    it("returns 400 for empty code", async () => {
      const res = await PUT(
        new NextRequest("http://localhost/api/share/ ", {
          method: "PUT",
          body: JSON.stringify({}),
        }),
        makeContext(" ")
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent code", async () => {
      const res = await PUT(
        new NextRequest("http://localhost/api/share/nonexistent", {
          method: "PUT",
          body: JSON.stringify({}),
        }),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE", () => {
    it("returns 400 for empty code", async () => {
      const res = await DELETE(
        new NextRequest("http://localhost/api/share/ ", { method: "DELETE" }),
        makeContext(" ")
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent code", async () => {
      const res = await DELETE(
        new NextRequest("http://localhost/api/share/nonexistent", { method: "DELETE" }),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });
  });
});
