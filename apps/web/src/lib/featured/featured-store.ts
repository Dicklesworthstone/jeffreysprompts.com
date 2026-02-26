/**
 * Featured Content Store
 *
 * Manages staff picks, featured content, and spotlight items.
 * Uses an in-memory store following the existing pattern from report-store.ts.
 */

export type FeatureType = "staff_pick" | "featured" | "spotlight";
export type ResourceType = "prompt" | "bundle" | "workflow" | "collection" | "profile";

export const FEATURE_TYPES = [
  { value: "staff_pick", label: "Staff Pick", description: "Hand-picked by Jeff" },
  { value: "featured", label: "Featured", description: "Highlighted content" },
  { value: "spotlight", label: "Spotlight", description: "Special spotlight feature" },
] as const;

export const RESOURCE_TYPES = [
  { value: "prompt", label: "Prompt" },
  { value: "bundle", label: "Bundle" },
  { value: "workflow", label: "Workflow" },
  { value: "collection", label: "Collection" },
  { value: "profile", label: "User Profile" },
] as const;

const FEATURE_TYPE_SET = new Set(FEATURE_TYPES.map((t) => t.value));
const RESOURCE_TYPE_SET = new Set(RESOURCE_TYPES.map((t) => t.value));

export function isFeatureType(value: string): value is FeatureType {
  return FEATURE_TYPE_SET.has(value as FeatureType);
}

export function isResourceType(value: string): value is ResourceType {
  return RESOURCE_TYPE_SET.has(value as ResourceType);
}

