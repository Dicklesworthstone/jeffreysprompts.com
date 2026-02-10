/**
 * Tests for GET /api/health/status
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const TOKEN = "test-health-token";

function authedRequest(): NextRequest {
  return new NextRequest("http://localhost/api/health/status", {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
}

describe("GET /api/health/status", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.JFP_HEALTH_STATUS_TOKEN = TOKEN;
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.restoreAllMocks();
  });

  it("returns 403 without auth token", async () => {
    const res = await GET(new NextRequest("http://localhost/api/health/status"));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("forbidden");
  });

  it("returns 403 with wrong token", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/health/status", {
        headers: { authorization: "Bearer wrong-token" },
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns health data with valid token", async () => {
    const res = await GET(authedRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBeDefined();
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
    expect(data.checks).toBeDefined();
  });

  it("includes memory and uptime info", async () => {
    const res = await GET(authedRequest());
    const data = await res.json();
    expect(data.memory).toBeDefined();
    expect(typeof data.uptimeSeconds).toBe("number");
  });

  it("sets no-store cache headers", async () => {
    const res = await GET(authedRequest());
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("allows access in development without token", async () => {
    delete process.env.JFP_HEALTH_STATUS_TOKEN;
    process.env.NODE_ENV = "development";
    const res = await GET(new NextRequest("http://localhost/api/health/status"));
    expect(res.status).toBe(200);
  });
});
