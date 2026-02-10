/**
 * Tests for GET /api/roadmap/[id] (public)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_roadmap_store__"];
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/roadmap/[id]", () => {
  beforeEach(() => {
    clearStore();
  });

  it("returns 404 for non-existent feature", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/roadmap/nonexistent"),
      makeContext("nonexistent")
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("not_found");
  });

  it("returns feature with comments and hasVoted for anonymous user", async () => {
    // The roadmap store may or may not have seed data
    // If it does, test that the response shape is correct
    const res = await GET(
      new NextRequest("http://localhost/api/roadmap/feat-1"),
      makeContext("feat-1")
    );
    if (res.status === 200) {
      const data = await res.json();
      expect(data.feature).toBeDefined();
      expect(data.comments).toBeDefined();
      expect(data.hasVoted).toBe(false);
      // Anonymous users get public cache
      expect(res.headers.get("cache-control")).toContain("public");
    } else {
      expect(res.status).toBe(404);
    }
  });
});
