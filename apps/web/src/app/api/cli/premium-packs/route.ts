/**
 * GET /api/cli/premium-packs
 *
 * Lists available premium packs for the authenticated user.
 *
 * Expected by: packages/cli/src/commands/premium-packs.ts — listPremiumPacks()
 *
 * Request:
 *   Authorization: Bearer <access_token>
 *   Query params:
 *     installed? — "true" to filter to installed packs only
 *
 * Response 200:
 *   {
 *     packs: Array<{
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
 *       category?: {
 *         id: string;
 *         name: string;
 *         slug: string;
 *         icon?: string | null;
 *         color?: string | null;
 *       } | null;
 *     }>;
 *     installedOnly: boolean;
 *   }
 *
 * Response 401: { error: "unauthorized" }
 * Response 403: { error: "premium subscription required" }
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // TODO: Validate bearer token from Authorization header
  // TODO: Verify user has premium tier
  // TODO: Read ?installed param
  // TODO: Query packs catalog, annotate with user's install status
  // TODO: Return { packs, installedOnly }

  return NextResponse.json(
    { error: "Not implemented", message: "CLI premium-packs list endpoint is not yet wired up server-side" },
    { status: 501 }
  );
}
