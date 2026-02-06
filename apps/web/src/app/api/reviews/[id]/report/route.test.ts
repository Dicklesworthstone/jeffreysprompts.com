/**
 * Unit tests for /api/reviews/[id]/report route (POST)
 * @module api/reviews/[id]/report/route.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
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
const reporterCookie = `${USER_ID_COOKIE_NAME}=${createUserIdCookieValue("reporter-1")}`;

async function seedReview(): Promise<string> {
  const req = makeRequest("http://localhost/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: authorCookie },
    body: JSON.stringify({
      contentType: "prompt",
      contentId: "p1",
      rating: "up",
      content: "A review that might get reported for testing.",
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

describe("/api/reviews/[id]/report", () => {
  beforeEach(() => {
    clearStore();
  });

  it("reports a review successfully", async () => {
    const reviewId = await seedReview();
    const req = makeRequest(`http://localhost/api/reviews/${reviewId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: reporterCookie },
      body: JSON.stringify({ reason: "Inappropriate content" }),
    });
    const res = await POST(req, makeContext(reviewId));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("report");
  });

  it("reports without a reason (optional)", async () => {
    const reviewId = await seedReview();
    const req = makeRequest(`http://localhost/api/reviews/${reviewId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: reporterCookie },
      body: JSON.stringify({}),
    });
    const res = await POST(req, makeContext(reviewId));
    expect(res.status).toBe(200);
  });

  it("returns 400 for already-reported review", async () => {
    const reviewId = await seedReview();
    // Report once
    await POST(
      makeRequest(`http://localhost/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: reporterCookie },
        body: JSON.stringify({ reason: "spam" }),
      }),
      makeContext(reviewId)
    );

    // Report again
    const res = await POST(
      makeRequest(`http://localhost/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: reporterCookie },
        body: JSON.stringify({ reason: "still spam" }),
      }),
      makeContext(reviewId)
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("already reported");
  });

  it("prevents self-reporting", async () => {
    const reviewId = await seedReview();
    const req = makeRequest(`http://localhost/api/reviews/${reviewId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: authorCookie },
      body: JSON.stringify({ reason: "I want to report my own" }),
    });
    const res = await POST(req, makeContext(reviewId));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("own review");
  });

  it("returns 404 for nonexistent review", async () => {
    const req = makeRequest("http://localhost/api/reviews/nope/report", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: reporterCookie },
      body: JSON.stringify({ reason: "test" }),
    });
    const res = await POST(req, makeContext("nope"));
    expect(res.status).toBe(404);
  });
});
