/**
 * Tests for GET /api/skills/[id]
 */
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { prompts } from "@jeffreysprompts/core/prompts/registry";

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/skills/[id]", () => {
  it("returns 404 for non-existent prompt", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/skills/nonexistent"),
      makeContext("nonexistent")
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("not_found");
  });

  it("returns markdown for a valid prompt", async () => {
    const firstPrompt = prompts[0];
    const res = await GET(
      new NextRequest(`http://localhost/api/skills/${firstPrompt.id}`),
      makeContext(firstPrompt.id)
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");

    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
    // Should contain SKILL.md frontmatter
    expect(text).toContain("---");
  });

  it("sets content-disposition with sanitized filename", async () => {
    const firstPrompt = prompts[0];
    const res = await GET(
      new NextRequest(`http://localhost/api/skills/${firstPrompt.id}`),
      makeContext(firstPrompt.id)
    );
    const disposition = res.headers.get("content-disposition");
    expect(disposition).toContain(".SKILL.md");
    expect(disposition).toContain("attachment");
  });

  it("sets cache headers", async () => {
    const firstPrompt = prompts[0];
    const res = await GET(
      new NextRequest(`http://localhost/api/skills/${firstPrompt.id}`),
      makeContext(firstPrompt.id)
    );
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
  });
});
