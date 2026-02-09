/**
 * Unit tests for /api/prompts route (GET)
 * @module api/prompts/route.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

vi.mock("@jeffreysprompts/core/prompts", () => ({
  prompts: [
    { id: "p1", title: "Prompt A", category: "ideation", tags: ["brainstorming"], featured: true },
    { id: "p2", title: "Prompt B", category: "documentation", tags: ["docs"], featured: false },
    { id: "p3", title: "Prompt C", category: "ideation", tags: ["brainstorming", "ultrathink"], featured: true },
  ],
  categories: ["ideation", "documentation"],
  tags: ["brainstorming", "docs", "ultrathink"],
  bundles: [],
  workflows: [],
}));

vi.mock("@jeffreysprompts/core/export", () => ({
  buildRegistryPayload: (version: string) => ({
    version,
    prompts: [
      { id: "p1", title: "Prompt A", category: "ideation", tags: ["brainstorming"], featured: true },
      { id: "p2", title: "Prompt B", category: "documentation", tags: ["docs"], featured: false },
      { id: "p3", title: "Prompt C", category: "ideation", tags: ["brainstorming", "ultrathink"], featured: true },
    ],
    meta: { promptCount: 3, categories: ["ideation", "documentation"], tags: ["brainstorming", "docs", "ultrathink"] },
  }),
  buildPromptList: () => [
    { id: "p1", title: "Prompt A", category: "ideation", tags: ["brainstorming"] },
    { id: "p2", title: "Prompt B", category: "documentation", tags: ["docs"] },
    { id: "p3", title: "Prompt C", category: "ideation", tags: ["brainstorming", "ultrathink"] },
  ],
}));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return {
    ...actual,
    default: {
      ...actual,
      createHash: () => ({
        update: () => ({
          digest: () => "abcdef01",
        }),
      }),
    },
    createHash: () => ({
      update: () => ({
        digest: () => "abcdef01",
      }),
    }),
  };
});

function makeRequest(url: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(url, { headers });
}

describe("/api/prompts GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with full registry", async () => {
    const res = await GET(makeRequest("http://localhost/api/prompts"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.prompts).toHaveLength(3);
    expect(data.meta).toBeDefined();
  });

  it("returns minimal list when minimal=true", async () => {
    const res = await GET(makeRequest("http://localhost/api/prompts?minimal=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.prompts).toHaveLength(3);
    expect(data.meta.count).toBe(3);
  });

  it("filters by category", async () => {
    const res = await GET(makeRequest("http://localhost/api/prompts?category=ideation"));
    const data = await res.json();

    expect(res.status).toBe(200);
    const ids = data.prompts.map((p: { id: string }) => p.id);
    expect(ids).toContain("p1");
    expect(ids).toContain("p3");
    expect(ids).not.toContain("p2");
  });

  it("filters by tag", async () => {
    const res = await GET(makeRequest("http://localhost/api/prompts?tag=docs"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.prompts).toHaveLength(1);
    expect(data.prompts[0].id).toBe("p2");
  });

  it("filters by featured", async () => {
    const res = await GET(makeRequest("http://localhost/api/prompts?featured=true"));
    const data = await res.json();

    expect(res.status).toBe(200);
    const ids = data.prompts.map((p: { id: string }) => p.id);
    expect(ids).toContain("p1");
    expect(ids).toContain("p3");
    expect(ids).not.toContain("p2");
  });

  it("filters minimal list by category", async () => {
    const res = await GET(makeRequest("http://localhost/api/prompts?minimal=true&category=documentation"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.prompts).toHaveLength(1);
    expect(data.meta.count).toBe(1);
  });

  it("sets ETag header", async () => {
    const res = await GET(makeRequest("http://localhost/api/prompts"));

    expect(res.headers.get("ETag")).toBeTruthy();
  });

  it("returns 304 when ETag matches", async () => {
    const firstRes = await GET(makeRequest("http://localhost/api/prompts"));
    const etag = firstRes.headers.get("ETag")!;

    const secondRes = await GET(makeRequest("http://localhost/api/prompts", { "if-none-match": etag }));
    expect(secondRes.status).toBe(304);
  });

  it("sets cache-control headers", async () => {
    const res = await GET(makeRequest("http://localhost/api/prompts"));

    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(res.headers.get("Cache-Control")).toContain("max-age=60");
    expect(res.headers.get("Cache-Control")).toContain("stale-while-revalidate=300");
  });

  it("sets Vary header", async () => {
    const res = await GET(makeRequest("http://localhost/api/prompts"));

    expect(res.headers.get("Vary")).toBe("Accept-Encoding");
  });

  it("generates different ETags for different filter params", async () => {
    const res1 = await GET(makeRequest("http://localhost/api/prompts"));
    const res2 = await GET(makeRequest("http://localhost/api/prompts?category=ideation"));

    expect(res1.headers.get("ETag")).not.toBe(res2.headers.get("ETag"));
  });
});
