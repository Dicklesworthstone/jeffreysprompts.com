"use client";

import { isHistoryResourceType, type HistoryResourceType, type ViewHistoryEntry } from "./types";

const LOCAL_USER_ID_KEY = "jfpUserId";
const LEGACY_RATING_USER_ID_KEY = "jfp-rating-user-id";
const HISTORY_STORAGE_KEY = "jfpHistoryV1";
const HISTORY_API_PATH = "/api/history";
const MAX_QUERY_LENGTH = 500;
const MAX_HISTORY_ITEMS = 1000;
let fallbackIdCounter = 0;

function createFallbackId(prefix: string): string {
  fallbackIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}`;
}

function createLocalUserId(): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }
  if (globalCrypto && typeof globalCrypto.getRandomValues === "function") {
    return `user-${Array.from(globalCrypto.getRandomValues(new Uint8Array(4)), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("")}`;
  }
  return createFallbackId("user");
}

function createHistoryEntryId(): string {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return globalCrypto.randomUUID();
  }
  if (globalCrypto && typeof globalCrypto.getRandomValues === "function") {
    return `entry-${Array.from(globalCrypto.getRandomValues(new Uint8Array(5)), (b) =>
      b.toString(16).padStart(2, "0")
    ).join("")}`;
  }
  return createFallbackId("entry");
}

function normalizeHistoryEntry(value: unknown): ViewHistoryEntry | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<Record<keyof ViewHistoryEntry, unknown>>;
  if (typeof candidate.id !== "string" || !candidate.id) return null;
  if (typeof candidate.userId !== "string" || !candidate.userId) return null;
  if (
    typeof candidate.resourceType !== "string" ||
    !isHistoryResourceType(candidate.resourceType)
  ) {
    return null;
  }
  if (candidate.resourceId !== null && typeof candidate.resourceId !== "string") return null;
  if (candidate.searchQuery !== null && typeof candidate.searchQuery !== "string") return null;
  if (candidate.source !== null && typeof candidate.source !== "string") return null;
  if (typeof candidate.viewedAt !== "string" || !candidate.viewedAt) return null;
  if (candidate.duration !== null && typeof candidate.duration !== "number") return null;

  return {
    id: candidate.id,
    userId: candidate.userId,
    resourceType: candidate.resourceType,
    resourceId: candidate.resourceId ?? null,
    searchQuery: candidate.searchQuery ?? null,
    source: candidate.source ?? null,
    viewedAt: candidate.viewedAt,
    duration: candidate.duration ?? null,
  };
}

function normalizeHistoryEntries(value: unknown): ViewHistoryEntry[] {
  if (!Array.isArray(value)) return [];

  const items: ViewHistoryEntry[] = [];
  for (const entry of value) {
    const normalized = normalizeHistoryEntry(entry);
    if (normalized) {
      items.push(normalized);
    }
  }

  return items;
}

function getViewedAtMs(entry: ViewHistoryEntry): number {
  const viewedAtMs = new Date(entry.viewedAt).getTime();
  return Number.isFinite(viewedAtMs) ? viewedAtMs : 0;
}

function mergeHistoryEntries(
  localEntries: ViewHistoryEntry[],
  remoteEntries: ViewHistoryEntry[]
): ViewHistoryEntry[] {
  const merged: ViewHistoryEntry[] = [];
  const candidates = [...localEntries, ...remoteEntries].sort(
    (left, right) => getViewedAtMs(right) - getViewedAtMs(left)
  );

  for (const entry of candidates) {
    const alreadySeen = merged.some((existingEntry) =>
      isDuplicateEntry(existingEntry, {
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        searchQuery: entry.searchQuery,
      })
    );

    if (!alreadySeen) {
      merged.push(entry);
    }
  }

  return merged;
}

async function fetchRemoteHistory(options: {
  resourceType?: HistoryResourceType | null;
  limit?: number;
}): Promise<ViewHistoryEntry[]> {
  if (typeof window === "undefined" || typeof fetch !== "function") return [];

  const searchParams = new URLSearchParams();
  if (options.resourceType) {
    searchParams.set("resourceType", options.resourceType);
  }
  if (typeof options.limit === "number") {
    searchParams.set("limit", options.limit.toString());
  }

  const url = searchParams.size > 0 ? `${HISTORY_API_PATH}?${searchParams.toString()}` : HISTORY_API_PATH;

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as { items?: unknown };
    return normalizeHistoryEntries(payload.items);
  } catch {
    return [];
  }
}

async function syncRemoteHistoryMutation(
  method: "POST" | "DELETE",
  payload?: Record<string, string>
): Promise<void> {
  if (typeof window === "undefined" || typeof fetch !== "function") return;

  try {
    await fetch(HISTORY_API_PATH, {
      method,
      cache: "no-store",
      credentials: "same-origin",
      headers: payload
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
  } catch {
    // Local history is the durable source of truth for free-site browsing.
  }
}

function normalizeHistoryInput(input: {
  resourceType: HistoryResourceType;
  resourceId?: string | null;
  searchQuery?: string | null;
  source?: string | null;
}) {
  const resourceId = input.resourceId?.trim() || null;
  const searchQuery = input.searchQuery?.trim() || null;
  const source = input.source?.trim() || null;

  if (input.resourceType === "search" && !searchQuery) return null;
  if (input.resourceType !== "search" && !resourceId) return null;

  return {
    resourceType: input.resourceType,
    resourceId,
    searchQuery:
      searchQuery && searchQuery.length > MAX_QUERY_LENGTH
        ? searchQuery.slice(0, MAX_QUERY_LENGTH)
        : searchQuery,
    source,
  };
}

export function getOrCreateLocalUserId(): string | null {
  if (typeof window === "undefined") return null;

  let userId = window.localStorage.getItem(LOCAL_USER_ID_KEY);
  if (!userId) {
    const legacyUserId = window.localStorage.getItem(LEGACY_RATING_USER_ID_KEY);
    if (legacyUserId) {
      window.localStorage.setItem(LOCAL_USER_ID_KEY, legacyUserId);
      return legacyUserId;
    }

    userId = createLocalUserId();
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
    return normalizeHistoryEntries(JSON.parse(raw));
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
  const normalizedInput = normalizeHistoryInput(input);
  if (!normalizedInput) return;

  const userId = getOrCreateLocalUserId();
  if (!userId) return;

  const now = new Date();
  const items = getHistoryItems();

  // Check for existing entry anywhere in history
  const existingIndex = items.findIndex((entry) => isDuplicateEntry(entry, normalizedInput));

  if (existingIndex !== -1) {
    // Found a duplicate - update its timestamp and move to top
    const existingEntry = items[existingIndex];
    existingEntry.viewedAt = now.toISOString();
    existingEntry.source = normalizedInput.source;
    
    // Remove from old position and put at start
    const otherItems = items.filter((_, idx) => idx !== existingIndex);
    const updatedItems = [existingEntry, ...otherItems].slice(0, MAX_HISTORY_ITEMS);
    saveHistoryItems(updatedItems);
    window.dispatchEvent(new CustomEvent("jfp:history-update"));
    const payload: Record<string, string> = {
      resourceType: normalizedInput.resourceType,
    };
    if (normalizedInput.resourceId) payload.resourceId = normalizedInput.resourceId;
    if (normalizedInput.searchQuery) payload.searchQuery = normalizedInput.searchQuery;
    if (normalizedInput.source) payload.source = normalizedInput.source;
    await syncRemoteHistoryMutation("POST", payload);
    return;
  }

  const newItem: ViewHistoryEntry = {
    id: createHistoryEntryId(),
    userId,
    resourceType: normalizedInput.resourceType,
    resourceId: normalizedInput.resourceId,
    searchQuery: normalizedInput.searchQuery,
    source: normalizedInput.source,
    viewedAt: now.toISOString(),
    duration: null,
  };

  // Add new item and limit size
  const newItems = [newItem, ...items].slice(0, MAX_HISTORY_ITEMS);
  saveHistoryItems(newItems);
  window.dispatchEvent(new CustomEvent("jfp:history-update"));

  const payload: Record<string, string> = {
    resourceType: normalizedInput.resourceType,
  };
  if (normalizedInput.resourceId) payload.resourceId = normalizedInput.resourceId;
  if (normalizedInput.searchQuery) payload.searchQuery = normalizedInput.searchQuery;
  if (normalizedInput.source) payload.source = normalizedInput.source;
  await syncRemoteHistoryMutation("POST", payload);
}

export async function listHistory(
  userId: string, // Kept for signature compatibility, though we ignore it since localStorage is local
  options: {
    resourceType?: HistoryResourceType | null;
    limit?: number;
  } = {}
): Promise<ViewHistoryEntry[]> {
  const limit = options.limit ?? 20;
  const localItems = getHistoryItems();

  const filteredLocalItems = localItems.filter((entry) => {
    if (options.resourceType && entry.resourceType !== options.resourceType) return false;
    return true;
  });

  const remoteItems = await fetchRemoteHistory(options);
  return mergeHistoryEntries(filteredLocalItems, remoteItems).slice(0, limit);
}

export async function clearHistoryForUser(): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("jfp:history-update"));
  await syncRemoteHistoryMutation("DELETE");
}
