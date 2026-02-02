import { existsSync, readFileSync, renameSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

export interface TagMapping {
  alias: string;
  canonical: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

interface TagMappingStore {
  items: Map<string, TagMapping>;
  order: string[];
  persistedPath?: string | null;
  lastPersistError?: string | null;
}

const STORE_KEY = "__jfp_tag_mapping_store__";
const ENV_PERSIST_PATH_KEYS = ["JFP_TAG_MAPPINGS_PATH", "JFP_TAG_MAPPINGS_FILE"] as const;

interface PersistedTagMappings {
  version: 1;
  order: string[];
  items: TagMapping[];
}

function getStore(): TagMappingStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: TagMappingStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      items: new Map(),
      order: [],
      persistedPath: null,
      lastPersistError: null,
    };
    hydrateStore(globalStore[STORE_KEY]);
  }

  return globalStore[STORE_KEY];
}

function getPersistencePath(): string | null {
  for (const key of ENV_PERSIST_PATH_KEYS) {
    const raw = process.env[key];
    if (raw && raw.trim()) {
      return resolve(raw.trim());
    }
  }
  return null;
}

function normalizeTagValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function touch(store: TagMappingStore, alias: string) {
  store.order = [alias, ...store.order.filter((id) => id !== alias)];
}

function coerceMapping(value: unknown, fallbackUpdatedBy = "admin"): TagMapping | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<TagMapping>;
  const alias = typeof record.alias === "string" ? normalizeTagValue(record.alias) : "";
  const canonical = typeof record.canonical === "string" ? normalizeTagValue(record.canonical) : "";
  if (!alias || !canonical || alias === canonical) return null;
  if (alias.length > 80 || canonical.length > 80) return null;
  const now = new Date().toISOString();
  return {
    alias,
    canonical,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
    updatedBy: typeof record.updatedBy === "string" ? record.updatedBy : fallbackUpdatedBy,
  };
}

function normalizeOrder(order: string[], items: Map<string, TagMapping>): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const alias of order) {
    const normalized = normalizeTagValue(alias);
    if (!normalized || seen.has(normalized)) continue;
    if (!items.has(normalized)) continue;
    seen.add(normalized);
    next.push(normalized);
  }
  for (const alias of items.keys()) {
    if (!seen.has(alias)) {
      seen.add(alias);
      next.push(alias);
    }
  }
  return next;
}

function hydrateStore(store: TagMappingStore): void {
  const path = getPersistencePath();
  store.persistedPath = path;
  store.lastPersistError = null;
  if (!path || !existsSync(path)) return;
  try {
    const raw = readFileSync(path, "utf-8").trim();
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<PersistedTagMappings> | TagMapping[];
    const itemsInput = Array.isArray(parsed) ? parsed : parsed.items ?? [];
    if (!Array.isArray(itemsInput)) return;
    for (const entry of itemsInput) {
      const mapping = coerceMapping(entry);
      if (!mapping) continue;
      store.items.set(mapping.alias, mapping);
    }
    const orderInput = Array.isArray(parsed) ? itemsInput.map((item) => item?.alias ?? "") : parsed.order ?? [];
    if (Array.isArray(orderInput)) {
      store.order = normalizeOrder(orderInput, store.items);
    }
  } catch (error) {
    store.lastPersistError = error instanceof Error ? error.message : "persist_load_failed";
    console.warn("[TagMappings] Failed to load persisted tag mappings", error);
  }
}

function persistStore(store: TagMappingStore): void {
  const path = getPersistencePath();
  store.persistedPath = path;
  store.lastPersistError = null;
  if (!path) return;
  try {
    const dir = dirname(path);
    mkdirSync(dir, { recursive: true });
    const items = store.order
      .map((alias) => store.items.get(alias))
      .filter((mapping): mapping is TagMapping => Boolean(mapping));
    const payload: PersistedTagMappings = {
      version: 1,
      order: store.order,
      items,
    };
    const tmpPath = `${path}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(payload, null, 2), "utf-8");
    renameSync(tmpPath, path);
  } catch (error) {
    store.lastPersistError = error instanceof Error ? error.message : "persist_write_failed";
    console.warn("[TagMappings] Failed to persist tag mappings", error);
  }
}

export function listTagMappings(): TagMapping[] {
  const store = getStore();
  return store.order
    .map((alias) => store.items.get(alias))
    .filter((mapping): mapping is TagMapping => Boolean(mapping));
}

export function getTagMappingsRecord(): Record<string, string> {
  const store = getStore();
  const record: Record<string, string> = {};
  for (const [alias, mapping] of store.items.entries()) {
    record[alias] = mapping.canonical;
  }
  return record;
}

export function upsertTagMapping(input: {
  alias: string;
  canonical: string;
  updatedBy: string;
}): TagMapping {
  const alias = normalizeTagValue(input.alias);
  const canonical = normalizeTagValue(input.canonical);
  const updatedBy = input.updatedBy.trim() || "admin";

  if (!alias || !canonical) {
    throw new Error("alias_and_canonical_required");
  }
  if (alias === canonical) {
    throw new Error("alias_matches_canonical");
  }
  if (alias.length > 80 || canonical.length > 80) {
    throw new Error("tag_value_too_long");
  }

  const store = getStore();
  const now = new Date().toISOString();
  const existing = store.items.get(alias);
  const mapping: TagMapping = existing
    ? {
        ...existing,
        canonical,
        updatedAt: now,
        updatedBy,
      }
    : {
        alias,
        canonical,
        createdAt: now,
        updatedAt: now,
        updatedBy,
      };

  store.items.set(alias, mapping);
  touch(store, alias);
  persistStore(store);
  return mapping;
}

export function removeTagMapping(aliasInput: string): boolean {
  const alias = normalizeTagValue(aliasInput);
  if (!alias) return false;
  const store = getStore();
  const existed = store.items.delete(alias);
  if (existed) {
    store.order = store.order.filter((id) => id !== alias);
    persistStore(store);
  }
  return existed;
}

export function getTagMappingsMeta(): { persistedPath?: string | null; lastPersistError?: string | null } {
  const store = getStore();
  return {
    persistedPath: store.persistedPath ?? null,
    lastPersistError: store.lastPersistError ?? null,
  };
}
