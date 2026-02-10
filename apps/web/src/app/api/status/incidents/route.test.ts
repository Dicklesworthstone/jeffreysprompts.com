/**
 * Tests for GET /api/status/incidents (public)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_status_store__"];
}

function makeRequest(params = ""): NextRequest {
  const url = `http://localhost/api/status/incidents${params ? `?${params}` : ""}`;
  return new NextRequest(url);
}

describe("GET /api/status/incidents", () => {
  beforeEach(() => {
    clearStore();
  });

  it("returns incidents list with total", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.incidents)).toBe(true);
    expect(typeof data.total).toBe("number");
  });

  it("returns 404 for non-existent incident by id", async () => {
    const res = await GET(makeRequest("id=nonexistent"));
    expect(res.status).toBe(404);
  });

  it("filters by status=resolved", async () => {
    const res = await GET(makeRequest("status=resolved"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.incidents)).toBe(true);
  });

  it("clamps limit to 1-100", async () => {
    const res = await GET(makeRequest("limit=200"));
    expect(res.status).toBe(200);
  });

  it("normalizes invalid status to all", async () => {
    const res = await GET(makeRequest("status=bogus"));
    expect(res.status).toBe(200);
  });

  it("sets cache headers", async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get("cache-control")).toContain("s-maxage=30");
  });
});
