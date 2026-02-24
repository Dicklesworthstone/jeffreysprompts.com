/**
 * Moderation Action Store
 *
 * Manages user moderation actions including warnings, suspensions, and bans.
 * Uses an in-memory store following the existing pattern from report-store.ts.
 */

export type ActionType = "warning" | "suspension" | "indefinite_suspension" | "ban";
export type ActionStatus = "active" | "expired" | "reversed";

export const ACTION_TYPES = [
  { value: "warning", label: "Warning", severity: 1 },
  { value: "suspension", label: "Temporary Suspension", severity: 2 },
  { value: "indefinite_suspension", label: "Indefinite Suspension", severity: 3 },
  { value: "ban", label: "Permanent Ban", severity: 4 },
] as const;

export const MODERATION_REASONS = [
  { value: "spam", label: "Spam or misleading content" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "copyright", label: "Copyright violation" },
  { value: "impersonation", label: "Impersonation" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "terms_violation", label: "Terms of service violation" },
  { value: "repeated_violations", label: "Repeated violations" },
  { value: "other", label: "Other" },
] as const;

export type ModerationReason = (typeof MODERATION_REASONS)[number]["value"];

const REASON_SET = new Set(MODERATION_REASONS.map((r) => r.value));

export function isModerationReason(value: string): value is ModerationReason {
  return REASON_SET.has(value as ModerationReason);
}

export function getModerationReasonLabel(reason: string): string {
  return MODERATION_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export function getActionSeverity(actionType: ActionType): number {
  return ACTION_TYPES.find((a) => a.value === actionType)?.severity ?? 0;
}

export function getActionTypeLabel(actionType: ActionType): string {
  return ACTION_TYPES.find((a) => a.value === actionType)?.label ?? actionType;
}

export interface ModerationAction {
  id: string;
  userId: string;
  contentId?: string | null;
  contentType?: string | null;
  actionType: ActionType;
  severity: number;
  reason: ModerationReason;
  details?: string | null;
  internalNotes?: string | null;
  startsAt: string;
  endsAt?: string | null;
  performedBy: string;
  createdAt: string;
  reversedAt?: string | null;
  reversedBy?: string | null;
  reversalReason?: string | null;
}

export interface UserStatus {
  status: "active" | "warning" | "suspended" | "banned";
  actionType?: ActionType | null;
  reason?: string | null;
  endsAt?: string | null;
  actionId?: string | null;
}

interface ModerationActionStore {
  actions: Map<string, ModerationAction>;
  actionsByUser: Map<string, string[]>;
  order: string[];
}

const STORE_KEY = "__jfp_moderation_action_store__";

function getStore(): ModerationActionStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: ModerationActionStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      actions: new Map(),
      actionsByUser: new Map(),
      order: [],
    };
  }

  return globalStore[STORE_KEY];
}

function touchAction(store: ModerationActionStore, actionId: string) {
  store.order = [actionId, ...store.order.filter((id) => id !== actionId)];
}

export function createModerationAction(input: {
  userId: string;
  actionType: ActionType;
  reason: ModerationReason;
  performedBy: string;
  contentId?: string | null;
  contentType?: string | null;
  details?: string | null;
  internalNotes?: string | null;
  durationDays?: number | null;
}): ModerationAction {
  const store = getStore();
  const now = new Date();
  const nowIso = now.toISOString();

  let endsAt: string | null = null;
  if (input.actionType === "suspension" && input.durationDays && input.durationDays > 0) {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + input.durationDays);
    endsAt = endDate.toISOString();
  }

  const action: ModerationAction = {
    id: crypto.randomUUID(),
    userId: input.userId,
    contentId: input.contentId ?? null,
    contentType: input.contentType ?? null,
    actionType: input.actionType,
    severity: getActionSeverity(input.actionType),
    reason: input.reason,
    details: input.details ?? null,
    internalNotes: input.internalNotes ?? null,
    startsAt: nowIso,
    endsAt,
    performedBy: input.performedBy,
    createdAt: nowIso,
    reversedAt: null,
    reversedBy: null,
    reversalReason: null,
  };

  store.actions.set(action.id, action);

  const userActions = store.actionsByUser.get(input.userId) ?? [];
  userActions.unshift(action.id);
  store.actionsByUser.set(input.userId, userActions);

  touchAction(store, action.id);
  return action;
}

export function getModerationAction(actionId: string): ModerationAction | null {
  const store = getStore();
  return store.actions.get(actionId) ?? null;
}

