/**
 * GET /api/cli/me
 *
 * Returns the current authenticated user's profile for CLI identity checks.
 *
 * Expected by: packages/cli/src/lib/api-client.ts — verifyAuth()
 *
 * Request:
 *   Authorization: Bearer <access_token>
 *
 * Response 200:
 *   { email: string, tier: "free" | "premium" }
 *
 * Response 401:
 *   { error: "unauthorized" }
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // TODO: Validate bearer token from Authorization header
  // TODO: Look up user by token and return { email, tier }

  return NextResponse.json(
    { error: "Not implemented", message: "CLI user endpoint is not yet wired up server-side" },
    { status: 501 }
  );
}
