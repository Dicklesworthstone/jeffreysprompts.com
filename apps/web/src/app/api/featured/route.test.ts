/**
 * Tests for GET /api/featured (public)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_featured_store__"];
}

function makeRequest(params = ""): NextRequest {
  const url = `http://localhost/api/featured${params ? `?${params}` : ""}`;
  return new NextRequest(url);
}

describe("GET /api/featured", () => {
  beforeEach(() => {
    clearStore();
  });

  it("returns success with data array", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.meta).toBeDefined();
  });

  it("returns 400 for invalid feature type", async () => {
    const res = await GET(makeRequest("type=bogus"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid_feature_type");
  });

  it("returns 400 for invalid resource type", async () => {
    const res = await GET(makeRequest("resourceType=bogus"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid_resource_type");
  });

  it("accepts type=staff_pick", async () => {
    const res = await GET(makeRequest("type=staff_pick"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.meta.type).toBe("staff_pick");
  });

  it("accepts type=featured", async () => {
    const res = await GET(makeRequest("type=featured"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.meta.type).toBe("featured");
  });

  it("clamps limit to 1-50", async () => {
    const res = await GET(makeRequest("limit=100"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.meta.limit).toBe(50);
  });

  it("sets cache headers", async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get("cache-control")).toContain("s-maxage=60");
  });
});
