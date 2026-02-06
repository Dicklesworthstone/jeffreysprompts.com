/**
 * Offline Mode Utilities
 *
 * Provides network detection and cached data fallback for CLI commands.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";
import type { Prompt, PromptCategory } from "@jeffreysprompts/core/prompts";
import { getConfigDir } from "./config";
import { atomicWriteFileSync, resolveSafeChildPath } from "./utils";

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
 * Get the path to the sync lock file
 */
export function getLockPath(): string {
  return join(getLibraryDir(), ".sync.lock");
}

/**
 * Lock file timeout in milliseconds (stale locks older than this are ignored)
 */
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Acquire a lock for sync operations.
 * Returns true if lock acquired, false if another sync is in progress.
 *
 * Uses a simple file-based lock with timestamp to handle stale locks
 * from crashed processes.
 */
export function acquireSyncLock(): boolean {
  const lockPath = getLockPath();
  const lockDir = dirname(lockPath);

  // Ensure directory exists
  mkdirSync(lockDir, { recursive: true });

  // Check for existing lock
  if (existsSync(lockPath)) {
    try {
      const lockContent = readFileSync(lockPath, "utf-8");
      const lockTime = Number.parseInt(lockContent, 10);

      // If lock is valid (not stale), another process holds it
      if (Number.isFinite(lockTime) && Date.now() - lockTime < LOCK_TIMEOUT_MS) {
        return false; // Lock is held by another process
      }
      // Lock is stale - overwrite it with our timestamp
      writeFileSync(lockPath, String(Date.now()));
      return true;
    } catch {
      // Can't read lock file, try to acquire it below
    }
  }

  // No existing lock (or couldn't read it) - try to create exclusively
  try {
    writeFileSync(lockPath, String(Date.now()), { flag: "wx" });
    return true;
  } catch (err) {
    // If file already exists (race condition), check if it's stale
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      // Another process beat us to it - try to check if their lock is stale
      try {
        const lockContent = readFileSync(lockPath, "utf-8");
        const lockTime = Number.parseInt(lockContent, 10);
        if (Number.isFinite(lockTime) && Date.now() - lockTime >= LOCK_TIMEOUT_MS) {
          // Stale lock, overwrite it
          writeFileSync(lockPath, String(Date.now()));
          return true;
        }
      } catch {
        // Can't read/write, give up
      }
      return false;
    }
    // Some other error (permissions, etc), proceed without lock
    return true;
  }
}

/**
 * Release the sync lock.
 */
