/**
 * POST /api/cli/premium-packs/:id/install
 * DELETE /api/cli/premium-packs/:id/install
 *
 * Install or uninstall a premium pack for the authenticated user.
 *
 * Expected by: packages/cli/src/commands/premium-packs.ts
 *   — installPremiumPack() (POST)
 *   — uninstallPremiumPack() (DELETE)
 *
 * POST Request:
 *   Authorization: Bearer <access_token>
 *   Body (optional): { tool?: string }
 *
 * POST Response 200:
 *   {
 *     installed: boolean;
 *     alreadyInstalled?: boolean;
 *     packId: string;
 *     installedAt?: string | null;
 *   }
 *
 * DELETE Request:
 *   Authorization: Bearer <access_token>
 *
 * DELETE Response 200:
 *   {
 *     uninstalled: boolean;
 *     removed: boolean;
 *     packId: string;
 *   }
 *
 * Response 401: { error: "unauthorized" }
 * Response 403: { error: "premium subscription required" }
 * Response 404: { error: "Pack not found" }
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Validate bearer token from Authorization header
  // TODO: Verify user has premium tier
  // TODO: Look up pack by id (404 if missing)
  // TODO: Record install for user, return { installed, packId, installedAt }

  return NextResponse.json(
    { error: "Not implemented", message: `CLI pack install for '${id}' is not yet wired up server-side` },
    { status: 501 }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Validate bearer token from Authorization header
  // TODO: Verify user has premium tier
  // TODO: Remove install record for user, return { uninstalled, removed, packId }

  return NextResponse.json(
    { error: "Not implemented", message: `CLI pack uninstall for '${id}' is not yet wired up server-side` },
    { status: 501 }
  );
}
