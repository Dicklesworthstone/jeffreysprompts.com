import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { createShareLink } from "@/lib/share-links/share-link-store";

type NextRequestInit = NonNullable<ConstructorParameters<typeof NextRequest>[1]>;

function clearShareStore() {
  const globalStore = globalThis as unknown as Record<string, unknown>;
  globalStore.__jfp_share_link_store__ = undefined;
}

function makeRequest(url: string, init?: NextRequestInit): NextRequest {
  return new NextRequest(url, init);
}

describe("/api/share/[code]/verify", () => {
  beforeEach(() => {
    clearShareStore();
  });

  it("returns 400 when share code is missing", async () => {
    const request = makeRequest("http://localhost/api/share/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "anything" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: "   " }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Missing share code.");
  });

  it("returns 400 for invalid JSON payload", async () => {
    const link = createShareLink({
      contentType: "prompt",
      contentId: "idea-wizard",
      password: "secret-123",
    });

    const request = makeRequest(`http://localhost/api/share/${link.linkCode}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.10",
      },
      body: "{",
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: link.linkCode }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid JSON body.");
  });

  it("returns 401 for incorrect passwords", async () => {
    const link = createShareLink({
      contentType: "prompt",
      contentId: "idea-wizard",
      password: "right-password",
    });

    const request = makeRequest(`http://localhost/api/share/${link.linkCode}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.11",
      },
      body: JSON.stringify({ password: "wrong-password" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: link.linkCode }),
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Invalid password.");
  });

  it("returns link and content for correct passwords", async () => {
    const link = createShareLink({
      contentType: "prompt",
      contentId: "idea-wizard",
      password: "correct-password",
    });

    const request = makeRequest(`http://localhost/api/share/${link.linkCode}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.12",
      },
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ code: link.linkCode }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.link.code).toBe(link.linkCode);
    expect(payload.content.id).toBe("idea-wizard");
  });

  it("enforces rate limiting per ip + code and returns Retry-After", async () => {
    const link = createShareLink({
      contentType: "prompt",
      contentId: "idea-wizard",
      password: "rate-limit-secret",
    });

    for (let i = 0; i < 5; i += 1) {
      const request = makeRequest(`http://localhost/api/share/${link.linkCode}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.13",
        },
        body: JSON.stringify({ password: "wrong-password" }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ code: link.linkCode }),
      });

      expect(response.status).toBe(401);
    }

    const limitedRequest = makeRequest(`http://localhost/api/share/${link.linkCode}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.13",
      },
      body: JSON.stringify({ password: "wrong-password" }),
    });

    const limitedResponse = await POST(limitedRequest, {
      params: Promise.resolve({ code: link.linkCode }),
    });
    const limitedPayload = await limitedResponse.json();

    expect(limitedResponse.status).toBe(429);
    expect(limitedPayload.error).toBe("Too many attempts. Please try again later.");
    expect(Number(limitedResponse.headers.get("Retry-After") ?? "0")).toBeGreaterThan(0);
  });
});
