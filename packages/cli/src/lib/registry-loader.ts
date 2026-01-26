// Registry loader with stale-while-revalidate pattern

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, renameSync, unlinkSync } from "fs";
import { randomBytes } from "crypto";
import { dirname, join } from "path";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";
import type { Bundle } from "@jeffreysprompts/core/prompts/bundles";
import type { Workflow } from "@jeffreysprompts/core/prompts/workflows";
import { prompts as bundledPrompts, bundles as bundledBundles, workflows as bundledWorkflows } from "@jeffreysprompts/core/prompts";
import { PromptSchema } from "@jeffreysprompts/core/prompts/schema";
import type { RegistryPayload } from "@jeffreysprompts/core/export";
import { loadConfig } from "./config";
import { readOfflineLibrary, normalizePromptCategory } from "./offline";
import chalk from "chalk";

export interface RegistryMeta {
  version: string;
  etag: string | null;
  fetchedAt: string;
  promptCount: number;
}

export interface LoadedRegistry {
  prompts: Prompt[];
  bundles: Bundle[];
  workflows: Workflow[];
  meta: RegistryMeta | null;
  source: "cache" | "remote" | "bundled";
}

interface RegistryPayloadLike {
  prompts: Prompt[];
  bundles?: Bundle[];
  workflows?: Workflow[];
  version?: string;
}

function readJsonFile<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write JSON to file atomically using temp file + rename pattern.
 * Prevents corruption if process crashes mid-write.
 */
function writeJsonFile(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const suffix = randomBytes(8).toString("hex");
  const tempPath = `${path}.${suffix}.tmp`;
  const content = JSON.stringify(value, null, 2);

  try {
    writeFileSync(tempPath, content);
    renameSync(tempPath, path);
  } catch (err) {
    // Clean up temp file on failure
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}

function getPromptArray(value: unknown): Prompt[] | null {
  return Array.isArray(value) ? (value as Prompt[]) : null;
}

function mergePrompts(base: Prompt[], extras: Prompt[]): Prompt[] {
  if (!extras.length) return base;
  const merged = base.slice();
  const indexById = new Map(merged.map((prompt, index) => [prompt.id, index]));
  for (const prompt of extras) {
    const index = indexById.get(prompt.id);
    if (index === undefined) {
      indexById.set(prompt.id, merged.length);
      merged.push(prompt);
    } else {
      merged[index] = prompt;
    }
  }
  return merged;
}

function isCacheFresh(meta: RegistryMeta | null, cacheTtlSeconds: number): boolean {
  if (!meta?.fetchedAt) return false;
  const fetchedAt = new Date(meta.fetchedAt).getTime();
  if (!Number.isFinite(fetchedAt)) return false;
  return Date.now() - fetchedAt < cacheTtlSeconds * 1000;
}

function loadLocalPrompts(dir: string): Prompt[] {
  if (!existsSync(dir)) return [];
  const prompts: Prompt[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const path = join(dir, entry.name);
    const parsed = readJsonFile<unknown>(path);
    if (!parsed) continue;

    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      const result = PromptSchema.safeParse(item);
      if (result.success) {
        prompts.push(result.data as Prompt);
      } else {
        // Warn about invalid local prompts but don't crash
        // Only warn if it looks somewhat like a prompt (has id/title) to avoid noise
        if (item && typeof item === "object" && "id" in item) {
          console.warn(
            chalk.yellow(`Warning: Invalid local prompt in ${entry.name}:`),
            result.error.issues[0]?.message
          );
        }
      }
    }
  }
  return prompts;
}

function loadOfflinePrompts(): Prompt[] {
  const offline = readOfflineLibrary();
  return offline.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    content: p.content,
    category: normalizePromptCategory(p.category),
    tags: p.tags ?? [],
    author: "", 
    version: "1.0.0",
    created: p.saved_at,
    featured: false,
  }));
}

