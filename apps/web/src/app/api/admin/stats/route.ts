import { NextResponse } from "next/server";

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
export async function GET() {
  // TODO: Add admin authentication check
  // const session = await getServerSession();
  // if (!session?.user?.isAdmin) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  // }

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

  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "private, max-age=60",
    },
  });
}
