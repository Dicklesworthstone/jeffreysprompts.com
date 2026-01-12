import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import {
  getReportReasonLabel,
  listContentReports,
  getReportStats,
  updateContentReport,
} from "@/lib/reporting/report-store";

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
  const auth = checkAdminPermission(request, "content.view_reported");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json(
      { error: auth.reason ?? "forbidden" },
      { status }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") ?? "pending";
  const contentType = searchParams.get("contentType") ?? "all";
  const reason = searchParams.get("reason") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  const reports = listContentReports({
    status: status === "all" ? "all" : (status as "pending" | "reviewed" | "actioned" | "dismissed"),
    contentType: contentType === "all" ? "all" : (contentType as "prompt" | "bundle" | "workflow" | "collection"),
    reason: reason === "all" ? "all" : (reason as "spam" | "offensive" | "copyright" | "harmful" | "other"),
    page,
    limit,
  });

  const reportStats = getReportStats();
  const totalCount = listContentReports({
    status: status === "all" ? "all" : (status as "pending" | "reviewed" | "actioned" | "dismissed"),
    contentType: contentType === "all" ? "all" : (contentType as "prompt" | "bundle" | "workflow" | "collection"),
    reason: reason === "all" ? "all" : (reason as "spam" | "offensive" | "copyright" | "harmful" | "other"),
    page: 1,
    limit: 10000,
  }).length;

  const payload = reports.map((report) => ({
    id: report.id,
    contentType: report.contentType,
    contentId: report.contentId,
    contentTitle: report.contentTitle ?? "Untitled content",
    contentAuthor: {
      id: "unknown",
      email: "unknown",
      name: "Unknown author",
    },
    reporter: {
      id: report.reporter.id,
      email: report.reporter.email ?? "anonymous",
      name: report.reporter.name ?? "Anonymous",
    },
    reason: report.reason,
    reasonLabel: getReportReasonLabel(report.reason),
    details: report.details ?? "",
    status: report.status,
    createdAt: report.createdAt,
    reviewedAt: report.reviewedAt ?? null,
    reviewedBy: report.reviewedBy ?? null,
    action: report.action ?? null,
  }));

  return NextResponse.json({
    reports: payload,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
    stats: {
      pending: reportStats.pending,
      reviewed: reportStats.reviewed,
      actioned: reportStats.actioned,
      dismissed: reportStats.dismissed,
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
  const auth = checkAdminPermission(request, "content.moderate");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json(
      { error: auth.reason ?? "forbidden" },
      { status }
    );
  }

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

    const updated = updateContentReport({
      reportId,
      action,
      reviewerId: auth.role,
      notes: notes ?? null,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Report not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reportId: updated.id,
      action: updated.action,
      notes: updated.reviewNotes,
      processedAt: updated.reviewedAt,
      message: `Report ${updated.id} has been processed with action: ${action}`,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
