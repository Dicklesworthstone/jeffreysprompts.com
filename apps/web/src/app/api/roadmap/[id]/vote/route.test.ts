/**
 * Tests for /api/roadmap/[id]/vote (POST, DELETE)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "./route";

function clearStores() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_roadmap_store__"];
  delete g["__jfp_rate_limiter_roadmap-vote__"];
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/roadmap/[id]/vote", () => {
  beforeEach(() => {
    clearStores();
  });

  describe("POST", () => {
    it("returns 404 for non-existent feature", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/roadmap/nonexistent/vote", {
          method: "POST",
        }),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE", () => {
    it("returns 404 for non-existent feature", async () => {
      const res = await DELETE(
        new NextRequest("http://localhost/api/roadmap/nonexistent/vote", {
          method: "DELETE",
        }),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });
  });
});
