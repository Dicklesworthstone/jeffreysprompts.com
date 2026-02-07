// Registry loader with stale-while-revalidate pattern

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";
import type { Bundle } from "@jeffreysprompts/core/prompts/bundles";
import type { Workflow } from "@jeffreysprompts/core/prompts/workflows";
import { prompts as bundledPrompts, bundles as bundledBundles, workflows as bundledWorkflows } from "@jeffreysprompts/core/prompts";
import { PromptSchema } from "@jeffreysprompts/core/prompts/schema";
import type { RegistryPayload } from "@jeffreysprompts/core/export";
import { loadConfig } from "./config";
import { readCachedPackPrompts, readOfflineLibrary, normalizePromptCategory } from "./offline";
import chalk from "chalk";
import { atomicWriteFileSync } from "./utils";

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

function writeJsonFile(path: string, value: unknown): void {
  const content = JSON.stringify(value, null, 2);
  atomicWriteFileSync(path, content);
}

function validatePromptArray(value: unknown): { prompts: Prompt[]; invalidCount: number; isArray: boolean } {
  if (!Array.isArray(value)) {
    return { prompts: [], invalidCount: 0, isArray: false };
  }

  const prompts: Prompt[] = [];
  let invalidCount = 0;
  for (const item of value) {
    const result = PromptSchema.safeParse(item);
    if (result.success) {
      prompts.push(result.data as Prompt);
    } else {
      invalidCount += 1;
    }
  }

  return { prompts, invalidCount, isArray: true };
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
  const cachedPromptValidation = validatePromptArray(cachedPayload?.prompts);
  const cachedPrompts = cachedPromptValidation.prompts;
  const cachedBundles = Array.isArray(cachedPayload?.bundles) ? cachedPayload.bundles : [];
  const cachedWorkflows = Array.isArray(cachedPayload?.workflows) ? cachedPayload.workflows : [];
  
  const localPrompts = config.localPrompts.enabled
    ? loadLocalPrompts(config.localPrompts.dir)
    : [];
  
  const offlinePrompts = loadOfflinePrompts();
  const packPrompts = readCachedPackPrompts();

  if (cachedPrompts?.length) {
    if (!isCacheFresh(cachedMeta, config.registry.cacheTtl) && config.registry.autoRefresh) {
      void refreshRegistry().catch(() => undefined);
    }
    // offline -> cached -> packs -> local
    const merged = mergePrompts(offlinePrompts, cachedPrompts);
    const withPacks = mergePrompts(merged, packPrompts);
    return {
      prompts: mergePrompts(withPacks, localPrompts),
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

  const remotePromptValidation = validatePromptArray(remote.payload?.prompts);
  const remotePrompts = remotePromptValidation.prompts;
  if (remote.payload && remote.meta && remotePromptValidation.isArray) {
    const sanitizedPayload: RegistryPayloadLike = {
      ...remote.payload,
      prompts: remotePrompts,
      bundles: Array.isArray(remote.payload.bundles) ? remote.payload.bundles : [],
      workflows: Array.isArray(remote.payload.workflows) ? remote.payload.workflows : [],
    };
    writeJsonFile(config.registry.cachePath, sanitizedPayload);
    writeJsonFile(config.registry.metaPath, remote.meta);
    
    const merged = mergePrompts(offlinePrompts, remotePrompts);
    const withPacks = mergePrompts(merged, packPrompts);
    return {
      prompts: mergePrompts(withPacks, localPrompts),
      bundles: sanitizedPayload.bundles || [],
      workflows: sanitizedPayload.workflows || [],
      meta: remote.meta,
      source: "remote",
    };
  }

  // offline -> bundled -> packs -> local
  const merged = mergePrompts(offlinePrompts, bundledPrompts);
  const withPacks = mergePrompts(merged, packPrompts);
  return {
    prompts: mergePrompts(withPacks, localPrompts),
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
  const cachedPromptValidation = validatePromptArray(cachedPayload?.prompts);
  const cachedPrompts = cachedPromptValidation.prompts;
  const cachedBundles = Array.isArray(cachedPayload?.bundles) ? cachedPayload.bundles : [];
  const cachedWorkflows = Array.isArray(cachedPayload?.workflows) ? cachedPayload.workflows : [];
  
  const localPrompts = config.localPrompts.enabled
    ? loadLocalPrompts(config.localPrompts.dir)
    : [];
  
  const offlinePrompts = loadOfflinePrompts();
  const packPrompts = readCachedPackPrompts();

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
    const withPacks = mergePrompts(merged, packPrompts);
    return {
      prompts: mergePrompts(withPacks, localPrompts),
      bundles: cachedBundles,
      workflows: cachedWorkflows,
      meta: refreshedMeta,
      source: "cache",
    };
  }

  const remotePromptValidation = validatePromptArray(remote.payload?.prompts);
  const remotePrompts = remotePromptValidation.prompts;
  if (remote.payload && remote.meta && remotePromptValidation.isArray) {
    const sanitizedPayload: RegistryPayloadLike = {
      ...remote.payload,
      prompts: remotePrompts,
      bundles: Array.isArray(remote.payload.bundles) ? remote.payload.bundles : [],
      workflows: Array.isArray(remote.payload.workflows) ? remote.payload.workflows : [],
    };
    writeJsonFile(config.registry.cachePath, sanitizedPayload);
    writeJsonFile(config.registry.metaPath, remote.meta);
    
    const merged = mergePrompts(offlinePrompts, remotePrompts);
    const withPacks = mergePrompts(merged, packPrompts);
    return {
      prompts: mergePrompts(withPacks, localPrompts),
      bundles: sanitizedPayload.bundles || [],
      workflows: sanitizedPayload.workflows || [],
      meta: remote.meta,
      source: "remote",
    };
  }

  if (cachedPrompts?.length) {
    const merged = mergePrompts(offlinePrompts, cachedPrompts);
    const withPacks = mergePrompts(merged, packPrompts);
    return {
      prompts: mergePrompts(withPacks, localPrompts),
      bundles: cachedBundles,
      workflows: cachedWorkflows,
      meta: cachedMeta,
      source: "cache",
    };
  }

  const merged = mergePrompts(offlinePrompts, bundledPrompts);
  const withPacks = mergePrompts(merged, packPrompts);
  return {
    prompts: mergePrompts(withPacks, localPrompts),
    bundles: bundledBundles,
    workflows: bundledWorkflows,
    meta: null,
    source: "bundled",
  };
}
