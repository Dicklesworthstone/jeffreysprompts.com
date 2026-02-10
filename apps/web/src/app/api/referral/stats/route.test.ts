/**
 * Tests for GET /api/referral/stats
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_referral_store__"];
}

function makeRequest(params = ""): NextRequest {
  const url = `http://localhost/api/referral/stats${params ? `?${params}` : ""}`;
  return new NextRequest(url);
}

describe("GET /api/referral/stats", () => {
  beforeEach(() => {
    clearStore();
  });

  it("returns success with stats data", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.stats).toBeDefined();
    expect(data.data.rewards).toBeDefined();
  });

  it("includes rewards breakdown", async () => {
    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.data.rewards.perReferral).toBeDefined();
    expect(data.data.rewards.maxPerYear).toBeDefined();
    expect(data.data.rewards.earnedThisYear).toBeDefined();
    expect(data.data.rewards.remainingThisYear).toBeDefined();
  });

  it("includes referrals list when requested", async () => {
    const res = await GET(makeRequest("includeReferrals=true"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.referrals).toBeDefined();
    expect(Array.isArray(data.data.referrals)).toBe(true);
  });

  it("omits referrals list by default", async () => {
    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.data.referrals).toBeUndefined();
  });

  it("sets private cache headers", async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get("cache-control")).toContain("private");
  });
});
