/**
 * Unit tests for /api/share route (POST)
 * @module api/share/route.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

vi.mock("@jeffreysprompts/core/prompts", () => ({
  getPrompt: (id: string) => {
    if (id === "idea-wizard") return { id: "idea-wizard", title: "Idea Wizard" };
    return undefined;
  },
}));

vi.mock("@jeffreysprompts/core/prompts/bundles", () => ({
  getBundle: (id: string) => {
    if (id === "starter-bundle") return { id: "starter-bundle", name: "Starter" };
    return undefined;
  },
}));

vi.mock("@jeffreysprompts/core/prompts/workflows", () => ({
  getWorkflow: (id: string) => {
    if (id === "onboarding") return { id: "onboarding", name: "Onboarding" };
    return undefined;
  },
}));

const mockCreateShareLink = vi.fn();

vi.mock("@/lib/share-links/share-link-store", () => ({
  createShareLink: (...args: unknown[]) => mockCreateShareLink(...args),
}));

vi.mock("@/lib/user-id", () => ({
  getOrCreateUserId: () => ({
    userId: "test-user-123",
    cookie: null,
  }),
}));

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/share POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateShareLink.mockReturnValue({
      linkCode: "abc123XYZ789",
      expiresAt: null,
    });
  });

  it("creates a share link for a valid prompt", async () => {
    const res = await POST(makeRequest({
      contentType: "prompt",
      contentId: "idea-wizard",
    }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.linkCode).toBe("abc123XYZ789");
    expect(data.url).toContain("share/abc123XYZ789");
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(makeRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing");
  });

  it("returns 400 for invalid content type", async () => {
    const res = await POST(makeRequest({
      contentType: "invalid_type",
      contentId: "idea-wizard",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid content type");
  });

  it("returns 404 for non-existent content", async () => {
    const res = await POST(makeRequest({
      contentType: "prompt",
      contentId: "does-not-exist",
    }));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("not found");
  });

  it("returns 400 for password too long", async () => {
    const res = await POST(makeRequest({
      contentType: "prompt",
      contentId: "idea-wizard",
      password: "a".repeat(65),
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Password");
  });

  it("accepts valid password", async () => {
    const res = await POST(makeRequest({
      contentType: "prompt",
      contentId: "idea-wizard",
      password: "secret123",
    }));

    expect(res.status).toBe(200);
    expect(mockCreateShareLink).toHaveBeenCalledWith(
      expect.objectContaining({ password: "secret123" })
    );
  });

  it("maps user_prompt type to prompt", async () => {
    const res = await POST(makeRequest({
      contentType: "user_prompt",
      contentId: "idea-wizard",
    }));

    expect(res.status).toBe(200);
    expect(mockCreateShareLink).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: "prompt" })
    );
  });

  it("returns 400 for invalid expiration", async () => {
    const res = await POST(makeRequest({
      contentType: "prompt",
      contentId: "idea-wizard",
      expiresIn: "not-a-number",
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("expiration");
  });

  it("returns 400 for expiration too far in the future", async () => {
    const res = await POST(makeRequest({
      contentType: "prompt",
      contentId: "idea-wizard",
      expiresIn: 400,
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("365 days");
  });

  it("accepts valid expiresIn", async () => {
    const res = await POST(makeRequest({
      contentType: "prompt",
      contentId: "idea-wizard",
      expiresIn: 7,
    }));

    expect(res.status).toBe(200);
    expect(mockCreateShareLink).toHaveBeenCalledWith(
      expect.objectContaining({
        expiresAt: expect.any(String),
      })
    );
  });

  it("returns 400 for invalid password type", async () => {
    const res = await POST(makeRequest({
      contentType: "prompt",
      contentId: "idea-wizard",
      password: 12345,
    }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("password");
  });
});
