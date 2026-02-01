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
}

const STORE_KEY = "__jfp_tag_mapping_store__";

function getStore(): TagMappingStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: TagMappingStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      items: new Map(),
      order: [],
    };
  }

  return globalStore[STORE_KEY];
}

function normalizeTagValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function touch(store: TagMappingStore, alias: string) {
  store.order = [alias, ...store.order.filter((id) => id !== alias)];
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
  return mapping;
}

export function removeTagMapping(aliasInput: string): boolean {
  const alias = normalizeTagValue(aliasInput);
  if (!alias) return false;
  const store = getStore();
  const existed = store.items.delete(alias);
  if (existed) {
    store.order = store.order.filter((id) => id !== alias);
  }
  return existed;
}
