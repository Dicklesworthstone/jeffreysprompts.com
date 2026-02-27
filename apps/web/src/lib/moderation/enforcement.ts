/**
 * Moderation Enforcement
 *
 * Functions for enforcing moderation actions on users.
 * Checks user status and determines if they can access the system.
 */

import {
  checkUserStatus,
  getModerationReasonLabel,
  getActionTypeLabel,
  getModerationAction,
  type UserStatus,
  type ActionType,
} from "./action-store";
import { canAppealAction, getAppealByActionId } from "./appeal-store";

export interface EnforcementResult {
  allowed: boolean;
  status: UserStatus;
  message?: string;
  redirectTo?: string;
}

export interface SuspensionInfo {
  isSuspended: boolean;
  isBanned: boolean;
  isPermanent: boolean;
  reason: string;
  reasonLabel: string;
  actionType: string;
  actionTypeLabel: string;
  endsAt: string | null;
  timeRemaining: string | null;
  canAppeal: boolean;
  actionId: string | null;
}

/**
 * Check if a user is allowed to access the system
 */
export function enforceUserAccess(userId: string): EnforcementResult {
  const status = checkUserStatus(userId);

  if (status.status === "active") {
    return {
      allowed: true,
      status,
    };
  }

  if (status.status === "warning") {
    // Warnings don't block access, just inform
    return {
      allowed: true,
      status,
      message: "You have received a warning. Please review the community guidelines.",
    };
  }

  if (status.status === "suspended") {
    const reasonLabel = status.reason ? getModerationReasonLabel(status.reason) : "Policy violation";
    const actionLabel = status.actionType ? getActionTypeLabel(status.actionType) : "Suspended";

    let message = `Your account has been ${actionLabel.toLowerCase()}.`;
    if (status.endsAt) {
      const endsAt = new Date(status.endsAt);
      if (!Number.isNaN(endsAt.getTime())) {
        message += ` Access will be restored on ${endsAt.toLocaleDateString()}.`;
      }
    } else {
      message += " This suspension requires manual review.";
    }
    message += ` Reason: ${reasonLabel}.`;

    return {
      allowed: false,
      status,
      message,
      redirectTo: "/suspended",
    };
  }

  if (status.status === "banned") {
    return {
      allowed: false,
      status,
      message: "Your account has been permanently banned due to policy violations.",
      redirectTo: "/suspended",
    };
  }

  return {
    allowed: true,
    status,
  };
}

/**
 * Get detailed suspension information for display
 */
export function getSuspensionInfo(userId: string): SuspensionInfo | null {
  const status = checkUserStatus(userId);

  if (status.status === "active" || status.status === "warning") {
    return null;
  }

  const isSuspended = status.status === "suspended";
  const isBanned = status.status === "banned";
  const isPermanent = isBanned || (isSuspended && !status.endsAt);

  let timeRemaining: string | null = null;
  if (status.endsAt) {
    const endsAt = new Date(status.endsAt).getTime();
    const now = Date.now();
    if (!Number.isNaN(endsAt) && endsAt > now) {
      const remainingMs = endsAt - now;
      const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        timeRemaining = `${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"}`;
      } else if (hours > 0) {
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        timeRemaining = `${hours} hour${hours === 1 ? "" : "s"}, ${minutes} minute${minutes === 1 ? "" : "s"}`;
      } else {
        const minutes = Math.floor(remainingMs / (1000 * 60));
        timeRemaining = `${minutes} minute${minutes === 1 ? "" : "s"}`;
      }
    }
  }

  // Determine if user can appeal this action
  let canAppeal = false;
  if (!isBanned && status.actionId) {
    const action = getModerationAction(status.actionId);
    if (action) {
      // Check if an appeal already exists
      const existingAppeal = getAppealByActionId(status.actionId);
      if (!existingAppeal) {
        // Check if within appeal window
        const appealCheck = canAppealAction(status.actionId, action.createdAt);
        canAppeal = appealCheck.canAppeal;
      }
    }
  }

  return {
    isSuspended,
    isBanned,
    isPermanent,
    reason: status.reason ?? "policy_violation",
    reasonLabel: status.reason ? getModerationReasonLabel(status.reason) : "Policy violation",
    actionType: status.actionType ?? "suspension",
    actionTypeLabel: status.actionType ? getActionTypeLabel(status.actionType) : "Suspension",
    endsAt: status.endsAt ?? null,
    timeRemaining,
    canAppeal,
    actionId: status.actionId ?? null,
  };
}

/**
 * Format a suspension end date for display
 */
export function formatSuspensionEndDate(endsAt: string | null | undefined): string {
  if (!endsAt) return "Indefinite";

  const date = new Date(endsAt);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Check if a specific action type blocks access
 */
export function isBlockingAction(actionType: ActionType): boolean {
  return actionType === "suspension" || actionType === "indefinite_suspension" || actionType === "ban";
}

/**
 * Get user-friendly action description
 */
export function getActionDescription(actionType: ActionType, endsAt?: string | null): string {
  switch (actionType) {
    case "warning":
      return "You have received a warning for violating the community guidelines.";
    case "suspension":
      if (endsAt) {
        const date = new Date(endsAt);
        if (!Number.isNaN(date.getTime())) {
          return `Your account has been temporarily suspended until ${date.toLocaleDateString()}.`;
        }
      }
      return "Your account has been temporarily suspended.";
    case "indefinite_suspension":
      return "Your account has been suspended indefinitely pending review.";
    case "ban":
      return "Your account has been permanently banned.";
    default:
      return "Your account has been restricted.";
  }
}
