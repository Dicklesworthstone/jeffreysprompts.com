/**
 * Tests for /api/share/[code] (GET, PUT, DELETE)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "./route";

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
