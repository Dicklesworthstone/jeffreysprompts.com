import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { USER_ID_COOKIE_NAME, createUserIdCookieValue } from "@/lib/user-id";

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

describe("ratings API route", () => {
  it("returns validation errors for missing contentType/contentId", async () => {
    const request = makeRequest("http://localhost/api/ratings?contentId=missing-type");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("contentType and contentId are required.");
  });

  it("rejects invalid content type", async () => {
    const request = makeRequest("http://localhost/api/ratings?contentType=invalid&contentId=abc");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid content type.");
  });

  it("returns empty summary with public cache headers", async () => {
    const request = makeRequest("http://localhost/api/ratings?contentType=prompt&contentId=prompt-1");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.summary.total).toBe(0);
    expect(payload.userRating).toBeNull();
    expect(response.headers.get("Cache-Control")).toContain("public");
  });

  it("returns private cache headers when userId is provided", async () => {
    const cookieValue = createUserIdCookieValue("user-1");
    const request = makeRequest(
      "http://localhost/api/ratings?contentType=prompt&contentId=prompt-2",
      {
        headers: {
          cookie: `${USER_ID_COOKIE_NAME}=${cookieValue}`,
        },
      }
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("private");
  });

  it("rejects invalid JSON bodies", async () => {
    const request = makeRequest("http://localhost/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid JSON body.");
  });

  it("accepts rating submissions and updates summary", async () => {
    const contentId = "prompt-3";
    const submitRequest = makeRequest("http://localhost/api/ratings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `${USER_ID_COOKIE_NAME}=${createUserIdCookieValue("user-3")}`,
      },
      body: JSON.stringify({
        contentType: "prompt",
        contentId,
        value: "up",
      }),
    });

    const submitResponse = await POST(submitRequest);
    const submitPayload = await submitResponse.json();

    expect(submitResponse.status).toBe(200);
    expect(submitPayload.success).toBe(true);
    expect(submitPayload.summary.total).toBe(1);

    const getRequest = makeRequest(
      `http://localhost/api/ratings?contentType=prompt&contentId=${contentId}`,
      {
        headers: {
          cookie: `${USER_ID_COOKIE_NAME}=${createUserIdCookieValue("user-3")}`,
        },
      }
    );
    const getResponse = await GET(getRequest);
    const getPayload = await getResponse.json();

    expect(getPayload.summary.total).toBe(1);
    expect(getPayload.userRating).toBe("up");
  });
});
