"use client";

import type { HistoryResourceType, ViewHistoryEntry } from "./types";

const LOCAL_USER_ID_KEY = "jfpUserId";
const LEGACY_RATING_USER_ID_KEY = "jfp-rating-user-id";
const HISTORY_STORAGE_KEY = "jfpHistoryV1";
const MAX_QUERY_LENGTH = 500;
const MAX_HISTORY_ITEMS = 1000;

export function getOrCreateLocalUserId(): string | null {
  if (typeof window === "undefined") return null;

  let userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
  if (!userId) {
    const legacyUserId = window.localStorage.getItem(LEGACY_RATING_USER_ID_KEY);
    if (legacyUserId) {
      window.localStorage.setItem(LOCAL_USER_ID_KEY, legacyUserId);
      return legacyUserId;
    }

    userId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `user-${crypto.randomUUID().slice(0, 8)}`;
    window.localStorage.setItem(LOCAL_USER_ID_KEY, userId);
    window.localStorage.setItem(LEGACY_RATING_USER_ID_KEY, userId);
  }

  if (userId && !window.localStorage.getItem(LEGACY_RATING_USER_ID_KEY)) {
    window.localStorage.setItem(LEGACY_RATING_USER_ID_KEY, userId);
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
  const items = getHistoryItems();

  // Check for existing entry anywhere in history
  const existingIndex = items.findIndex((entry) => isDuplicateEntry(entry, input));

  if (existingIndex !== -1) {
    // Found a duplicate - update its timestamp and move to top
    const existingEntry = items[existingIndex];
    existingEntry.viewedAt = now.toISOString();
    
    // Remove from old position and put at start
    const otherItems = items.filter((_, idx) => idx !== existingIndex);
    const updatedItems = [existingEntry, ...otherItems].slice(0, MAX_HISTORY_ITEMS);
    saveHistoryItems(updatedItems);
    window.dispatchEvent(new CustomEvent("jfp:history-update"));
    return;
  }

  const entryId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `entry-${crypto.randomUUID().slice(0, 9)}`;

  const newItem: ViewHistoryEntry = {
    id: entryId,
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
