/**
 * GET /install.sh
 *
 * Returns a bash script that installs all JeffreysPrompts skills
 * as Claude Code skills via HEREDOC embedding.
 *
 * Usage: curl -fsSL https://jeffreysprompts.com/install.sh | bash
 */

import { NextResponse } from "next/server";
import { prompts, featuredPrompts, getPrompt } from "@jeffreysprompts/core/prompts/registry";
import { generateInstallScript } from "@jeffreysprompts/core/export/skills";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const featured = url.searchParams.get("featured");
  const idsParam = url.searchParams.get("ids");
  const projectParam = url.searchParams.get("project");

  const projectEnabled = projectParam === "1" || projectParam === "true" || projectParam === "yes";
  const targetDir = projectEnabled ? "$PWD/.claude/skills" : undefined;

  // By default, install all prompts; ?featured=true installs only featured
  let promptsToInstall = featured === "true" ? featuredPrompts : prompts;

  if (idsParam) {
    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    const selected = ids
      .map((id) => getPrompt(id))
      .filter((prompt): prompt is NonNullable<typeof prompt> => prompt !== undefined);
    promptsToInstall = selected;
  }

  if (idsParam && promptsToInstall.length === 0) {
    const script = `#!/usr/bin/env bash
echo "No matching prompts found for ids: ${idsParam}" >&2
exit 1
`;
    return new NextResponse(script, {
      status: 404,
      headers: {
        "Content-Type": "text/x-shellscript; charset=utf-8",
        "Content-Disposition": 'inline; filename="install.sh"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const script = generateInstallScript(promptsToInstall, targetDir);

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Content-Disposition": 'inline; filename="install.sh"',
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
