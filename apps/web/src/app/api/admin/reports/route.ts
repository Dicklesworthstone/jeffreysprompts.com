import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/reports
 * Returns content moderation reports queue.
 *
 * Query params:
 * - status: Filter by status (pending, reviewed, actioned, dismissed)
 * - contentType: Filter by content type (prompt, collection, skill)
 * - reason: Filter by reason
 * - page, limit: Pagination
 *
 * In production, this would query the database with proper auth.
 */
export async function GET(request: NextRequest) {
  // TODO: Add admin authentication check
  // const session = await getServerSession();
  // if (!session?.user?.isAdmin) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  // }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") ?? "pending";
  const contentType = searchParams.get("contentType") ?? "all";
  const reason = searchParams.get("reason") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  // Mock data - in production, this would be a database query
  const mockReports = [
    {
      id: "1",
      contentType: "prompt",
      contentId: "prm_abc123",
      contentTitle: "Suspicious prompt about bypassing...",
      contentAuthor: {
        id: "usr_xyz",
        email: "spammer@example.com",
        name: "Suspicious User",
      },
      reporter: {
        id: "usr_123",
        email: "user123@example.com",
        name: "Helpful Reporter",
      },
      reason: "spam",
      reasonLabel: "Spam or misleading content",
      details: "This prompt appears to be attempting to jailbreak AI models.",
      status: "pending",
      createdAt: "2026-01-11T13:39:00Z",
      reviewedAt: null,
      reviewedBy: null,
      action: null,
    },
    {
      id: "2",
      contentType: "prompt",
      contentId: "prm_def456",
      contentTitle: "Code generation helper",
      contentAuthor: {
        id: "usr_dev",
        email: "developer@example.com",
        name: "Developer",
      },
      reporter: {
        id: "usr_mod",
        email: "moderator@example.com",
        name: "Mod Team",
      },
      reason: "copyright",
      reasonLabel: "Copyright violation",
      details: "Contains copyrighted code snippets from a commercial product.",
      status: "pending",
      createdAt: "2026-01-11T10:30:00Z",
      reviewedAt: null,
      reviewedBy: null,
      action: null,
    },
    {
      id: "3",
      contentType: "collection",
      contentId: "col_ghi789",
      contentTitle: "My awesome prompts",
      contentAuthor: {
        id: "usr_creator",
        email: "creator@example.com",
        name: "Content Creator",
      },
      reporter: {
        id: "usr_concern",
        email: "concerned@example.com",
        name: "Concerned User",
      },
      reason: "inappropriate",
      reasonLabel: "Inappropriate or offensive",
      details: "Collection description contains inappropriate language.",
      status: "pending",
      createdAt: "2026-01-10T15:00:00Z",
      reviewedAt: null,
      reviewedBy: null,
      action: null,
    },
  ];

  // Apply filters
  let filteredReports = mockReports;
  if (status !== "all") {
    filteredReports = filteredReports.filter((r) => r.status === status);
  }
  if (contentType !== "all") {
    filteredReports = filteredReports.filter((r) => r.contentType === contentType);
  }
  if (reason !== "all") {
    filteredReports = filteredReports.filter((r) => r.reason === reason);
  }

  return NextResponse.json({
    reports: filteredReports,
    pagination: {
      page,
      limit,
      total: filteredReports.length,
      totalPages: Math.ceil(filteredReports.length / limit),
    },
    stats: {
      pending: 12,
      reviewed: 45,
      actioned: 23,
      dismissed: 45,
    },
  });
}

/**
 * PUT /api/admin/reports
 * Update report status (review action).
 *
 * Body:
 * - reportId: string
 * - action: "dismiss" | "warn" | "remove" | "ban"
 * - notes: string (optional)
 */
export async function PUT(request: NextRequest) {
  // TODO: Add admin authentication check
  // const session = await getServerSession();
  // if (!session?.user?.isAdmin) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  // }

  try {
    const body = await request.json();
    const { reportId, action, notes } = body;

    if (!reportId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: reportId, action" },
        { status: 400 }
      );
    }

    const validActions = ["dismiss", "warn", "remove", "ban"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // In production, this would:
    // 1. Update report status in database
    // 2. Take action on content (hide, delete, etc.)
    // 3. Notify content author if warning/action taken
    // 4. Log the moderation action for audit

    return NextResponse.json({
      success: true,
      reportId,
      action,
      notes: notes ?? null,
      processedAt: new Date().toISOString(),
      message: `Report ${reportId} has been processed with action: ${action}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
