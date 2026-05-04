import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";

const ADMIN_HEADERS = { "Cache-Control": "no-store" };

function adminJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", ADMIN_HEADERS["Cache-Control"]);
  return response;
}

/**
 * GET /api/admin/stats
 * Returns dashboard statistics for the admin panel.
 *
 * In production, this would:
 * 1. Verify admin authentication via session/JWT
 * 2. Query the database for real statistics
 * 3. Aggregate metrics from Stripe, analytics, etc.
 *
 * For now, returns mock data for UI development.
 */
export async function GET(request: NextRequest) {
  const auth = checkAdminPermission(request, "admins.view");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return adminJson(
      { error: auth.reason ?? "forbidden" },
      { status }
    );
  }

  const stats = {
    totalUsers: 1234,
    newUsersThisWeek: 56,
    usersTrend: "+12%",
    activeSubscribers: 342,
    mrr: 3420,
    subscribersTrend: "+8%",
    totalContent: 4521,
    contentThisWeek: 127,
    pendingModeration: 12,
    generatedAt: new Date().toISOString(),
  };

  return adminJson(stats);
}
