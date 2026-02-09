import type { HistoryResourceType, ViewHistoryEntry } from "./types";

interface HistoryStore {
  entries: Map<string, ViewHistoryEntry>;
  entriesByUser: Map<string, string[]>;
}

const STORE_KEY = "__jfp_view_history_store__";
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const HISTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 1000; // Only prune once per minute per user

// Track last prune time per user to avoid O(n) scan on every call
const lastPruneTime = new Map<string, number>();

function getStore(): HistoryStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: HistoryStore;
  };

  if (!globalStore[STORE_KEY]) {
    // Keep prune tracker in sync with store lifecycle to avoid stale-key buildup.
    lastPruneTime.clear();
    globalStore[STORE_KEY] = {
      entries: new Map(),
      entriesByUser: new Map(),
    };
  }

  return globalStore[STORE_KEY];
}

function touchEntry(store: HistoryStore, userId: string, entryId: string) {
  const list = store.entriesByUser.get(userId) ?? [];
  store.entriesByUser.set(userId, [entryId, ...list.filter((id) => id !== entryId)]);
}

function safeDateMs(value: string): number | null {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Prune expired history entries for a user.
 *
 * Throttled to run at most once per PRUNE_INTERVAL_MS to avoid
 * O(n) scans on every view. The entries list is kept sorted by
 * recency (most recent first), so expired entries accumulate at
 * the end and are cleaned up periodically.
 */
function pruneUserHistory(store: HistoryStore, userId: string, force = false) {
  const now = Date.now();
  const entries = store.entriesByUser.get(userId);

  // Drop empty user buckets and stale prune-tracker keys eagerly.
  if (!entries || entries.length === 0) {
    store.entriesByUser.delete(userId);
    lastPruneTime.delete(userId);
    return;
  }

  // Skip if we pruned recently (unless forced)
  if (!force) {
    const lastPrune = lastPruneTime.get(userId) ?? 0;
    if (now - lastPrune < PRUNE_INTERVAL_MS) {
      return;
    }
  }
  lastPruneTime.set(userId, now);

  const cutoff = now - HISTORY_TTL_MS;
  const kept: string[] = [];
  const existingEntries = entries
    .map((entryId) => ({ entryId, entry: store.entries.get(entryId) }))
    .filter(
      (item): item is { entryId: string; entry: ViewHistoryEntry } =>
        item.entry !== undefined
    );

  for (const { entryId, entry } of existingEntries) {
    const viewedMs = safeDateMs(entry.viewedAt);
    const effectiveViewedMs = viewedMs === null ? now : viewedMs;
    if (effectiveViewedMs < cutoff) {
      store.entries.delete(entryId);
      continue;
    }
    kept.push(entryId);
  }

  if (kept.length === 0) {
    store.entriesByUser.delete(userId);
    lastPruneTime.delete(userId);
    return;
  }

  store.entriesByUser.set(userId, kept);
}

function isDuplicateEntry(
  entry: ViewHistoryEntry,
  input: {
    resourceType: HistoryResourceType;
    resourceId?: string | null;
    searchQuery?: string | null;
  }
): boolean {
  if (entry.resourceType !== input.resourceType) return false;

  if (input.resourceType === "search") {
    const existingQuery = entry.searchQuery?.toLowerCase() ?? "";
    const nextQuery = input.searchQuery?.toLowerCase() ?? "";
    return existingQuery !== "" && existingQuery === nextQuery;
  }

  return entry.resourceId === (input.resourceId ?? null);
}

export function recordView(input: {
  userId: string;
  resourceType: HistoryResourceType;
  resourceId?: string | null;
  searchQuery?: string | null;
  source?: string | null;
  viewedAt?: string | null;
  duration?: number | null;
}): ViewHistoryEntry {
  const store = getStore();
  pruneUserHistory(store, input.userId);

  const now = input.viewedAt ? new Date(input.viewedAt) : new Date();
  const nowIso = Number.isFinite(now.getTime()) ? now.toISOString() : new Date().toISOString();
  const nowMs = Number.isFinite(now.getTime()) ? now.getTime() : Date.now();

  const existingIds = store.entriesByUser.get(input.userId) ?? [];
  const existingEntries = existingIds
    .map((entryId) => store.entries.get(entryId))
    .filter((entry): entry is ViewHistoryEntry => entry !== undefined);
  for (const entry of existingEntries) {
    const viewedMs = safeDateMs(entry.viewedAt);
    if (viewedMs === null) {
      continue;
    }

    if (nowMs - viewedMs > DEDUPE_WINDOW_MS) break;
    if (isDuplicateEntry(entry, input)) {
      entry.viewedAt = nowIso;
      if (input.source !== undefined) entry.source = input.source ?? null;
      if (typeof input.duration === "number") entry.duration = input.duration;
      store.entries.set(entry.id, entry);
      touchEntry(store, input.userId, entry.id);
      return entry;
    }
  }

  const entry: ViewHistoryEntry = {
    id: crypto.randomUUID(),
    userId: input.userId,
    resourceType: input.resourceType,
    resourceId: input.resourceType === "search" ? null : input.resourceId ?? null,
    searchQuery: input.searchQuery ?? null,
    source: input.source ?? null,
    viewedAt: nowIso,
    duration: typeof input.duration === "number" ? input.duration : null,
  };

  store.entries.set(entry.id, entry);
  touchEntry(store, input.userId, entry.id);

  return entry;
}

export function listHistory(input: {
  userId: string;
  resourceType?: HistoryResourceType | null;
  limit?: number;
}): ViewHistoryEntry[] {
  const store = getStore();
  pruneUserHistory(store, input.userId);

  const limit = input.limit ?? 20;
  const resourceTypeFilter = input.resourceType ?? null;
  const ids = store.entriesByUser.get(input.userId) ?? [];
  const items: ViewHistoryEntry[] = [];
  const existingEntries = ids
    .map((entryId) => store.entries.get(entryId))
    .filter((entry): entry is ViewHistoryEntry => entry !== undefined);

  for (const entry of existingEntries) {
    if (resourceTypeFilter !== null && entry.resourceType !== resourceTypeFilter) {
      continue;
    }
    items.push(entry);
    if (items.length >= limit) break;
  }

  return items;
}

export function clearHistory(userId: string): void {
  const store = getStore();
  const ids = store.entriesByUser.get(userId) ?? [];
  for (const entryId of ids) {
    store.entries.delete(entryId);
  }
  store.entriesByUser.delete(userId);
  lastPruneTime.delete(userId);
}
