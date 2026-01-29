"use client";

import type { HistoryResourceType, ViewHistoryEntry } from "./types";

const LOCAL_USER_ID_KEY = "jfpUserId";
const HISTORY_STORAGE_KEY = "jfpHistoryV1";
const MAX_QUERY_LENGTH = 500;
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const MAX_HISTORY_ITEMS = 1000;

export function getOrCreateLocalUserId(): string | null {
  if (typeof window === "undefined") return null;

  let userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
  if (!userId) {
    userId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `user-${Math.random().toString(36).slice(2, 9)}`;
    window.localStorage.setItem(LOCAL_USER_ID_KEY, userId);
  }

  return userId;
}

function getHistoryItems(): ViewHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ViewHistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistoryItems(items: ViewHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors (quota exceeded, etc)
  }
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

export async function trackHistoryView(input: {
  resourceType: HistoryResourceType;
  resourceId?: string | null;
  searchQuery?: string | null;
  source?: string | null;
}): Promise<void> {
  const userId = getOrCreateLocalUserId();
  if (!userId) return;

  const now = new Date();
  const nowMs = now.getTime();
  const items = getHistoryItems();

  // Check for duplicate in window
  for (const entry of items) {
    const viewedMs = new Date(entry.viewedAt).getTime();
    if (nowMs - viewedMs > DEDUPE_WINDOW_MS) break; // Items are sorted desc, so we can stop
    if (isDuplicateEntry(entry, input)) {
      // Just update the timestamp
      entry.viewedAt = now.toISOString();
      // Move to top
      const others = items.filter((i) => i.id !== entry.id);
      saveHistoryItems([entry, ...others]);
      return;
    }
  }

  const newItem: ViewHistoryEntry = {
    id: crypto.randomUUID(),
    userId,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    searchQuery:
      input.searchQuery && input.searchQuery.length > MAX_QUERY_LENGTH
        ? input.searchQuery.slice(0, MAX_QUERY_LENGTH)
        : input.searchQuery ?? null,
    source: input.source ?? null,
    viewedAt: now.toISOString(),
    duration: null,
  };

  // Add new item and limit size
  const newItems = [newItem, ...items].slice(0, MAX_HISTORY_ITEMS);
  saveHistoryItems(newItems);
  window.dispatchEvent(new CustomEvent("jfp:history-update"));
}

export async function listHistory(
  userId: string, // Kept for signature compatibility, though we ignore it since localStorage is local
  options: {
    resourceType?: HistoryResourceType | null;
    limit?: number;
  } = {}
): Promise<ViewHistoryEntry[]> {
  const items = getHistoryItems();
  const limit = options.limit ?? 20;

  const filtered = items.filter((entry) => {
    if (options.resourceType && entry.resourceType !== options.resourceType) return false;
    return true;
  });

  return filtered.slice(0, limit);
}

export async function clearHistoryForUser(): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("jfp:history-update"));
}