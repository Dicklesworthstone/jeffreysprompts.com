/**
 * Tests for GET /api/share/mine
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_share_link_store__"];
}

function makeRequest(params = ""): NextRequest {
  const url = `http://localhost/api/share/mine${params ? `?${params}` : ""}`;
  return new NextRequest(url);
}

describe("GET /api/share/mine", () => {
  beforeEach(() => {
    clearStore();
  });

  it("returns links array for anonymous user", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.links)).toBe(true);
  });

  it("returns empty links for new user", async () => {
    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.links).toHaveLength(0);
  });

  it("accepts includeInactive param", async () => {
    const res = await GET(makeRequest("includeInactive=true"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.links)).toBe(true);
  });

  it("sets private cache headers", async () => {
    const res = await GET(makeRequest());
    expect(res.headers.get("cache-control")).toContain("private");
  });
});
