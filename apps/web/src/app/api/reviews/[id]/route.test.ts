/**
 * Unit tests for /api/reviews/[id] route (GET, PUT, DELETE)
 * @module api/reviews/[id]/route.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "./route";
import { POST as createReview } from "../route";
import { USER_ID_COOKIE_NAME, createUserIdCookieValue } from "@/lib/user-id";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_review_store__"];
}

function getHeaderValue(
  headers: RequestInit["headers"],
  name: string
): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return found ? found[1] : null;
  }
  return (headers as Record<string, string>)[name] ?? null;
}

function makeRequest(url: string, init?: RequestInit): NextRequest {
  const request = new NextRequest(url, init);
  const cookieHeader = getHeaderValue(init?.headers, "cookie");
  if (cookieHeader) {
    for (const part of cookieHeader.split(";").map((s) => s.trim())) {
      if (!part) continue;
      const i = part.indexOf("=");
      if (i <= 0) continue;
      request.cookies.set(part.slice(0, i), part.slice(i + 1));
    }
  }
  return request;
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const userCookie = `${USER_ID_COOKIE_NAME}=${createUserIdCookieValue("user-1")}`;
const otherCookie = `${USER_ID_COOKIE_NAME}=${createUserIdCookieValue("user-other")}`;

async function seedReview(userId = "user-1") {
  const cookie = `${USER_ID_COOKIE_NAME}=${createUserIdCookieValue(userId)}`;
  const req = makeRequest("http://localhost/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({
      contentType: "prompt",
      contentId: "p1",
      rating: "up",
      content: "A solid prompt for generating ideas quickly.",
      displayName: "TestUser",
    }),
  });
  const res = await createReview(req);
  const data = await res.json();
  return data.review.id as string;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/reviews/[id]", () => {
  beforeEach(() => {
    clearStore();
  });

  // -----------------------------------------------------------------------
  // GET
  // -----------------------------------------------------------------------

  describe("GET", () => {
    it("returns a review by ID", async () => {
      const reviewId = await seedReview();
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`);
      const res = await GET(req, makeContext(reviewId));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.review.id).toBe(reviewId);
      expect(data.review.content).toContain("solid prompt");
    });

    it("returns 404 for nonexistent review", async () => {
      const res = await GET(
        makeRequest("http://localhost/api/reviews/nope"),
        makeContext("nope")
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // DELETE
  // -----------------------------------------------------------------------

  describe("DELETE", () => {
    it("deletes own review", async () => {
      const reviewId = await seedReview("user-1");
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { cookie: userCookie },
      });
      const res = await DELETE(req, makeContext(reviewId));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify it's actually gone
      const getRes = await GET(
        makeRequest(`http://localhost/api/reviews/${reviewId}`),
        makeContext(reviewId)
      );
      expect(getRes.status).toBe(404);
    });

    it("returns 401 without authentication", async () => {
      const reviewId = await seedReview();
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`, {
        method: "DELETE",
      });
      const res = await DELETE(req, makeContext(reviewId));
      expect(res.status).toBe(401);
    });

    it("returns 404 when deleting another user's review", async () => {
      const reviewId = await seedReview("user-1");
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { cookie: otherCookie },
      });
      const res = await DELETE(req, makeContext(reviewId));
      expect(res.status).toBe(404);
    });

    it("returns 404 for nonexistent review", async () => {
      const req = makeRequest("http://localhost/api/reviews/nope", {
        method: "DELETE",
        headers: { cookie: userCookie },
      });
      const res = await DELETE(req, makeContext("nope"));
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // PUT
  // -----------------------------------------------------------------------

  describe("PUT", () => {
    it("updates review content", async () => {
      const reviewId = await seedReview("user-1");
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", cookie: userCookie },
        body: JSON.stringify({ content: "Updated review content with enough characters." }),
      });
      const res = await PUT(req, makeContext(reviewId));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.review.content).toContain("Updated review");
    });

    it("updates review rating", async () => {
      const reviewId = await seedReview("user-1");
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", cookie: userCookie },
        body: JSON.stringify({ rating: "down" }),
      });
      const res = await PUT(req, makeContext(reviewId));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.review.rating).toBe("down");
    });

    it("returns 401 without authentication", async () => {
      const reviewId = await seedReview();
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Updated content that is long enough." }),
      });
      const res = await PUT(req, makeContext(reviewId));
      expect(res.status).toBe(401);
    });

    it("returns 404 for another user's review", async () => {
      const reviewId = await seedReview("user-1");
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", cookie: otherCookie },
        body: JSON.stringify({ content: "Should not be allowed to update." }),
      });
      const res = await PUT(req, makeContext(reviewId));
      expect(res.status).toBe(404);
    });

    it("returns 400 for content too short", async () => {
      const reviewId = await seedReview("user-1");
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", cookie: userCookie },
        body: JSON.stringify({ content: "Short" }),
      });
      const res = await PUT(req, makeContext(reviewId));
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid rating", async () => {
      const reviewId = await seedReview("user-1");
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", cookie: userCookie },
        body: JSON.stringify({ rating: "neutral" }),
      });
      const res = await PUT(req, makeContext(reviewId));
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid JSON", async () => {
      const reviewId = await seedReview("user-1");
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", cookie: userCookie },
        body: "not json",
      });
      const res = await PUT(req, makeContext(reviewId));
      expect(res.status).toBe(400);
    });
  });
});