export function listModerationActions(filters?: {
  userId?: string | null;
  actionType?: ActionType | "all";
  includeReversed?: boolean;
  includeExpired?: boolean;
  limit?: number;
  page?: number;
}): ModerationAction[] {
  const store = getStore();
  const limit = filters?.limit ?? 50;
  const page = Math.max(1, filters?.page ?? 1);
  const now = Date.now();

  let actionIds: string[];
  if (filters?.userId) {
    actionIds = store.actionsByUser.get(filters.userId) ?? [];
  } else {
    actionIds = store.order;
  }

  const actions = actionIds
    .map((id) => store.actions.get(id))
    .filter((action): action is ModerationAction => Boolean(action))
    .filter((action) => {
      if (filters?.actionType && filters.actionType !== "all" && action.actionType !== filters.actionType) {
        return false;
      }
      if (!filters?.includeReversed && action.reversedAt) {
        return false;
      }
      if (!filters?.includeExpired && action.endsAt) {
        const endsAt = new Date(action.endsAt).getTime();
        if (!Number.isNaN(endsAt) && endsAt < now) {
          return false;
        }
      }
      return true;
    });

  const start = (page - 1) * limit;
  return actions.slice(start, start + limit);
}

export function getUserModerationHistory(userId: string): ModerationAction[] {
  return listModerationActions({
    userId,
    includeReversed: true,
    includeExpired: true,
    limit: 100,
  });
}

export function getActiveActionsForUser(userId: string): ModerationAction[] {
  const store = getStore();
  const now = Date.now();
  const actionIds = store.actionsByUser.get(userId) ?? [];

  return actionIds
    .map((id) => store.actions.get(id))
    .filter((action): action is ModerationAction => Boolean(action))
    .filter((action) => {
      if (action.reversedAt) return false;
      if (action.endsAt) {
        const endsAt = new Date(action.endsAt).getTime();
        if (!Number.isNaN(endsAt) && endsAt < now) return false;
      }
      return true;
    })
    .sort((a, b) => b.severity - a.severity);
}

export function checkUserStatus(userId: string): UserStatus {
  const activeActions = getActiveActionsForUser(userId);

  if (activeActions.length === 0) {
    return { status: "active" };
  }

  const mostSevere = activeActions[0];

  if (mostSevere.actionType === "ban") {
    return {
      status: "banned",
      actionType: "ban",
      reason: mostSevere.reason,
      actionId: mostSevere.id,
    };
  }

  if (mostSevere.actionType === "indefinite_suspension" || mostSevere.actionType === "suspension") {
    return {
      status: "suspended",
      actionType: mostSevere.actionType,
      reason: mostSevere.reason,
      endsAt: mostSevere.endsAt,
      actionId: mostSevere.id,
    };
  }

  if (mostSevere.actionType === "warning") {
    return {
      status: "warning",
      actionType: "warning",
      reason: mostSevere.reason,
      actionId: mostSevere.id,
    };
  }

  return { status: "active" };
}

export function reverseModerationAction(input: {
  actionId: string;
  reversedBy: string;
  reason?: string | null;
}): ModerationAction | null {
  const store = getStore();
  const action = store.actions.get(input.actionId);
  if (!action) return null;

  // Already reversed — return as-is to prevent overwriting original reversal metadata
  if (action.reversedAt) return action;

  action.reversedAt = new Date().toISOString();
  action.reversedBy = input.reversedBy;
  action.reversalReason = input.reason ?? null;

  store.actions.set(action.id, action);
  touchAction(store, action.id);
  return action;
}

export function getModerationStats(): {
  totalActions: number;
  activeActions: number;
  byType: Record<ActionType, number>;
  byReason: Record<string, number>;
} {
  const store = getStore();
  const now = Date.now();

  const stats = {
    totalActions: store.actions.size,
    activeActions: 0,
    byType: {
      warning: 0,
      suspension: 0,
      indefinite_suspension: 0,
      ban: 0,
    } as Record<ActionType, number>,
    byReason: {} as Record<string, number>,
  };

  for (const action of store.actions.values()) {
    stats.byType[action.actionType] = (stats.byType[action.actionType] ?? 0) + 1;
    stats.byReason[action.reason] = (stats.byReason[action.reason] ?? 0) + 1;

    if (!action.reversedAt) {
      if (action.endsAt) {
        const endsAt = new Date(action.endsAt).getTime();
        if (Number.isNaN(endsAt) || endsAt >= now) {
          stats.activeActions += 1;
        }
      } else {
        stats.activeActions += 1;
      }
    }
  }

  return stats;
}

export function hasRecentAction(input: {
  userId: string;
  actionType: ActionType;
  windowMs: number;
}): boolean {
  const store = getStore();
  const now = Date.now();
  const actionIds = store.actionsByUser.get(input.userId) ?? [];

  for (const actionId of actionIds) {
    const action = store.actions.get(actionId);
    if (action && action.actionType === input.actionType) {
      if (action.reversedAt) {
        continue;
      }
      if (action.endsAt) {
        const endsAt = new Date(action.endsAt).getTime();
        if (!Number.isNaN(endsAt) && endsAt < now) {
          continue;
        }
      }
      const createdAt = new Date(action.createdAt).getTime();
      if (!Number.isNaN(createdAt) && now - createdAt < input.windowMs) {
        return true;
      }
    }
  }
  return false;
}
