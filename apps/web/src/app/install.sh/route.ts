/**
 * GET /install.sh
 *
 * Returns a bash script that installs all JeffreysPrompts skills
 * as Claude Code skills via HEREDOC embedding.
 *
 * Usage: curl -fsSL https://jeffreysprompts.com/install.sh | bash
 */

import { NextResponse } from "next/server";
import { prompts, featuredPrompts } from "@jeffreysprompts/core/prompts/registry";
import { generateInstallScript } from "@jeffreysprompts/core/export/skills";

export const dynamic = "force-static";
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const featured = url.searchParams.get("featured");

  // By default, install all prompts; ?featured=true installs only featured
  const promptsToInstall = featured === "true" ? featuredPrompts : prompts;

  const script = generateInstallScript(promptsToInstall);

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
