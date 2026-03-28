/**
 * GET /api/cli/sync
 *
 * Syncs the authenticated user's premium prompt library to local CLI cache.
 *
 * Expected by: packages/cli/src/commands/sync.ts — syncCommand()
 *
 * Request:
 *   Authorization: Bearer <access_token>
 *   Query params:
 *     since? — ISO 8601 timestamp for incremental sync
 *
 * Response 200:
 *   {
 *     prompts: Array<{
 *       id: string;
 *       title: string;
 *       description?: string;
 *       content: string;
 *       category?: string;
 *       tags?: string[];
 *       version?: string;
 *       created?: string;
 *       updated?: string;
 *     }>;
 *     total: number;
 *     last_modified: string;   // ISO 8601
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
  // TODO: Read ?since param for incremental sync
  // TODO: Query premium prompts owned/accessible by user
  // TODO: Return { prompts, total, last_modified }

  return NextResponse.json(
    { error: "Not implemented", message: "CLI sync endpoint is not yet wired up server-side" },
    { status: 501 }
  );
}