export function releaseSyncLock(): void {
  const lockPath = getLockPath();
  try {
    if (existsSync(lockPath)) {
      unlinkSync(lockPath);
    }
  } catch {
    // Ignore errors during cleanup
  }
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
  if (ms < 3600000) {
    const mins = Math.floor(ms / 60000);
    return `${mins} min ago`;
  }
  if (ms < 86400000) {
    const hours = Math.floor(ms / 3600000);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  const days = Math.floor(ms / 86400000);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
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

// -----------------------------------------------------------------------------
// Premium Packs Cache (bd-kfuj)
// -----------------------------------------------------------------------------

const SAFE_PACK_ID = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function isSafePackId(id: string): boolean {
  return SAFE_PACK_ID.test(id);
}

const sha256Hex = (content: string): string => {
  return createHash("sha256").update(content).digest("hex");
};

const readJsonFile = <T>(path: string): T | null => {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
};

export interface CachedPackHistoryEntry {
  version: string;
  hash: string;
  cachedAt: string;
}

export interface CachedPackManifestEntry {
  id: string;
  title: string;
  version: string;
  promptCount: number;
  installed: boolean;
  cachedAt: string;
  hash: string;
  installedAt?: string | null;
  publishedAt?: string | null;
  history?: CachedPackHistoryEntry[];
}

export interface PacksCacheManifest {
  schemaVersion: 1;
  generatedAt: string;
  entries: CachedPackManifestEntry[];
}

export function getPacksDir(): string {
  return join(getLibraryDir(), "packs");
}

export function getPacksManifestPath(): string {
  return join(getPacksDir(), "manifest.json");
}

export function getPackCachePath(packId: string): string {
  if (!isSafePackId(packId)) {
    throw new Error(`Unsafe pack id: ${packId}`);
  }
  return resolveSafeChildPath(getPacksDir(), `${packId}.json`);
}

export function doesPackCachePayloadExist(packId: string): boolean {
  try {
    const path = getPackCachePath(packId);
    return existsSync(path);
  } catch {
    return false;
  }
}

export function isPackCacheHealthy(packId: string, expectedHash: string): boolean {
  if (!expectedHash) return false;
  try {
    const path = getPackCachePath(packId);
    if (!existsSync(path)) return false;
    const raw = readFileSync(path, "utf-8");
    return sha256Hex(raw) === expectedHash;
  } catch {
    return false;
  }
}

export function readPacksManifest(): PacksCacheManifest | null {
  const path = getPacksManifestPath();
  const parsed = readJsonFile<unknown>(path);
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (obj.schemaVersion !== 1) return null;
  if (typeof obj.generatedAt !== "string") return null;
  if (!Array.isArray(obj.entries)) return null;

  // Validate only the fields we rely on (stay permissive to allow forward schema changes).
  const entries: CachedPackManifestEntry[] = [];
  for (const entry of obj.entries) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string") continue;
    if (typeof e.title !== "string") continue;
    if (typeof e.version !== "string") continue;
    if (typeof e.promptCount !== "number") continue;
    if (typeof e.installed !== "boolean") continue;
    if (typeof e.cachedAt !== "string") continue;
    if (typeof e.hash !== "string") continue;

    const installedAt =
      e.installedAt === undefined || e.installedAt === null
        ? null
        : typeof e.installedAt === "string"
          ? e.installedAt
          : null;
    const publishedAt =
      e.publishedAt === undefined || e.publishedAt === null
        ? null
        : typeof e.publishedAt === "string"
          ? e.publishedAt
          : null;

    const history: CachedPackHistoryEntry[] | undefined = Array.isArray(e.history)
      ? e.history
          .map((h) => {
            if (!h || typeof h !== "object") return null;
            const hh = h as Record<string, unknown>;
            if (typeof hh.version !== "string") return null;
            if (typeof hh.hash !== "string") return null;
            if (typeof hh.cachedAt !== "string") return null;
            return { version: hh.version, hash: hh.hash, cachedAt: hh.cachedAt };
          })
          .filter(Boolean) as CachedPackHistoryEntry[]
      : undefined;

    entries.push({
      id: e.id,
      title: e.title,
      version: e.version,
      promptCount: e.promptCount,
      installed: e.installed,
      cachedAt: e.cachedAt,
      hash: e.hash,
      installedAt,
      publishedAt,
      ...(history && history.length > 0 ? { history } : {}),
    });
  }

  return {
    schemaVersion: 1,
    generatedAt: obj.generatedAt,
    entries,
  };
}

const writePacksManifest = (manifest: PacksCacheManifest): void => {
  const now = new Date().toISOString();
  const payload: PacksCacheManifest = {
    ...manifest,
    schemaVersion: 1,
    generatedAt: now,
    entries: manifest.entries,
  };
  atomicWriteFileSync(getPacksManifestPath(), JSON.stringify(payload, null, 2));
};

const createEmptyPacksManifest = (): PacksCacheManifest => ({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  entries: [],
});

export type CacheWriteResult = { ok: true } | { ok: false; error: string };

/**
 * Cache an installed pack payload for offline use.
 *
 * We store the full JSON payload as returned by the API, plus a small manifest
 * entry with a SHA-256 hash of the on-disk JSON (integrity check).
 */
export function cachePremiumPack(pack: {
  id: string;
  title: string;
  version?: string | null;
  promptCount?: number | null;
  installedAt?: string | null;
  publishedAt?: string | null;
  prompts?: unknown;
}): CacheWriteResult {
  if (!isSafePackId(pack.id)) {
    return { ok: false, error: `Unsafe pack id: ${pack.id}` };
  }

  const now = new Date().toISOString();
  const content = JSON.stringify(pack, null, 2);
  const hash = sha256Hex(content);

  try {
    atomicWriteFileSync(getPackCachePath(pack.id), content);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to write pack cache" };
  }

  const manifest = readPacksManifest() ?? createEmptyPacksManifest();
  const existingIndex = manifest.entries.findIndex((e) => e.id === pack.id);
  const existing = existingIndex >= 0 ? manifest.entries[existingIndex] : null;

  const version = pack.version ?? existing?.version ?? "unknown";
  const promptCount =
    typeof pack.promptCount === "number"
      ? pack.promptCount
      : Array.isArray(pack.prompts)
        ? pack.prompts.length
        : existing?.promptCount ?? 0;

  let history = existing?.history ? [...existing.history] : [];
  if (existing && (existing.version !== version || existing.hash !== hash)) {
    const last = history.length > 0 ? history[history.length - 1] : null;
    // Avoid duplicating the exact same prior entry.
    if (!last || last.version !== existing.version || last.hash !== existing.hash) {
      history.push({ version: existing.version, hash: existing.hash, cachedAt: existing.cachedAt });
    }
    // Keep history bounded to avoid unbounded growth.
    if (history.length > 10) {
      history = history.slice(history.length - 10);
    }
  }

  const entry: CachedPackManifestEntry = {
    id: pack.id,
    title: pack.title,
    version,
    promptCount,
    installed: true,
    cachedAt: now,
    hash,
    installedAt: pack.installedAt ?? existing?.installedAt ?? null,
    publishedAt: pack.publishedAt ?? existing?.publishedAt ?? null,
    ...(history.length > 0 ? { history } : {}),
  };

  const entries = manifest.entries.slice();
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }

  try {
    writePacksManifest({ ...manifest, entries });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to write packs manifest" };
  }

  return { ok: true };
}

