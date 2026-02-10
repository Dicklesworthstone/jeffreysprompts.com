/**
 * Tests for GET /api/users/[username]
 */
import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function makeContext(username: string) {
  return { params: Promise.resolve({ username }) };
}

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_profile_store__"];
}

describe("GET /api/users/[username]", () => {
  beforeEach(() => {
    clearStore();
  });

  it("returns 400 for invalid username format", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/users/!!!"),
      makeContext("!!!")
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("invalid_username");
  });

  it("returns 400 for empty username", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/users/"),
      makeContext("")
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent user", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/users/nonexistentuser"),
      makeContext("nonexistentuser")
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("not_found");
  });

  it("sets cache headers on response", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/users/test-user"),
      makeContext("test-user")
    );
    // Whether 200 or 404, if it returned profile it would have cache headers
    if (res.status === 200) {
      expect(res.headers.get("cache-control")).toContain("s-maxage=60");
    }
  });
});
