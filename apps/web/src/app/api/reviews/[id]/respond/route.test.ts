/**
 * Tests for /api/reviews/[id]/respond (POST, DELETE)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/user-id", () => ({
  getUserIdFromRequest: vi.fn(() => null),
}));

vi.mock("@/lib/reviews/review-store", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getReviewById: vi.fn(actual.getReviewById as (...args: unknown[]) => unknown),
  };
});

import { POST, DELETE } from "./route";
import { getUserIdFromRequest } from "@/lib/user-id";
import { getReviewById } from "@/lib/reviews/review-store";

const mockGetUserId = vi.mocked(getUserIdFromRequest);
const mockGetReview = vi.mocked(getReviewById);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/reviews/[id]/respond", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    mockGetUserId.mockReturnValue(null);
    mockGetReview.mockReset();
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  describe("POST", () => {
    it("returns 401 without user identity", async () => {
      const res = await POST(
        new NextRequest("http://localhost/api/reviews/review1/respond", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: "Thank you!" }),
        }),
        makeContext("review1")
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent review", async () => {
      mockGetUserId.mockReturnValue("user-123");
      mockGetReview.mockReturnValue(null);
      const res = await POST(
        new NextRequest("http://localhost/api/reviews/nonexistent/respond", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: "Thank you!" }),
        }),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });

    it("returns 403 in production mode", async () => {
      mockGetUserId.mockReturnValue("user-123");
      mockGetReview.mockReturnValue({
        id: "review1",
        contentType: "prompt",
        contentId: "p1",
        userId: "other-user",
        rating: 4 as any,
        // title: "Test",
        // body: "A review",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // helpfulVotes: 0,
        // unhelpfulVotes: 0,
        status: "published",
        authorResponse: null,
      } as any);
      vi.stubEnv("NODE_ENV", "production");
      const res = await POST(
        new NextRequest("http://localhost/api/reviews/review1/respond", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content: "Thank you!" }),
        }),
        makeContext("review1")
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("not available");
    });
  });

  describe("DELETE", () => {
    it("returns 401 without user identity", async () => {
      const res = await DELETE(
        new NextRequest("http://localhost/api/reviews/review1/respond", {
          method: "DELETE",
        }),
        makeContext("review1")
      );
      expect(res.status).toBe(401);
    });

    it("returns 404 for non-existent review", async () => {
      mockGetUserId.mockReturnValue("user-123");
      mockGetReview.mockReturnValue(null);
      const res = await DELETE(
        new NextRequest("http://localhost/api/reviews/nonexistent/respond", {
          method: "DELETE",
        }),
        makeContext("nonexistent")
      );
      expect(res.status).toBe(404);
    });
  });
});