async function fetchRegistry(
  url: string,
  timeoutMs: number,
  etag?: string | null
): Promise<{ payload: RegistryPayload | null; meta: RegistryMeta | null; notModified: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: etag ? { "If-None-Match": etag } : undefined,
      signal: controller.signal,
    });

    if (res.status === 304) {
      return { payload: null, meta: null, notModified: true };
    }

    if (!res.ok) {
      return { payload: null, meta: null, notModified: false };
    }

    const payload = (await res.json()) as RegistryPayload;
    const promptCount = Array.isArray(payload.prompts) ? payload.prompts.length : 0;
    const meta: RegistryMeta = {
      version: payload.version ?? "unknown",
      etag: res.headers.get("etag"),
      fetchedAt: new Date().toISOString(),
      promptCount,
    };

    return { payload, meta, notModified: false };
  } catch {
    return { payload: null, meta: null, notModified: false };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Load registry with SWR pattern:
 * 1. Return cached data immediately if available
 * 2. Fetch fresh data in background
 * 3. Fall back to bundled data if no cache and fetch fails
 */
export async function loadRegistry(): Promise<LoadedRegistry> {
  const config = loadConfig();
  const cachedPayload = readJsonFile<RegistryPayloadLike>(config.registry.cachePath);
  const cachedMeta = readJsonFile<RegistryMeta>(config.registry.metaPath);
  const cachedPrompts = getPromptArray(cachedPayload?.prompts);
  const cachedBundles = Array.isArray(cachedPayload?.bundles) ? cachedPayload.bundles : [];
  const cachedWorkflows = Array.isArray(cachedPayload?.workflows) ? cachedPayload.workflows : [];
  
  const localPrompts = config.localPrompts.enabled
    ? loadLocalPrompts(config.localPrompts.dir)
    : [];
  
  const offlinePrompts = loadOfflinePrompts();

  if (cachedPrompts?.length) {
    if (!isCacheFresh(cachedMeta, config.registry.cacheTtl) && config.registry.autoRefresh) {
      void refreshRegistry().catch(() => undefined);
    }
    // offline -> cached -> local
    const merged = mergePrompts(offlinePrompts, cachedPrompts);
    return {
      prompts: mergePrompts(merged, localPrompts),
      bundles: cachedBundles,
      workflows: cachedWorkflows,
      meta: cachedMeta,
      source: "cache",
    };
  }

  const remote = await fetchRegistry(
    config.registry.remote,
    config.registry.timeoutMs,
    cachedMeta?.etag ?? null
  );

  const remotePrompts = getPromptArray(remote.payload?.prompts);
  if (remote.payload && remote.meta && remotePrompts) {
    writeJsonFile(config.registry.cachePath, remote.payload);
    writeJsonFile(config.registry.metaPath, remote.meta);
    
    const merged = mergePrompts(offlinePrompts, remotePrompts);
    return {
      prompts: mergePrompts(merged, localPrompts),
      bundles: remote.payload.bundles || [],
      workflows: remote.payload.workflows || [],
      meta: remote.meta,
      source: "remote",
    };
  }

  // offline -> bundled -> local
  const merged = mergePrompts(offlinePrompts, bundledPrompts);
  return {
    prompts: mergePrompts(merged, localPrompts),
    bundles: bundledBundles,
    workflows: bundledWorkflows,
    meta: null,
    source: "bundled",
  };
}

/**
 * Force refresh registry from remote
 */
export async function refreshRegistry(): Promise<LoadedRegistry> {
  const config = loadConfig();
  const cachedPayload = readJsonFile<RegistryPayloadLike>(config.registry.cachePath);
  const cachedMeta = readJsonFile<RegistryMeta>(config.registry.metaPath);
  const cachedPrompts = getPromptArray(cachedPayload?.prompts);
  const cachedBundles = Array.isArray(cachedPayload?.bundles) ? cachedPayload.bundles : [];
  const cachedWorkflows = Array.isArray(cachedPayload?.workflows) ? cachedPayload.workflows : [];
  
  const localPrompts = config.localPrompts.enabled
    ? loadLocalPrompts(config.localPrompts.dir)
    : [];
  
  const offlinePrompts = loadOfflinePrompts();

  const remote = await fetchRegistry(
    config.registry.remote,
    config.registry.timeoutMs,
    cachedMeta?.etag ?? null
  );

  if (remote.notModified && cachedPrompts?.length) {
    const refreshedMeta: RegistryMeta | null = cachedMeta
      ? { ...cachedMeta, fetchedAt: new Date().toISOString() }
      : null;
    if (refreshedMeta) {
      writeJsonFile(config.registry.metaPath, refreshedMeta);
    }
    
    const merged = mergePrompts(offlinePrompts, cachedPrompts);
    return {
      prompts: mergePrompts(merged, localPrompts),
      bundles: cachedBundles,
      workflows: cachedWorkflows,
      meta: refreshedMeta,
      source: "cache",
    };
  }

  const remotePrompts = getPromptArray(remote.payload?.prompts);
  if (remote.payload && remote.meta && remotePrompts) {
    writeJsonFile(config.registry.cachePath, remote.payload);
    writeJsonFile(config.registry.metaPath, remote.meta);
    
    const merged = mergePrompts(offlinePrompts, remotePrompts);
    return {
      prompts: mergePrompts(merged, localPrompts),
      bundles: remote.payload.bundles || [],
      workflows: remote.payload.workflows || [],
      meta: remote.meta,
      source: "remote",
    };
  }

  if (cachedPrompts?.length) {
    const merged = mergePrompts(offlinePrompts, cachedPrompts);
    return {
      prompts: mergePrompts(merged, localPrompts),
      bundles: cachedBundles,
      workflows: cachedWorkflows,
      meta: cachedMeta,
      source: "cache",
    };
  }

  const merged = mergePrompts(offlinePrompts, bundledPrompts);
  return {
    prompts: mergePrompts(merged, localPrompts),
    bundles: bundledBundles,
    workflows: bundledWorkflows,
    meta: null,
    source: "bundled",
  };
}