export function getFeatureTypeLabel(type: FeatureType): string {
  return FEATURE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function getResourceTypeLabel(type: ResourceType): string {
  return RESOURCE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export interface FeaturedContent {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceTitle?: string | null;
  featureType: FeatureType;
  category?: string | null;
  position: number;
  headline?: string | null;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  featuredBy: string;
  createdAt: string;
  isActive: boolean;
}

interface FeaturedStore {
  items: Map<string, FeaturedContent>;
  byResourceKey: Map<string, string>;
  order: string[];
}

const STORE_KEY = "__jfp_featured_content_store__";

function getStore(): FeaturedStore {
  const globalStore = globalThis as typeof globalThis & {
    [STORE_KEY]?: FeaturedStore;
  };

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = {
      items: new Map(),
      byResourceKey: new Map(),
      order: [],
    };
  }

  return globalStore[STORE_KEY];
}

function makeResourceKey(resourceType: ResourceType, resourceId: string): string {
  return `${resourceType}:${resourceId}`;
}

function touchItem(store: FeaturedStore, itemId: string) {
  store.order = [itemId, ...store.order.filter((id) => id !== itemId)];
}

function listActiveItemsForResource(
  store: FeaturedStore,
  resourceType: ResourceType,
  resourceId: string
): FeaturedContent[] {
  return store.order
    .map((id) => store.items.get(id))
    .filter((item): item is FeaturedContent => Boolean(item))
    .filter(
      (item) =>
        item.resourceType === resourceType &&
        item.resourceId === resourceId &&
        isCurrentlyActive(item)
    )
    .sort((a, b) => a.position - b.position);
}

/**
 * Check if item is within its scheduled time window (ignores isActive flag).
 */
function isWithinTimeWindow(item: FeaturedContent): boolean {
  const now = Date.now();
  const startAt = new Date(item.startAt).getTime();
  if (Number.isNaN(startAt) || startAt > now) return false;

  if (item.endAt) {
    const endAt = new Date(item.endAt).getTime();
    if (!Number.isNaN(endAt) && endAt < now) return false;
  }

  return true;
}

/**
 * Check if item is currently active (isActive flag AND within time window).
 */
function isCurrentlyActive(item: FeaturedContent): boolean {
  if (!item.isActive) return false;
  return isWithinTimeWindow(item);
}

export function createFeaturedContent(input: {
  resourceType: ResourceType;
  resourceId: string;
  resourceTitle?: string | null;
  featureType: FeatureType;
  category?: string | null;
  position?: number;
  headline?: string | null;
  description?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  featuredBy: string;
}): FeaturedContent {
  const store = getStore();
  const now = new Date().toISOString();
  const resourceKey = makeResourceKey(input.resourceType, input.resourceId);

  // Check if already featured with same type.
  // We must scan active items, because a single resource can have multiple active feature types.
  const existingSameType = listActiveItemsForResource(
    store,
    input.resourceType,
    input.resourceId
  ).find((item) => item.featureType === input.featureType);
  if (existingSameType) {
    throw new Error(`Resource is already featured as ${input.featureType}`);
  }

  const item: FeaturedContent = {
    id: crypto.randomUUID(),
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    resourceTitle: input.resourceTitle ?? null,
    featureType: input.featureType,
    category: input.category ?? null,
    position: input.position ?? 0,
    headline: input.headline ?? null,
    description: input.description ?? null,
    startAt: input.startAt ?? now,
    endAt: input.endAt ?? null,
    featuredBy: input.featuredBy,
    createdAt: now,
    isActive: true,
  };

  store.items.set(item.id, item);
  store.byResourceKey.set(resourceKey, item.id);
  touchItem(store, item.id);
  return item;
}

export function getFeaturedContent(id: string): FeaturedContent | null {
  const store = getStore();
  return store.items.get(id) ?? null;
}

export function getFeaturedByResource(
  resourceType: ResourceType,
  resourceId: string
): FeaturedContent | null {
  const store = getStore();
  const resourceKey = makeResourceKey(resourceType, resourceId);
  const mappedItemId = store.byResourceKey.get(resourceKey);
  if (mappedItemId) {
    const mappedItem = store.items.get(mappedItemId);
    if (
      mappedItem &&
      mappedItem.resourceType === resourceType &&
      mappedItem.resourceId === resourceId &&
      isCurrentlyActive(mappedItem)
    ) {
      return mappedItem;
    }
  }

  // Heal stale/missing key map by deriving the best active item.
  const activeItems = listActiveItemsForResource(store, resourceType, resourceId);
  const best = activeItems[0] ?? null;
  if (best) {
    store.byResourceKey.set(resourceKey, best.id);
    return best;
  }

  store.byResourceKey.delete(resourceKey);
  return null;
}

export function listFeaturedContent(filters?: {
  featureType?: FeatureType | "all";
  resourceType?: ResourceType | "all";
  category?: string | null;
  includeInactive?: boolean;
  includeExpired?: boolean;
  limit?: number;
  page?: number;
}): FeaturedContent[] {
  const store = getStore();
  const limit = filters?.limit ?? 50;
  const page = Math.max(1, filters?.page ?? 1);

  const items = store.order
    .map((id) => store.items.get(id))
    .filter((item): item is FeaturedContent => Boolean(item))
    .filter((item) => {
      // Filter by isActive flag (manual deactivation)
      if (!filters?.includeInactive && !item.isActive) return false;
      // Filter by time window (expired/not-yet-started)
      if (!filters?.includeExpired && !isWithinTimeWindow(item)) return false;
      if (filters?.featureType && filters.featureType !== "all" && item.featureType !== filters.featureType) {
        return false;
      }
      if (filters?.resourceType && filters.resourceType !== "all" && item.resourceType !== filters.resourceType) {
        return false;
      }
      if (filters?.category && item.category !== filters.category) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.position - b.position);

  const start = (page - 1) * limit;
  return items.slice(start, start + limit);
}

export function getActiveStaffPicks(options?: {
  resourceType?: ResourceType;
  category?: string;
  limit?: number;
}): FeaturedContent[] {
  return listFeaturedContent({
    featureType: "staff_pick",
    resourceType: options?.resourceType ?? "all",
    category: options?.category ?? null,
    limit: options?.limit ?? 10,
  });
}

export function getActiveFeatured(options?: {
  resourceType?: ResourceType;
  category?: string;
  limit?: number;
}): FeaturedContent[] {
  return listFeaturedContent({
    featureType: "featured",
    resourceType: options?.resourceType ?? "all",
    category: options?.category ?? null,
    limit: options?.limit ?? 10,
  });
}

export function updateFeaturedContent(input: {
  id: string;
  position?: number;
  headline?: string | null;
  description?: string | null;
  endAt?: string | null;
}): FeaturedContent | null {
  const store = getStore();
  const item = store.items.get(input.id);
  if (!item) return null;

  if (input.position !== undefined) item.position = input.position;
  if (input.headline !== undefined) item.headline = input.headline;
  if (input.description !== undefined) item.description = input.description;
  if (input.endAt !== undefined) item.endAt = input.endAt;

  store.items.set(item.id, item);
  touchItem(store, item.id);
  return item;
}

export function removeFeaturedContent(id: string): FeaturedContent | null {
  const store = getStore();
  const item = store.items.get(id);
  if (!item) return null;

  item.isActive = false;
  store.items.set(item.id, item);

  const resourceKey = makeResourceKey(item.resourceType, item.resourceId);
  if (store.byResourceKey.get(resourceKey) === item.id) {
    const replacement = listActiveItemsForResource(
      store,
      item.resourceType,
      item.resourceId
    )[0];
    if (replacement) {
      store.byResourceKey.set(resourceKey, replacement.id);
    } else {
      store.byResourceKey.delete(resourceKey);
    }
  }

  return item;
}

export function reorderFeaturedContent(ids: string[]): void {
  const store = getStore();

  ids.forEach((id, index) => {
    const item = store.items.get(id);
    if (item) {
      item.position = index;
      store.items.set(id, item);
    }
  });
}

export function getFeaturedStats(): {
  total: number;
  active: number;
  byType: Record<FeatureType, number>;
  byResourceType: Record<ResourceType, number>;
} {
  const store = getStore();

  const stats = {
    total: store.items.size,
    active: 0,
    byType: {
      staff_pick: 0,
      featured: 0,
      spotlight: 0,
    } as Record<FeatureType, number>,
    byResourceType: {
      prompt: 0,
      bundle: 0,
      workflow: 0,
      collection: 0,
      profile: 0,
    } as Record<ResourceType, number>,
  };

  for (const item of store.items.values()) {
    if (isCurrentlyActive(item)) {
      stats.active += 1;
      stats.byType[item.featureType] = (stats.byType[item.featureType] ?? 0) + 1;
      stats.byResourceType[item.resourceType] = (stats.byResourceType[item.resourceType] ?? 0) + 1;
    }
  }

  return stats;
}

export function isResourceFeatured(
  resourceType: ResourceType,
  resourceId: string
): { isFeatured: boolean; featureType?: FeatureType } {
  const featured = getFeaturedByResource(resourceType, resourceId);
  if (!featured) return { isFeatured: false };
  return { isFeatured: true, featureType: featured.featureType };
}
