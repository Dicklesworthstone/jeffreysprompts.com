/**
 * Unit tests for /api/export route (GET)
 * @module api/export/route.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import JSZip from "jszip";
import { GET } from "./route";
import * as promptRegistry from "@jeffreysprompts/core/prompts/registry";

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

describe("/api/export", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 for invalid format", async () => {
    const req = makeRequest("http://localhost/api/export?format=bad&ids=idea-wizard");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("bad_request");
  });

  it("returns 400 when ids is missing", async () => {
    const req = makeRequest("http://localhost/api/export?format=md");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("bad_request");
  });

  it("returns 404 when no prompts are found", async () => {
    const req = makeRequest("http://localhost/api/export?format=md&ids=does-not-exist");
    const res = await GET(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("not_found");
    expect(data.missing).toContain("does-not-exist");
  });

  it("returns a single markdown file when requesting one id", async () => {
    const req = makeRequest("http://localhost/api/export?format=md&ids=idea-wizard");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(res.headers.get("content-disposition")).toContain('filename="idea-wizard.md"');
    const text = await res.text();
    expect(text).toContain("# The Idea Wizard");
    expect(text).toContain("## Prompt");
  });

  it("returns a zip for multiple markdown exports", async () => {
    const req = makeRequest(
      "http://localhost/api/export?format=md&ids=idea-wizard,readme-reviser"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toContain('filename="prompts.zip"');

    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    expect(zip.file("idea-wizard.md")).toBeTruthy();
    expect(zip.file("readme-reviser.md")).toBeTruthy();

    const ideaWizardFile = zip.file("idea-wizard.md");
    if (!ideaWizardFile) {
      throw new Error("Expected idea-wizard.md in zip");
    }
    const ideaWizardMd = await ideaWizardFile.async("string");
    expect(ideaWizardMd).toContain("# The Idea Wizard");
  });

  it("includes missing.txt when some ids are missing", async () => {
    const req = makeRequest(
      "http://localhost/api/export?format=md&ids=idea-wizard,does-not-exist"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");

    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    expect(zip.file("idea-wizard.md")).toBeTruthy();
    expect(zip.file("missing.txt")).toBeTruthy();

    const missingFile = zip.file("missing.txt");
    if (!missingFile) {
      throw new Error("Expected missing.txt in zip");
    }
    const missing = await missingFile.async("string");
    expect(missing).toContain("does-not-exist");
  });

  it("returns a skills.zip containing per-skill folders", async () => {
    const req = makeRequest("http://localhost/api/export?format=skill&ids=idea-wizard");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(res.headers.get("content-disposition")).toContain('filename="skills.zip"');

    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const skillFile = zip.file("idea-wizard/SKILL.md");
    expect(skillFile).toBeTruthy();
    if (!skillFile) {
      throw new Error("Expected idea-wizard/SKILL.md in skills.zip");
    }
    const skillMd = await skillFile.async("string");
    expect(skillMd).toContain("name:");
    expect(skillMd).toContain("# The Idea Wizard");
  });

  it("uses a non-empty fallback filename when prompt id sanitizes to empty", async () => {
    const basePrompt = promptRegistry.getPrompt("idea-wizard");
    if (!basePrompt) {
      throw new Error("Expected fixture prompt idea-wizard");
    }

    const originalGetPrompt = promptRegistry.getPrompt;
    vi.spyOn(promptRegistry, "getPrompt").mockImplementation((id: string) => {
      if (id === "empty-safe-id") {
        return { ...basePrompt, id: "$$$" };
      }
      return originalGetPrompt(id);
    });

    const req = makeRequest("http://localhost/api/export?format=md&ids=empty-safe-id");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(res.headers.get("content-disposition")).toMatch(
      /filename="prompt-[a-f0-9]{8}\.md"/
    );
  });

  it("uses a non-empty fallback folder name in skill zip when prompt id sanitizes to empty", async () => {
    const basePrompt = promptRegistry.getPrompt("idea-wizard");
    if (!basePrompt) {
      throw new Error("Expected fixture prompt idea-wizard");
    }

    const originalGetPrompt = promptRegistry.getPrompt;
    vi.spyOn(promptRegistry, "getPrompt").mockImplementation((id: string) => {
      if (id === "empty-safe-id") {
        return { ...basePrompt, id: "$$$" };
      }
      return originalGetPrompt(id);
    });

    const req = makeRequest("http://localhost/api/export?format=skill&ids=empty-safe-id");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/zip");

    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    const entries = Object.keys(zip.files);
    expect(entries.some((name) => /^prompt-[a-f0-9]{8}\/SKILL\.md$/.test(name))).toBe(true);
  });
});
