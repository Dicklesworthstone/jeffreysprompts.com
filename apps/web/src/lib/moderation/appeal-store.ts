/**
 * Moderation Appeal Store
 *
 * Manages user appeals for moderation decisions.
 * Uses an in-memory store following the existing pattern from action-store.ts.
 *
 * Business rules:
 * - Users can submit 1 appeal per moderation action
 * - Appeals must be submitted within 7 days of the action
 * - Admins have 14 days to review an appeal
 */

export type AppealStatus = "pending" | "under_review" | "approved" | "denied";

export const APPEAL_STATUSES = [
  { value: "pending", label: "Pending Review" },
  { value: "under_review", label: "Under Review" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
] as const;

export const APPEAL_SUBMISSION_WINDOW_DAYS = 7;
export const APPEAL_REVIEW_DEADLINE_DAYS = 14;

export function getAppealStatusLabel(status: AppealStatus): string {
  return APPEAL_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export interface ModerationAppeal {
  id: string;
  accessToken: string;
  actionId: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  explanation: string;
  status: AppealStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  adminResponse?: string | null;
  deadlineAt: string;
}

export interface AppealWithAction extends ModerationAppeal {
  action?: {
    id: string;
    actionType: string;
    reason: string;
    details?: string | null;
    createdAt: string;
  } | null;
}

interface AppealStore {
  appeals: Map<string, ModerationAppeal>;
  appealsByAction: Map<string, string>;
  appealsByUser: Map<string, string[]>;
  order: string[];
}

const STORE_KEY = "__jfp_moderation_appeal_store__";

function getStore(): AppealStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: AppealStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      appeals: new Map(),
      appealsByAction: new Map(),
      appealsByUser: new Map(),
      order: [],
    };
  }

  return globalStore[STORE_KEY];
}

function touchAppeal(store: AppealStore, appealId: string) {
  store.order = [appealId, ...store.order.filter((id) => id !== appealId)];
}

function createAppealAccessToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

export function canAppealAction(actionId: string, actionCreatedAt: string): {
  canAppeal: boolean;
  reason?: string;
} {
  const store = getStore();

  // Check if appeal already exists for this action
  if (store.appealsByAction.has(actionId)) {
    return { canAppeal: false, reason: "An appeal has already been submitted for this action" };
  }

  // Check if within submission window
  const actionDate = new Date(actionCreatedAt).getTime();
  if (Number.isNaN(actionDate)) {
    return { canAppeal: false, reason: "Invalid action date" };
  }

  const windowMs = APPEAL_SUBMISSION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (now - actionDate > windowMs) {
    return {
      canAppeal: false,
      reason: `Appeal window has expired. Appeals must be submitted within ${APPEAL_SUBMISSION_WINDOW_DAYS} days`,
    };
  }

  return { canAppeal: true };
}

export function createAppeal(input: {
  actionId: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  explanation: string;
}): ModerationAppeal | { error: string } {
  const store = getStore();

  // Check if appeal already exists
  if (store.appealsByAction.has(input.actionId)) {
    return { error: "An appeal has already been submitted for this action" };
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Calculate review deadline
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + APPEAL_REVIEW_DEADLINE_DAYS);

  const appeal: ModerationAppeal = {
    id: crypto.randomUUID(),
    accessToken: createAppealAccessToken(),
    actionId: input.actionId,
    userId: input.userId,
    userEmail: input.userEmail ?? null,
    userName: input.userName ?? null,
    explanation: input.explanation,
    status: "pending",
    submittedAt: nowIso,
    reviewedAt: null,
    reviewedBy: null,
    adminResponse: null,
    deadlineAt: deadline.toISOString(),
  };

  store.appeals.set(appeal.id, appeal);
  store.appealsByAction.set(input.actionId, appeal.id);

  const userAppeals = store.appealsByUser.get(input.userId) ?? [];
  userAppeals.unshift(appeal.id);
  store.appealsByUser.set(input.userId, userAppeals);

  touchAppeal(store, appeal.id);
  return appeal;
}

export function getAppeal(appealId: string): ModerationAppeal | null {
  const store = getStore();
  return store.appeals.get(appealId) ?? null;
}

export function getAppealByActionId(actionId: string): ModerationAppeal | null {
  const store = getStore();
  const appealId = store.appealsByAction.get(actionId);
  if (!appealId) return null;
  return store.appeals.get(appealId) ?? null;
}

export function listAppeals(filters?: {
  status?: AppealStatus | "all";
  userId?: string | null;
  limit?: number;
  page?: number;
}): ModerationAppeal[] {
  const store = getStore();
  const limit = filters?.limit ?? 50;
  const page = Math.max(1, filters?.page ?? 1);

  let appealIds: string[];
  if (filters?.userId) {
    appealIds = store.appealsByUser.get(filters.userId) ?? [];
  } else {
    appealIds = store.order;
  }

  const appeals = appealIds
    .map((id) => store.appeals.get(id))
    .filter((appeal): appeal is ModerationAppeal => Boolean(appeal))
    .filter((appeal) => {
      if (filters?.status && filters.status !== "all" && appeal.status !== filters.status) {
        return false;
      }
      return true;
    });

  const start = (page - 1) * limit;
  return appeals.slice(start, start + limit);
}

export function updateAppealStatus(input: {
  appealId: string;
  status: AppealStatus;
  reviewedBy?: string | null;
  adminResponse?: string | null;
}): ModerationAppeal | null {
  const store = getStore();
  const appeal = store.appeals.get(input.appealId);
  if (!appeal) return null;

  appeal.status = input.status;
  if (input.reviewedBy) {
    appeal.reviewedBy = input.reviewedBy;
    appeal.reviewedAt = new Date().toISOString();
  }
  if (input.adminResponse !== undefined) {
    appeal.adminResponse = input.adminResponse;
  }

  store.appeals.set(appeal.id, appeal);
  touchAppeal(store, appeal.id);
  return appeal;
}

export function getAppealStats(): {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  denied: number;
  overdueCount: number;
} {
  const store = getStore();
  const now = Date.now();

  const stats = {
    total: store.appeals.size,
    pending: 0,
    underReview: 0,
    approved: 0,
    denied: 0,
    overdueCount: 0,
  };

  for (const appeal of store.appeals.values()) {
    switch (appeal.status) {
      case "pending":
        stats.pending += 1;
        break;
      case "under_review":
        stats.underReview += 1;
        break;
      case "approved":
        stats.approved += 1;
        break;
      case "denied":
        stats.denied += 1;
        break;
    }

    // Check for overdue appeals (pending or under_review past deadline)
    if (appeal.status === "pending" || appeal.status === "under_review") {
      const deadline = new Date(appeal.deadlineAt).getTime();
      if (!Number.isNaN(deadline) && now > deadline) {
        stats.overdueCount += 1;
      }
    }
  }

  return stats;
}

export function getUserAppeals(userId: string): ModerationAppeal[] {
  return listAppeals({
    userId,
    status: "all",
    limit: 100,
  });
}
