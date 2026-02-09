/**
 * Unit tests for /api/roadmap route (GET, POST)
 * @module api/roadmap/route.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const mockGetFeatures = vi.fn();
const mockGetRoadmapByStatus = vi.fn();
const mockGetRoadmapStats = vi.fn();
const mockSubmitFeature = vi.fn();

vi.mock("@/lib/roadmap/roadmap-store", () => ({
  getFeatures: (...args: unknown[]) => mockGetFeatures(...args),
  getRoadmapByStatus: (...args: unknown[]) => mockGetRoadmapByStatus(...args),
  getRoadmapStats: (...args: unknown[]) => mockGetRoadmapStats(...args),
  submitFeature: (...args: unknown[]) => mockSubmitFeature(...args),
}));

vi.mock("@/lib/user-id", () => ({
  getOrCreateUserId: () => ({
    userId: "test-user-456",
    cookie: null,
  }),
}));

const sampleFeatures = [
  {
    id: "feat-001",
    title: "Dark Mode",
    status: "shipped",
    voteCount: 847,
    createdAt: "2025-11-15T00:00:00Z",
  },
  {
    id: "feat-002",
    title: "Version History",
    status: "in_progress",
    voteCount: 523,
    createdAt: "2025-12-01T00:00:00Z",
  },
];

const sampleStats = {
  totalFeatures: 10,
  underReview: 2,
  planned: 4,
  inProgress: 2,
  shipped: 1,
  declined: 1,
  totalVotes: 4000,
};

function makeGetRequest(url: string): NextRequest {
  return new NextRequest(url);
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/roadmap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/roadmap GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatures.mockReturnValue(sampleFeatures);
    mockGetRoadmapByStatus.mockReturnValue({
      under_review: [],
      planned: [],
      in_progress: [sampleFeatures[1]],
      shipped: [sampleFeatures[0]],
      declined: [],
    });
    mockGetRoadmapStats.mockReturnValue(sampleStats);
  });

  it("returns 200 with features list", async () => {
    const res = await GET(makeGetRequest("http://localhost/api/roadmap"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.features).toHaveLength(2);
  });

  it("returns grouped roadmap when grouped=true", async () => {
    const res = await GET(makeGetRequest("http://localhost/api/roadmap?grouped=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.roadmap).toBeDefined();
    expect(data.roadmap.shipped).toHaveLength(1);
    expect(mockGetRoadmapByStatus).toHaveBeenCalled();
  });

  it("includes stats when stats=true", async () => {
    const res = await GET(makeGetRequest("http://localhost/api/roadmap?stats=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stats).toBeDefined();
    expect(data.stats.totalFeatures).toBe(10);
  });

  it("includes stats with grouped view", async () => {
    const res = await GET(makeGetRequest("http://localhost/api/roadmap?grouped=true&stats=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.roadmap).toBeDefined();
    expect(data.stats).toBeDefined();
  });

  it("passes status filter to getFeatures", async () => {
    await GET(makeGetRequest("http://localhost/api/roadmap?status=planned,in_progress"));

    expect(mockGetFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ["planned", "in_progress"],
      })
    );
  });

  it("passes sortBy to getFeatures", async () => {
    await GET(makeGetRequest("http://localhost/api/roadmap?sortBy=newest"));

    expect(mockGetFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: "newest",
      })
    );
  });

  it("passes limit to getFeatures", async () => {
    await GET(makeGetRequest("http://localhost/api/roadmap?limit=5"));

    expect(mockGetFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 5,
      })
    );
  });

  it("ignores invalid limit values", async () => {
    await GET(makeGetRequest("http://localhost/api/roadmap?limit=abc"));

    expect(mockGetFeatures).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: undefined,
      })
    );
  });

  it("sets cache-control headers", async () => {
    const res = await GET(makeGetRequest("http://localhost/api/roadmap"));

    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=300");
  });
});

describe("/api/roadmap POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitFeature.mockReturnValue({
      id: "feat-new",
      title: "New Feature",
      description: "A brand new feature request",
      status: "under_review",
      voteCount: 1,
      commentCount: 0,
      createdAt: "2026-02-09T00:00:00Z",
      updatedAt: "2026-02-09T00:00:00Z",
    });
  });

  it("creates a feature request with valid data", async () => {
    const res = await POST(makePostRequest({
      title: "New Feature Request",
      description: "This is a detailed description of the feature request that is long enough.",
    }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.feature).toBeDefined();
    expect(data.feature.id).toBe("feat-new");
  });

  it("returns 400 for title too short", async () => {
    const res = await POST(makePostRequest({
      title: "Hi",
      description: "This is a detailed description of the feature request that is long enough.",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid_title");
  });

  it("returns 400 for missing title", async () => {
    const res = await POST(makePostRequest({
      description: "This is a detailed description of the feature request that is long enough.",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid_title");
  });

  it("returns 400 for description too short", async () => {
    const res = await POST(makePostRequest({
      title: "Valid Title Here",
      description: "Too short.",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid_description");
  });

  it("returns 400 for title too long", async () => {
    const res = await POST(makePostRequest({
      title: "A".repeat(101),
      description: "This is a detailed description of the feature request that is long enough.",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("title_too_long");
  });

  it("returns 400 for description too long", async () => {
    const res = await POST(makePostRequest({
      title: "Valid Title Here",
      description: "A".repeat(2001),
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("description_too_long");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("invalid_json");
  });

  it("passes trimmed data to submitFeature", async () => {
    await POST(makePostRequest({
      title: "  Feature With Spaces  ",
      description: "  Description with leading and trailing spaces  ",
      useCase: "  Use case here  ",
    }));

    expect(mockSubmitFeature).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Feature With Spaces",
        description: "Description with leading and trailing spaces",
        useCase: "Use case here",
      })
    );
  });

  it("passes userId to submitFeature", async () => {
    await POST(makePostRequest({
      title: "New Feature Request",
      description: "This is a detailed description of the feature request that is long enough.",
    }));

    expect(mockSubmitFeature).toHaveBeenCalledWith(
      expect.objectContaining({
        submittedBy: "test-user-456",
      })
    );
  });
});
