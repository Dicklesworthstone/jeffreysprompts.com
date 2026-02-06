import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { getPrompt } from "@jeffreysprompts/core/prompts/registry";
import { generatePromptMarkdown } from "@jeffreysprompts/core/export/markdown";
import { generateSkillMd } from "@jeffreysprompts/core/export/skills";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

// Ensure this runs in a Node.js runtime (JSZip + core export helpers rely on Node APIs).
export const runtime = "nodejs";

const MAX_IDS = 200;

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);
}

function safeIdForFilename(id: string): string {
  // Defense-in-depth: prevent path traversal or weird Content-Disposition values.
  return id.replace(/[^a-z0-9-]/gi, "");
}

function safeDownloadName(name: string): string {
  // Only allow a conservative charset in filenames.
  return name.replace(/[^a-z0-9._-]/gi, "");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const format = searchParams.get("format");
  if (format !== "md" && format !== "skill") {
    return NextResponse.json(
      { error: "bad_request", message: "format must be one of: md, skill" },
      { status: 400 }
    );
  }

  const ids = parseIds(searchParams.get("ids") ?? searchParams.get("id"));
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "bad_request", message: "ids is required" },
      { status: 400 }
    );
  }

  const found: Prompt[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const prompt = getPrompt(id);
    if (prompt) {
      found.push(prompt);
    } else {
      missing.push(id);
    }
  }

  if (found.length === 0) {
    return NextResponse.json(
      { error: "not_found", message: "No prompts found for provided ids", missing },
      { status: 404 }
    );
  }

  if (format === "md" && found.length === 1 && missing.length === 0) {
    const prompt = found[0];
    const safeId = safeIdForFilename(prompt.id);
    const markdown = generatePromptMarkdown(prompt);
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeDownloadName(`${safeId}.md`)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const zip = new JSZip();

  if (format === "md") {
    for (const prompt of found) {
      const safeId = safeIdForFilename(prompt.id);
      zip.file(`${safeId}.md`, generatePromptMarkdown(prompt));
    }
    if (missing.length > 0) {
      zip.file("missing.txt", `${missing.join("\n")}\n`);
    }

    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="prompts.zip"`,
        // Not strictly cacheable across users, but safe enough for public prompts.
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // format === "skill"
  for (const prompt of found) {
    const safeId = safeIdForFilename(prompt.id);
    zip.file(`${safeId}/SKILL.md`, generateSkillMd(prompt));
  }
  if (missing.length > 0) {
    zip.file("missing.txt", `${missing.join("\n")}\n`);
  }

  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="skills.zip"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
