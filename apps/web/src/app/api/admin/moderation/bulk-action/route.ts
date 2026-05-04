import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import {
  updateContentReport,
  getContentReport,
  type ReportAction,
} from "@/lib/reporting/report-store";

const ADMIN_HEADERS = { "Cache-Control": "no-store" };

function adminJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", ADMIN_HEADERS["Cache-Control"]);
  return response;
}

interface BulkActionRequest {
  itemIds: string[];
  action: "dismiss" | "warn" | "remove";
  reason?: string;
}

interface BulkActionResult {
  reportId: string;
  success: boolean;
  error?: string;
  action?: ReportAction;
}

/**
 * POST /api/admin/moderation/bulk-action
 * Process multiple moderation reports at once.
 *
 * Body:
 * - itemIds: string[] - Array of report IDs to process
 * - action: "dismiss" | "warn" | "remove" - Action to apply to all items
 * - reason: string (optional) - Reason/notes for the action
 *
 * Returns:
 * - results: Array of per-item results with success/failure status
 * - summary: { total, succeeded, failed }
 */
export async function POST(request: NextRequest) {
  const auth = checkAdminPermission(request, "content.moderate");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return adminJson(
      { error: auth.reason ?? "forbidden" },
      { status }
    );
  }

  try {
    const body = (await request.json()) as BulkActionRequest;
    const { itemIds, action, reason } = body;

    // Validate required fields
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return adminJson(
        { error: "Missing or empty itemIds array" },
        { status: 400 }
      );
    }

    if (!itemIds.every((id): id is string => typeof id === "string" && id.trim().length > 0)) {
      return adminJson(
        { error: "All itemIds must be non-empty strings" },
        { status: 400 }
      );
    }

    if (!action) {
      return adminJson(
        { error: "Missing required field: action" },
        { status: 400 }
      );
    }

    const validActions = ["dismiss", "warn", "remove"];
    if (!validActions.includes(action)) {
      return adminJson(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 100;
    if (itemIds.length > MAX_BATCH_SIZE) {
      return adminJson(
        { error: `Batch size exceeds limit of ${MAX_BATCH_SIZE} items` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const processReport = (reportId: string): BulkActionResult => {
      const report = getContentReport(reportId);
      if (!report) {
        return { reportId, success: false, error: "Report not found" };
      }
      if (report.status !== "pending") {
        return {
          reportId,
          success: false,
          error: `Report already processed (status: ${report.status})`,
        };
      }

      const reportAction: ReportAction =
        action === "dismiss" ? "dismiss" : action === "warn" ? "warn" : "remove";

      const updated = updateContentReport({
        reportId,
        action: reportAction,
        reviewerId: auth.role,
        notes: reason ?? `Bulk ${action} by ${auth.role} at ${now}`,
      });

      if (!updated) {
        return { reportId, success: false, error: "Failed to update report" };
      }

      return { reportId, success: true, action: reportAction };
    };

    const results = itemIds.map(processReport);

    // Calculate summary
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return adminJson({
      success: true,
      results,
      summary: {
        total: itemIds.length,
        succeeded,
        failed,
      },
      message: `Processed ${succeeded} of ${itemIds.length} reports with action: ${action}`,
    });
  } catch {
    return adminJson(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
