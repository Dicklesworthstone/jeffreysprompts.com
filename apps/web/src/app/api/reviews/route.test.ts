import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { USER_ID_COOKIE_NAME, createUserIdCookieValue } from "@/lib/user-id";

// Clear review store between tests
function clearStore() {
  const globalStore = globalThis as unknown as Record<string, unknown>;
  delete globalStore["__jfp_review_store__"];
}

function getHeaderValue(
  headers: RequestInit["headers"],
  name: string
): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) {
    const found = headers.find(
      ([key]) => key.toLowerCase() === name.toLowerCase()
    );
    return found ? found[1] : null;
  }
  const record = headers as Record<string, string>;
  return record[name] ?? record[name.toLowerCase()] ?? null;
}

function makeRequest(url: string, init?: RequestInit): NextRequest {
  const request = new NextRequest(url, init);
  const cookieHeader = getHeaderValue(init?.headers, "cookie");

  if (cookieHeader) {
    const parts = cookieHeader.split(";").map((part) => part.trim());
    for (const part of parts) {
      if (!part) continue;
      const splitAt = part.indexOf("=");
      if (splitAt <= 0) continue;
      request.cookies.set(part.slice(0, splitAt), part.slice(splitAt + 1));
    }
  }

  return request;
}

const userCookie = `${USER_ID_COOKIE_NAME}=${createUserIdCookieValue("user-test-1")}`;

describe("reviews API route", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("GET /api/reviews", () => {
    it("returns 400 when contentType is missing", async () => {
      const request = makeRequest("http://localhost/api/reviews?contentId=test");
      const response = await GET(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toBe("contentType and contentId are required.");
    });

    it("returns 400 when contentId is missing", async () => {
      const request = makeRequest("http://localhost/api/reviews?contentType=prompt");
      const response = await GET(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toBe("contentType and contentId are required.");
    });

    it("rejects invalid content type", async () => {
      const request = makeRequest(
        "http://localhost/api/reviews?contentType=invalid&contentId=test"
      );
      const response = await GET(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toBe("Invalid content type.");
    });

    it("rejects oversized content id", async () => {
      const longId = "a".repeat(201);
      const request = makeRequest(
        `http://localhost/api/reviews?contentType=prompt&contentId=${longId}`
      );
      const response = await GET(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toBe("Invalid content id.");
    });

    it("returns empty reviews with public cache headers", async () => {
      const request = makeRequest(
        "http://localhost/api/reviews?contentType=prompt&contentId=test"
      );
      const response = await GET(request);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.reviews).toHaveLength(0);
      expect(payload.summary.totalReviews).toBe(0);
      expect(payload.pagination.total).toBe(0);
      expect(payload.pagination.hasMore).toBe(false);
      expect(response.headers.get("Cache-Control")).toContain("public");
    });

    it("returns private cache headers when userId is present", async () => {
      const request = makeRequest(
        "http://localhost/api/reviews?contentType=prompt&contentId=test",
        { headers: { cookie: userCookie } }
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toContain("private");
    });

    it("respects pagination parameters", async () => {
      // Submit 3 reviews from different users
      for (let i = 0; i < 3; i++) {
        const cookie = `${USER_ID_COOKIE_NAME}=${createUserIdCookieValue(`user-page-${i}`)}`;
        await POST(
          makeRequest("http://localhost/api/reviews", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              cookie,
              "x-forwarded-for": `192.168.1.${i + 10}`,
            },
            body: JSON.stringify({
              contentType: "prompt",
              contentId: "test-pagination",
              rating: "up",
              content: `Pagination test review number ${i}.`,
            }),
          })
        );
      }

      const request = makeRequest(
        "http://localhost/api/reviews?contentType=prompt&contentId=test-pagination&limit=2&offset=0"
      );
      const response = await GET(request);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.reviews).toHaveLength(2);
      expect(payload.pagination.total).toBe(3);
      expect(payload.pagination.hasMore).toBe(true);
    });

    it("defaults invalid sortBy to newest", async () => {
      const request = makeRequest(
        "http://localhost/api/reviews?contentType=prompt&contentId=test&sortBy=invalid"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/reviews", () => {
    it("rejects invalid JSON body", async () => {
      const request = makeRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.1",
        },
        body: "not-json{",
      });
      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toBe("Invalid JSON body.");
    });

    it("rejects missing required fields", async () => {
      const request = makeRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.2",
        },
        body: JSON.stringify({ contentType: "prompt" }),
      });
      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toContain("required");
    });

    it("rejects invalid rating value", async () => {
      const request = makeRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.3",
        },
        body: JSON.stringify({
          contentType: "prompt",
          contentId: "test",
          rating: "neutral",
          content: "This review has an invalid rating value.",
        }),
      });
      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toContain("Must be 'up' or 'down'");
    });

    it("rejects content shorter than 10 characters", async () => {
      const request = makeRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.4",
        },
        body: JSON.stringify({
          contentType: "prompt",
          contentId: "test",
          rating: "up",
          content: "Short",
        }),
      });
      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toContain("at least 10 characters");
    });

    it("rejects content exceeding max length", async () => {
      const request = makeRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "10.0.0.5",
        },
        body: JSON.stringify({
          contentType: "prompt",
          contentId: "test",
          rating: "up",
          content: "x".repeat(2001),
        }),
      });
      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toContain("exceeds maximum length");
    });

    it("creates a new review successfully", async () => {
      const request = makeRequest("http://localhost/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: userCookie,
          "x-forwarded-for": "10.0.0.6",
        },
        body: JSON.stringify({
          contentType: "prompt",
          contentId: "test-submit",
          rating: "up",
          content: "This is a great prompt for testing purposes.",
          displayName: "TestUser",
        }),
      });
      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.isNew).toBe(true);
      expect(payload.review.rating).toBe("up");
      expect(payload.review.content).toBe("This is a great prompt for testing purposes.");
      expect(payload.review.displayName).toBe("TestUser");
      expect(payload.summary.totalReviews).toBe(1);
    });

    it("GET returns submitted review", async () => {
      // Submit
      await POST(
        makeRequest("http://localhost/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: userCookie,
            "x-forwarded-for": "10.0.0.7",
          },
          body: JSON.stringify({
            contentType: "prompt",
            contentId: "test-roundtrip",
            rating: "down",
            content: "This prompt could use some improvement.",
          }),
        })
      );

      // Fetch
      const response = await GET(
        makeRequest(
          "http://localhost/api/reviews?contentType=prompt&contentId=test-roundtrip",
          { headers: { cookie: userCookie } }
        )
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.reviews).toHaveLength(1);
      expect(payload.reviews[0].rating).toBe("down");
      expect(payload.userReview).not.toBeNull();
      expect(payload.userReview.rating).toBe("down");
    });
  });
});