/**
 * Remove cached pack content (used on uninstall).
 * Keeps a small manifest tombstone (installed=false) so we can still show last known version.
 */
export function uncachePremiumPack(packId: string): CacheWriteResult {
  if (!isSafePackId(packId)) {
    return { ok: false, error: `Unsafe pack id: ${packId}` };
  }

  const manifest = readPacksManifest();
  if (!manifest) {
    // Nothing to do.
    return { ok: true };
  }

  const entries = manifest.entries.slice();
  const index = entries.findIndex((e) => e.id === packId);
  if (index >= 0) {
    entries[index] = { ...entries[index], installed: false, cachedAt: new Date().toISOString() };
  }

  // Best-effort file removal (if present).
  try {
    const path = getPackCachePath(packId);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  } catch {
    // Ignore deletion failures (permissions, races). User can still uninstall server-side.
  }

  try {
    writePacksManifest({ ...manifest, entries });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update packs manifest" };
  }

  return { ok: true };
}

export function getCachedPackEntry(packId: string): CachedPackManifestEntry | null {
  const manifest = readPacksManifest();
  if (!manifest) return null;
  return manifest.entries.find((e) => e.id === packId) ?? null;
}

/**
 * Load all cached prompts from installed packs (best-effort, integrity-checked).
 */
export function readCachedPackPrompts(): Prompt[] {
  const manifest = readPacksManifest();
  const entries = manifest?.entries ?? [];
  if (entries.length === 0) return [];

  const prompts: Prompt[] = [];
  for (const entry of entries) {
    if (!entry.installed) continue;
    let raw: string;
    try {
      const path = getPackCachePath(entry.id);
      if (!existsSync(path)) continue;
      raw = readFileSync(path, "utf-8");
    } catch {
      continue;
    }

    if (sha256Hex(raw) !== entry.hash) {
      // Corrupted or manually edited cache; ignore silently.
      continue;
    }

    const parsed = (() => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    })();
    if (!parsed || typeof parsed !== "object") continue;
    const obj = parsed as Record<string, unknown>;
    const packVersion = typeof obj.version === "string" ? obj.version : entry.version;
    const packCreated =
      (typeof obj.publishedAt === "string" && obj.publishedAt) ||
      (typeof obj.installedAt === "string" && obj.installedAt) ||
      entry.cachedAt;

    const packPrompts = Array.isArray(obj.prompts) ? obj.prompts : [];
    for (const item of packPrompts) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;
      const id = typeof p.id === "string" ? p.id : "";
      const title = typeof p.title === "string" ? p.title : "";
      const content = typeof p.content === "string" ? p.content : "";
      if (!id || !title || !content) continue;

      const description = typeof p.description === "string" ? p.description : "";
      const category =
        typeof p.category === "string" ? normalizePromptCategory(p.category) : "workflow";
      const tags = Array.isArray(p.tags)
        ? p.tags.map((t) => (typeof t === "string" ? t : "")).filter(Boolean)
        : [];
      const author = typeof p.author === "string" ? p.author : "";
      const version = typeof p.version === "string" ? p.version : packVersion ?? "1.0.0";
      const created = typeof p.created === "string" ? p.created : packCreated;

      prompts.push({
        id,
        title,
        description,
        content,
        category,
        tags,
        author,
        version,
        created,
        featured: false,
      });
    }
  }

  return prompts;
}
