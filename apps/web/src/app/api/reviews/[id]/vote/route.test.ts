/**
 * Unit tests for /api/reviews/[id]/vote route (GET, POST)
 * @module api/reviews/[id]/vote/route.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { POST as createReview } from "../../route";
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

const authorCookie = `${USER_ID_COOKIE_NAME}=${createUserIdCookieValue("review-author")}`;
const voterCookie = `${USER_ID_COOKIE_NAME}=${createUserIdCookieValue("voter-1")}`;

async function seedReview(): Promise<string> {
  const req = makeRequest("http://localhost/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: authorCookie },
    body: JSON.stringify({
      contentType: "prompt",
      contentId: "p1",
      rating: "up",
      content: "An excellent prompt for daily brainstorming.",
      displayName: "Author",
    }),
  });
  const res = await createReview(req);
  const data = await res.json();
  return data.review.id as string;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("/api/reviews/[id]/vote", () => {
  beforeEach(() => {
    clearStore();
  });

  // -----------------------------------------------------------------------
  // GET
  // -----------------------------------------------------------------------

  describe("GET", () => {
    it("returns null vote when user has not voted", async () => {
      const reviewId = await seedReview();
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}/vote`, {
        headers: { cookie: voterCookie },
      });
      const res = await GET(req, makeContext(reviewId));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.vote).toBeNull();
    });

    it("returns 404 for nonexistent review", async () => {
      const res = await GET(
        makeRequest("http://localhost/api/reviews/nope/vote"),
        makeContext("nope")
      );
      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // POST
  // -----------------------------------------------------------------------

  describe("POST", () => {
    it("submits a helpful vote", async () => {
      const reviewId = await seedReview();
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: voterCookie },
        body: JSON.stringify({ isHelpful: true }),
      });
      const res = await POST(req, makeContext(reviewId));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.vote.isHelpful).toBe(true);
    });

    it("submits a not-helpful vote", async () => {
      const reviewId = await seedReview();
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: voterCookie },
        body: JSON.stringify({ isHelpful: false }),
      });
      const res = await POST(req, makeContext(reviewId));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.vote.isHelpful).toBe(false);
    });

    it("updates helpful count on review after vote", async () => {
      const reviewId = await seedReview();
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: voterCookie },
        body: JSON.stringify({ isHelpful: true }),
      });
      const res = await POST(req, makeContext(reviewId));
      const data = await res.json();

      expect(data.review.helpfulCount).toBeGreaterThanOrEqual(1);
    });

    it("prevents self-voting", async () => {
      const reviewId = await seedReview();
      // Author tries to vote on their own review
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: authorCookie },
        body: JSON.stringify({ isHelpful: true }),
      });
      const res = await POST(req, makeContext(reviewId));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("own review");
    });

    it("returns 400 when isHelpful is missing", async () => {
      const reviewId = await seedReview();
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: voterCookie },
        body: JSON.stringify({}),
      });
      const res = await POST(req, makeContext(reviewId));
      expect(res.status).toBe(400);
    });

    it("returns 400 when isHelpful is not boolean", async () => {
      const reviewId = await seedReview();
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: voterCookie },
        body: JSON.stringify({ isHelpful: "yes" }),
      });
      const res = await POST(req, makeContext(reviewId));
      expect(res.status).toBe(400);
    });

    it("returns 404 for nonexistent review", async () => {
      const req = makeRequest("http://localhost/api/reviews/nope/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: voterCookie },
        body: JSON.stringify({ isHelpful: true }),
      });
      const res = await POST(req, makeContext("nope"));
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid JSON", async () => {
      const reviewId = await seedReview();
      const req = makeRequest(`http://localhost/api/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: voterCookie },
        body: "bad json",
      });
      const res = await POST(req, makeContext(reviewId));
      expect(res.status).toBe(400);
    });
  });
});
