import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import {
  getAppeal,
  updateAppealStatus,
  type AppealStatus,
} from "@/lib/moderation/appeal-store";
import {
  getModerationAction,
  reverseModerationAction,
  getModerationReasonLabel,
  getActionTypeLabel,
} from "@/lib/moderation/action-store";

const ADMIN_HEADERS = { "Cache-Control": "no-store" };

/**
 * GET /api/admin/appeals/[id]
 * Get a specific appeal with full details.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = checkAdminPermission(request, "content.moderate");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json(
      { error: auth.reason ?? "forbidden" },
      { status }
    );
  }

  const { id } = await context.params;
  const appeal = getAppeal(id);

  if (!appeal) {
    return NextResponse.json({ error: "Appeal not found." }, { status: 404 });
  }

  const action = getModerationAction(appeal.actionId);
  const now = Date.now();
  const deadline = new Date(appeal.deadlineAt).getTime();
  const isOverdue = (appeal.status === "pending" || appeal.status === "under_review") && now > deadline;

  return NextResponse.json({
    appeal: {
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
    },
    action: action
      ? {
          id: action.id,
          userId: action.userId,
          actionType: action.actionType,
          actionTypeLabel: getActionTypeLabel(action.actionType),
          reason: action.reason,
          reasonLabel: getModerationReasonLabel(action.reason),
          details: action.details,
          internalNotes: action.internalNotes,
          startsAt: action.startsAt,
          endsAt: action.endsAt,
          performedBy: action.performedBy,
          createdAt: action.createdAt,
          reversedAt: action.reversedAt,
        }
      : null,
  }, { headers: ADMIN_HEADERS });
}

/**
 * PATCH /api/admin/appeals/[id]
 * Update appeal status (approve, deny, mark under review).
 *
 * Body:
 * - status: "under_review" | "approved" | "denied"
 * - adminResponse: string (required for approved/denied)
 * - reverseAction: boolean (optional, if approved and we should reverse the moderation action)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = checkAdminPermission(request, "content.moderate");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json(
      { error: auth.reason ?? "forbidden" },
      { status }
    );
  }

  const { id } = await context.params;
  const appeal = getAppeal(id);

  if (!appeal) {
    return NextResponse.json({ error: "Appeal not found." }, { status: 404 });
  }

  let payload: {
    status?: string;
    adminResponse?: string;
    reverseAction?: boolean;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const newStatus = payload.status as AppealStatus;
  const adminResponse = typeof payload.adminResponse === "string" ? payload.adminResponse.trim() : "";
  const reverseAction = payload.reverseAction === true;

  // Validate status
  const validStatuses: AppealStatus[] = ["under_review", "approved", "denied"];
  if (!newStatus || !validStatuses.includes(newStatus)) {
    return NextResponse.json(
      { error: `Status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  // Require admin response for final decisions
  if ((newStatus === "approved" || newStatus === "denied") && !adminResponse) {
    return NextResponse.json(
      { error: "Admin response is required for final decisions." },
      { status: 400 }
    );
  }

  // Can't change already-decided appeals
  if (appeal.status === "approved" || appeal.status === "denied") {
    return NextResponse.json(
      { error: "This appeal has already been decided and cannot be modified." },
      { status: 400 }
    );
  }

  // Use the admin token prefix as a reviewer identifier since the auth
  // system is token-based without individual user identities.
  const authHeader = request.headers.get("authorization");
  const providedToken = (authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null)
    ?? request.headers.get("x-jfp-admin-token")
    ?? "";
  const reviewerId = providedToken
    ? `${auth.role}:${providedToken.slice(0, 8)}`
    : auth.role;

  // Update the appeal
  const updated = updateAppealStatus({
    appealId: id,
    status: newStatus,
    reviewedBy: reviewerId,
    adminResponse: adminResponse || null,
  });

  if (!updated) {
    return NextResponse.json({ error: "Failed to update appeal." }, { status: 500 });
  }

  // If approved and reverseAction is true, reverse the moderation action
  let actionReversed = false;
  if (newStatus === "approved" && reverseAction) {
    const action = getModerationAction(appeal.actionId);
    if (action && !action.reversedAt) {
      const reversed = reverseModerationAction({
        actionId: appeal.actionId,
        reversedBy: `appeal:${reviewerId}`,
        reason: `Appeal approved: ${adminResponse}`,
      });
      actionReversed = !!reversed;
    }
  }

  return NextResponse.json({
    success: true,
    appeal: {
      id: updated.id,
      status: updated.status,
      reviewedAt: updated.reviewedAt,
      reviewedBy: updated.reviewedBy,
      adminResponse: updated.adminResponse,
    },
    actionReversed,
    message: `Appeal has been ${newStatus === "under_review" ? "marked for review" : newStatus}.`,
  }, { headers: ADMIN_HEADERS });
}
