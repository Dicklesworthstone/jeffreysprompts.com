/**
 * Offline Mode Utilities
 *
 * Provides network detection and cached data fallback for CLI commands.
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { Prompt, PromptCategory } from "@jeffreysprompts/core/prompts";
import { getConfigDir } from "./config";

export interface SyncedPrompt {
  id: string;
  title: string;
  content: string;
  description?: string;
  category?: string;
  tags?: string[];
  saved_at: string;
}

export interface SyncMeta {
  lastSync: string;
  promptCount: number;
  version: string;
}

const promptCategoryValues: PromptCategory[] = [
  "ideation",
  "documentation",
  "automation",
  "refactoring",
  "testing",
  "debugging",
  "workflow",
  "communication",
];

const promptCategorySet = new Set(promptCategoryValues);

export function normalizePromptCategory(category?: string): PromptCategory {
  if (!category) return "workflow";
  const normalized = category.toLowerCase();
  return promptCategorySet.has(normalized as PromptCategory)
    ? (normalized as PromptCategory)
    : "workflow";
}

/**
 * Get the path to the synced library directory
 */
export function getLibraryDir(): string {
  return join(getConfigDir(), "library");
}

/**
 * Get the path to the synced prompts file
 */
export function getLibraryPath(): string {
  return join(getLibraryDir(), "prompts.json");
}

/**
 * Get the path to the sync metadata file
 */
export function getMetaPath(): string {
  return join(getLibraryDir(), "sync.meta.json");
}

/**
 * Check if the synced library exists
 */
export function hasOfflineLibrary(): boolean {
  return existsSync(getLibraryPath());
}

/**
 * Read the sync metadata
 */
export function readSyncMeta(): SyncMeta | null {
  const metaPath = getMetaPath();
  if (!existsSync(metaPath)) return null;
  try {
    return JSON.parse(readFileSync(metaPath, "utf-8")) as SyncMeta;
  } catch {
    return null;
  }
}

/**
 * Read prompts from the synced library cache
 */
export function readOfflineLibrary(): SyncedPrompt[] {
  const libraryPath = getLibraryPath();
  if (!existsSync(libraryPath)) return [];
  try {
    return JSON.parse(readFileSync(libraryPath, "utf-8")) as SyncedPrompt[];
  } catch {
    return [];
  }
}

/**
 * Find a prompt by ID in the offline library cache
 */
export function getOfflinePromptById(id: string): SyncedPrompt | null {
  const prompts = readOfflineLibrary();
  return prompts.find((prompt) => prompt.id === id) ?? null;
}

/**
 * Get an offline prompt converted to the standard Prompt type
 */
export function getOfflinePromptAsPrompt(id: string): Prompt | null {
  const offline = getOfflinePromptById(id);
  if (!offline) return null;

  return {
    id: offline.id,
    title: offline.title,
    description: offline.description ?? "",
    content: offline.content,
    category: normalizePromptCategory(offline.category),
    tags: offline.tags ?? [],
    author: "", // Offline prompts don't store author yet, could be added later
    version: "1.0.0",
    created: offline.saved_at, // Mapping saved_at to created
    featured: false,
  };
}

/**
 * Format the age of the last sync for display
 */
export function formatSyncAge(isoDate: string | undefined | null): string {
  if (!isoDate) return "never";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "unknown";
  const ms = Date.now() - date.getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return `${Math.floor(ms / 60000)} min ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours ago`;
  return `${Math.floor(ms / 86400000)} days ago`;
}

/**
 * Check if we can reach the network by attempting a simple fetch.
 * Uses a short timeout to avoid blocking.
 *
 * @param url - URL to check (defaults to API base)
 * @param timeoutMs - Timeout in milliseconds (default 3000)
 * @returns true if online, false if offline or network error
 */
export async function isOnline(
  url = "https://jeffreysprompts.com/api/health",
  timeoutMs = 3000
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response.ok || response.status < 500;
    } catch {
      clearTimeout(timeout);
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Check if we're offline. Caches result briefly to avoid repeated checks.
 */
let offlineCheckCache: { result: boolean; timestamp: number } | null = null;
const OFFLINE_CHECK_TTL = 10000; // Cache for 10 seconds

export async function checkOffline(): Promise<boolean> {
  const now = Date.now();
  if (offlineCheckCache && now - offlineCheckCache.timestamp < OFFLINE_CHECK_TTL) {
    return offlineCheckCache.result;
  }

  const online = await isOnline();
  offlineCheckCache = { result: !online, timestamp: now };
  return !online;
}

/**
 * Search the offline library by query string
 */
export function searchOfflineLibrary(
  query: string,
  limit = 10
): { prompt: SyncedPrompt; score: number }[] {
  const prompts = readOfflineLibrary();
  if (!prompts.length) return [];

  const queryLower = query.toLowerCase();
  const scored = prompts
    .map((prompt) => {
      let score = 0;

      // Title match (highest weight)
      if (prompt.title.toLowerCase().includes(queryLower)) {
        score += 10;
        if (prompt.title.toLowerCase().startsWith(queryLower)) {
          score += 5;
        }
      }

      // ID match
      if (prompt.id.toLowerCase().includes(queryLower)) {
        score += 8;
      }

      // Description match
      if (prompt.description?.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      // Category match
      if (prompt.category?.toLowerCase().includes(queryLower)) {
        score += 3;
      }

      // Tag match
      if (prompt.tags?.some((tag) => tag.toLowerCase().includes(queryLower))) {
        score += 2;
      }

      // Content match (lowest weight)
      if (prompt.content.toLowerCase().includes(queryLower)) {
        score += 1;
      }

      return { prompt, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
