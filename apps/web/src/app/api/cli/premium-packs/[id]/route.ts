/**
 * GET /api/cli/premium-packs/:id
 *
 * Returns full detail for a single premium pack, including its prompts.
 *
 * Expected by: packages/cli/src/commands/premium-packs.ts — fetchPremiumPackDetail()
 *
 * Request:
 *   Authorization: Bearer <access_token>
 *
 * Response 200:
 *   {
 *     pack: {
 *       id: string;
 *       title: string;
 *       description?: string | null;
 *       coverImage?: string | null;
 *       version?: string | null;
 *       installCount?: number | null;
 *       promptCount: number;
 *       isInstalled: boolean;
 *       installedAt?: string | null;
 *       publishedAt?: string | null;
 *       changelog?: string | null;
 *       category?: { id, name, slug, icon?, color? } | null;
 *       prompts: Array<{
 *         id: string;
 *         title: string;
 *         description?: string | null;
 *         content?: string | null;
 *         version?: string | null;
 *         accessLevel?: string | null;
 *         position?: number;
 *       }>;
 *     }
 *   }
 *
 * Response 401: { error: "unauthorized" }
 * Response 403: { error: "premium subscription required" }
 * Response 404: { error: "Pack not found" }
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Validate bearer token from Authorization header
  // TODO: Verify user has premium tier
  // TODO: Look up pack by id, include prompts
  // TODO: Return { pack } or 404

  return NextResponse.json(
    { error: "Not implemented", message: `CLI premium-pack detail for '${id}' is not yet wired up server-side` },
    { status: 501 }
  );
}
