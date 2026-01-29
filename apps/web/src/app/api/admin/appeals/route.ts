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

  const appeals = listAppeals({
    status: status === "all" ? "all" : (status as AppealStatus),
    page,
    limit,
  });

  // Get total count for pagination
  const totalAppeals = listAppeals({
    status: status === "all" ? "all" : (status as AppealStatus),
    page: 1,
    limit: 10000,
  });

  // Sort by deadline for pending/under_review, by recent for others
  const sortedAppeals = [...appeals].sort((a, b) => {
    if (sort === "deadline") {
      // For pending/under_review, sort by deadline (earliest first)
      if (a.status === "pending" || a.status === "under_review") {
        return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
      }
    }
    // Default: sort by submission date (most recent first)
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  const now = Date.now();

  // Enrich appeals with action details
  const payload = sortedAppeals.map((appeal) => {
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
      total: totalAppeals.length,
      totalPages: Math.ceil(totalAppeals.length / limit),
    },
    stats: {
      total: stats.total,
      pending: stats.pending,
      underReview: stats.underReview,
      approved: stats.approved,
      denied: stats.denied,
      overdue: stats.overdueCount,
    },
  });
}
