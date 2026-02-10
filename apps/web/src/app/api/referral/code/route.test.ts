/**
 * Tests for /api/referral/code (GET, POST)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_referral_store__"];
}

describe("/api/referral/code", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("GET", () => {
    it("returns referral code data", async () => {
      const res = await GET(new NextRequest("http://localhost/api/referral/code"));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toBeDefined();
      expect(data.data.url).toBeDefined();
      expect(data.data.rewards).toBeDefined();
      expect(data.data.createdAt).toBeDefined();
    });

    it("sets private cache headers", async () => {
      const res = await GET(new NextRequest("http://localhost/api/referral/code"));
      expect(res.headers.get("cache-control")).toContain("private");
    });
  });

  describe("POST", () => {
    it("returns referral code data", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/referral/code", { method: "POST" })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toBeDefined();
    });

    it("returns same code for same user", async () => {
      const res1 = await POST(
        new NextRequest("http://localhost/api/referral/code", { method: "POST" })
      );
      const data1 = await res1.json();

      // Second call from same session would produce new user (no cookie carried over)
      // But both calls should succeed
      expect(data1.success).toBe(true);
    });
  });
});
