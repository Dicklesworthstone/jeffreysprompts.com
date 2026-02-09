/**
 * Unit tests for /api/status route (GET)
 * @module api/status/route.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";

const mockGetStatusSummary = vi.fn();
const mockGetQuickStatus = vi.fn();

vi.mock("@/lib/status", () => ({
  getStatusSummary: (...args: unknown[]) => mockGetStatusSummary(...args),
  getQuickStatus: (...args: unknown[]) => mockGetQuickStatus(...args),
}));

function makeRequest(url: string): Request {
  return new Request(url);
}

describe("/api/status GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetStatusSummary.mockResolvedValue({
      status: "operational",
      message: "All systems operational",
      components: [
        { name: "web", displayName: "Web Application", status: "operational" },
        { name: "api", displayName: "API", status: "operational" },
      ],
      activeIncidents: [],
      upcomingMaintenance: [],
      updatedAt: "2026-02-09T00:00:00Z",
    });

    mockGetQuickStatus.mockResolvedValue({
      status: "operational",
      message: "All systems operational",
    });
  });

  it("returns 200 with full status summary", async () => {
    const res = await GET(makeRequest("http://localhost/api/status"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("operational");
    expect(data.message).toBe("All systems operational");
    expect(data.components).toHaveLength(2);
  });

  it("returns quick status when quick=true", async () => {
    const res = await GET(makeRequest("http://localhost/api/status?quick=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("operational");
    expect(data.message).toBe("All systems operational");
    expect(mockGetQuickStatus).toHaveBeenCalled();
    expect(mockGetStatusSummary).not.toHaveBeenCalled();
  });

  it("calls getStatusSummary for non-quick requests", async () => {
    await GET(makeRequest("http://localhost/api/status"));

    expect(mockGetStatusSummary).toHaveBeenCalled();
    expect(mockGetQuickStatus).not.toHaveBeenCalled();
  });

  it("sets cache-control headers", async () => {
    const res = await GET(makeRequest("http://localhost/api/status"));

    expect(res.headers.get("Cache-Control")).toContain("s-maxage=30");
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=60");
  });

  it("sets cache-control on quick status too", async () => {
    const res = await GET(makeRequest("http://localhost/api/status?quick=true"));

    expect(res.headers.get("Cache-Control")).toContain("s-maxage=30");
  });

  it("returns degraded status when service reports degraded", async () => {
    mockGetStatusSummary.mockResolvedValueOnce({
      status: "degraded",
      message: "Some systems are experiencing issues",
      components: [
        { name: "web", displayName: "Web Application", status: "degraded" },
      ],
      activeIncidents: [],
      upcomingMaintenance: [],
      updatedAt: "2026-02-09T00:00:00Z",
    });

    const res = await GET(makeRequest("http://localhost/api/status"));
    const data = await res.json();

    expect(data.status).toBe("degraded");
  });
});
