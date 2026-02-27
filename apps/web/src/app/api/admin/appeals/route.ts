import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import {
  listAppeals,
  getAppealStats,
  type AppealStatus,
} from "@/lib/moderation/appeal-store";
import {
  getModerationAction,
  getModerationReasonLabel,
  getActionTypeLabel,
} from "@/lib/moderation/action-store";

const ADMIN_HEADERS = { "Cache-Control": "no-store" };

/**
 * GET /api/admin/appeals
 * Returns appeals queue for admin review.
 *
 * Query params:
 * - status: Filter by status (pending, under_review, approved, denied, all)
 * - sort: Sort order (recent, deadline)
 * - page, limit: Pagination
 */
export async function GET(request: NextRequest) {
  const auth = checkAdminPermission(request, "content.moderate");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json(
      { error: auth.reason ?? "forbidden" },
      { status }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") ?? "pending";
  const sort = searchParams.get("sort") ?? "deadline";
  const parsedPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const parsedLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(50, Math.max(1, parsedLimit)) : 20;

  // Fetch ALL matching appeals so we can sort before paginating
  const allAppeals = listAppeals({
    status: status === "all" ? "all" : (status as AppealStatus),
    limit: 10000,
  });

  // Sort BEFORE pagination so page boundaries are correct
  const sortedAppeals = [...allAppeals].sort((a, b) => {
    if (sort === "deadline") {
      const aActionable = a.status === "pending" || a.status === "under_review";
      const bActionable = b.status === "pending" || b.status === "under_review";
      // Actionable appeals (pending/under_review) come first, sorted by deadline
      if (aActionable && bActionable) {
        return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
      }
      if (aActionable) return -1;
      if (bActionable) return 1;
    }
    // Default: most recent first
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  // Paginate after sorting
  const start = (page - 1) * limit;
  const paginatedAppeals = sortedAppeals.slice(start, start + limit);

  const now = Date.now();

  // Enrich appeals with action details
  const payload = paginatedAppeals.map((appeal) => {
    const action = getModerationAction(appeal.actionId);
    const deadline = new Date(appeal.deadlineAt).getTime();
    const isOverdue = (appeal.status === "pending" || appeal.status === "under_review") && now > deadline;

    return {
      id: appeal.id,
      actionId: appeal.actionId,
      userId: appeal.userId,
      userEmail: appeal.userEmail,
      userName: appeal.userName,
      explanation: appeal.explanation,
      status: appeal.status,
      submittedAt: appeal.submittedAt,
      deadlineAt: appeal.deadlineAt,
      reviewedAt: appeal.reviewedAt,
      reviewedBy: appeal.reviewedBy,
      adminResponse: appeal.adminResponse,
      isOverdue,
      action: action
        ? {
            id: action.id,
            actionType: action.actionType,
            actionTypeLabel: getActionTypeLabel(action.actionType),
            reason: action.reason,
            reasonLabel: getModerationReasonLabel(action.reason),
            details: action.details,
            createdAt: action.createdAt,
            userId: action.userId,
          }
        : null,
    };
  });

  const stats = getAppealStats();

  return NextResponse.json({
    appeals: payload,
    pagination: {
      page,
      limit,
      total: sortedAppeals.length,
      totalPages: Math.ceil(sortedAppeals.length / limit),
    },
    stats: {
      total: stats.total,
      pending: stats.pending,
      underReview: stats.underReview,
      approved: stats.approved,
      denied: stats.denied,
      overdue: stats.overdueCount,
    },
  }, { headers: ADMIN_HEADERS });
}
