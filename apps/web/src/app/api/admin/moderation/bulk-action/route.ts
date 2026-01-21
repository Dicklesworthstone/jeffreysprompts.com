import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import {
  updateContentReport,
  getContentReport,
  type ReportAction,
} from "@/lib/reporting/report-store";

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
    return NextResponse.json(
      { error: auth.reason ?? "forbidden" },
      { status }
    );
  }

  try {
    const body = (await request.json()) as BulkActionRequest;
    const { itemIds, action, reason } = body;

    // Validate required fields
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty itemIds array" },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "Missing required field: action" },
        { status: 400 }
      );
    }

    const validActions = ["dismiss", "warn", "remove"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 100;
    if (itemIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Batch size exceeds limit of ${MAX_BATCH_SIZE} items` },
        { status: 400 }
      );
    }

    // Process each item
    const results: BulkActionResult[] = [];
    const now = new Date().toISOString();

    for (const reportId of itemIds) {
      // Check if report exists
      const report = getContentReport(reportId);
      if (!report) {
        results.push({
          reportId,
          success: false,
          error: "Report not found",
        });
        continue;
      }

      // Skip already processed reports
      if (report.status !== "pending") {
        results.push({
          reportId,
          success: false,
          error: `Report already processed (status: ${report.status})`,
        });
        continue;
      }

      // Map bulk action to report action
      const reportAction: ReportAction = action === "dismiss" ? "dismiss" : action === "warn" ? "warn" : "remove";

      // Update the report
      const updated = updateContentReport({
        reportId,
        action: reportAction,
        reviewerId: auth.role,
        notes: reason ?? `Bulk ${action} by ${auth.role} at ${now}`,
      });

      if (updated) {
        results.push({
          reportId,
          success: true,
          action: reportAction,
        });
      } else {
        results.push({
          reportId,
          success: false,
          error: "Failed to update report",
        });
      }
    }

    // Calculate summary
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
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
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
