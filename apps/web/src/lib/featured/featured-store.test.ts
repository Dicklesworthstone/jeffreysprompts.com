/**
 * Unit tests for featured-store
 * @module lib/featured/featured-store.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  isFeatureType,
  isResourceType,
  getFeatureTypeLabel,
  getResourceTypeLabel,
  createFeaturedContent,
  getFeaturedContent,
  getFeaturedByResource,
  listFeaturedContent,
  getActiveStaffPicks,
  getActiveFeatured,
  updateFeaturedContent,
  removeFeaturedContent,
  reorderFeaturedContent,
  getFeaturedStats,
  isResourceFeatured,
} from "./featured-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_featured_content_store__"];
}

function seedItem(overrides?: Record<string, unknown>) {
  return createFeaturedContent({
    resourceType: "prompt",
    resourceId: `p-${crypto.randomUUID().slice(0, 8)}`,
    featureType: "staff_pick",
    featuredBy: "admin",
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("featured-store", () => {
  beforeEach(() => {
    clearStore();
  });

  // -----------------------------------------------------------------------
  // Type guards & labels
  // -----------------------------------------------------------------------

  describe("isFeatureType", () => {
    it("returns true for valid feature types", () => {
      expect(isFeatureType("staff_pick")).toBe(true);
      expect(isFeatureType("featured")).toBe(true);
      expect(isFeatureType("spotlight")).toBe(true);
    });

    it("returns false for invalid feature types", () => {
      expect(isFeatureType("unknown")).toBe(false);
      expect(isFeatureType("")).toBe(false);
    });
  });

  describe("isResourceType", () => {
    it("returns true for valid resource types", () => {
      expect(isResourceType("prompt")).toBe(true);
      expect(isResourceType("bundle")).toBe(true);
      expect(isResourceType("workflow")).toBe(true);
      expect(isResourceType("collection")).toBe(true);
      expect(isResourceType("profile")).toBe(true);
    });

    it("returns false for invalid resource types", () => {
      expect(isResourceType("invalid")).toBe(false);
      expect(isResourceType("")).toBe(false);
    });
  });

  describe("getFeatureTypeLabel", () => {
    it("returns label for known types", () => {
      expect(getFeatureTypeLabel("staff_pick")).toBe("Staff Pick");
      expect(getFeatureTypeLabel("featured")).toBe("Featured");
      expect(getFeatureTypeLabel("spotlight")).toBe("Spotlight");
    });
  });

  describe("getResourceTypeLabel", () => {
    it("returns label for known types", () => {
      expect(getResourceTypeLabel("prompt")).toBe("Prompt");
      expect(getResourceTypeLabel("bundle")).toBe("Bundle");
      expect(getResourceTypeLabel("profile")).toBe("User Profile");
    });
  });

  // -----------------------------------------------------------------------
  // createFeaturedContent
  // -----------------------------------------------------------------------

  describe("createFeaturedContent", () => {
    it("creates a featured item with correct fields", () => {
      const item = createFeaturedContent({
        resourceType: "prompt",
        resourceId: "p1",
        featureType: "staff_pick",
        featuredBy: "admin",
        headline: "Top pick",
        description: "A great prompt",
        category: "writing",
      });

      expect(item.id).toBeTruthy();
      expect(item.resourceType).toBe("prompt");
      expect(item.resourceId).toBe("p1");
      expect(item.featureType).toBe("staff_pick");
      expect(item.featuredBy).toBe("admin");
      expect(item.headline).toBe("Top pick");
      expect(item.description).toBe("A great prompt");
      expect(item.category).toBe("writing");
      expect(item.isActive).toBe(true);
      expect(item.position).toBe(0);
      expect(item.startAt).toBeTruthy();
      expect(item.createdAt).toBeTruthy();
    });

    it("defaults optional fields to null", () => {
      const item = createFeaturedContent({
        resourceType: "prompt",
        resourceId: "p1",
        featureType: "featured",
        featuredBy: "admin",
      });
      expect(item.resourceTitle).toBeNull();
      expect(item.category).toBeNull();
      expect(item.headline).toBeNull();
      expect(item.description).toBeNull();
      expect(item.endAt).toBeNull();
    });

    it("uses custom startAt when provided", () => {
      const ts = "2026-03-01T00:00:00.000Z";
      const item = createFeaturedContent({
        resourceType: "prompt",
        resourceId: "p1",
        featureType: "featured",
        featuredBy: "admin",
        startAt: ts,
      });
      expect(item.startAt).toBe(ts);
    });

    it("throws when same resource already actively featured with same type", () => {
      createFeaturedContent({
        resourceType: "prompt",
        resourceId: "p1",
        featureType: "staff_pick",
        featuredBy: "admin",
      });
      expect(() =>
        createFeaturedContent({
          resourceType: "prompt",
          resourceId: "p1",
          featureType: "staff_pick",
          featuredBy: "admin",
        })
      ).toThrow(/already featured/);
    });

    it("allows same resource with different feature type", () => {
      createFeaturedContent({
        resourceType: "prompt",
        resourceId: "p1",
        featureType: "staff_pick",
        featuredBy: "admin",
      });
      expect(() =>
        createFeaturedContent({
          resourceType: "prompt",
          resourceId: "p1",
          featureType: "spotlight",
          featuredBy: "admin",
        })
      ).not.toThrow();
    });

    it("still blocks duplicate same type after adding another active type", () => {
      createFeaturedContent({
        resourceType: "prompt",
        resourceId: "p1",
        featureType: "staff_pick",
        featuredBy: "admin",
      });
      createFeaturedContent({
        resourceType: "prompt",
        resourceId: "p1",
        featureType: "spotlight",
        featuredBy: "admin",
      });

      expect(() =>
        createFeaturedContent({
          resourceType: "prompt",
          resourceId: "p1",
          featureType: "staff_pick",
          featuredBy: "admin",
        })
      ).toThrow(/already featured/);
    });

    it("allows re-featuring after removal", () => {
      const item = createFeaturedContent({
        resourceType: "prompt",
        resourceId: "p1",
        featureType: "staff_pick",
        featuredBy: "admin",
      });
      removeFeaturedContent(item.id);
      expect(() =>
        createFeaturedContent({
          resourceType: "prompt",
          resourceId: "p1",
          featureType: "staff_pick",
          featuredBy: "admin",
        })
      ).not.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // getFeaturedContent / getFeaturedByResource
  // -----------------------------------------------------------------------

  describe("getFeaturedContent", () => {
    it("returns item by ID", () => {
      const item = seedItem();
      expect(getFeaturedContent(item.id)).toEqual(item);
    });

    it("returns null for unknown ID", () => {
      expect(getFeaturedContent("nope")).toBeNull();
    });
  });

  describe("getFeaturedByResource", () => {
    it("returns active featured item for resource", () => {
      const item = seedItem({ resourceType: "prompt", resourceId: "p1" });
      const found = getFeaturedByResource("prompt", "p1");
      expect(found?.id).toBe(item.id);
    });

    it("returns null for unfeatured resource", () => {
      expect(getFeaturedByResource("prompt", "nope")).toBeNull();
    });

    it("returns null after removal (inactive)", () => {
      const item = seedItem({ resourceType: "prompt", resourceId: "p1" });
      removeFeaturedContent(item.id);
      expect(getFeaturedByResource("prompt", "p1")).toBeNull();
    });

    it("returns null for not-yet-started items", () => {
      seedItem({
        resourceType: "prompt",
        resourceId: "p-future",
        startAt: "2099-01-01T00:00:00.000Z",
      });
      expect(getFeaturedByResource("prompt", "p-future")).toBeNull();
    });

    it("returns null for expired items", () => {
      seedItem({
        resourceType: "prompt",
        resourceId: "p-expired",
        startAt: "2020-01-01T00:00:00.000Z",
        endAt: "2020-02-01T00:00:00.000Z",
      });
      expect(getFeaturedByResource("prompt", "p-expired")).toBeNull();
    });

    it("returns another active item for the same resource after one is removed", () => {
      const first = createFeaturedContent({
        resourceType: "prompt",
        resourceId: "p1",
        featureType: "staff_pick",
        featuredBy: "admin",
        position: 10,
      });
      const second = createFeaturedContent({
        resourceType: "prompt",
        resourceId: "p1",
        featureType: "spotlight",
        featuredBy: "admin",
        position: 0,
      });

      removeFeaturedContent(second.id);
      const found = getFeaturedByResource("prompt", "p1");
      expect(found).not.toBeNull();
      expect(found?.id).toBe(first.id);
    });
  });

  // -----------------------------------------------------------------------
  // listFeaturedContent
  // -----------------------------------------------------------------------

  describe("listFeaturedContent", () => {
    it("returns empty array when no featured content", () => {
      expect(listFeaturedContent()).toEqual([]);
    });

    it("returns all active items by default", () => {
      seedItem();
      seedItem();
      expect(listFeaturedContent()).toHaveLength(2);
    });

    it("filters by featureType", () => {
      seedItem({ featureType: "staff_pick" });
      seedItem({ featureType: "featured" });
      const picks = listFeaturedContent({ featureType: "staff_pick" });
      expect(picks).toHaveLength(1);
      expect(picks[0].featureType).toBe("staff_pick");
    });

    it("returns all types when featureType is 'all'", () => {
      seedItem({ featureType: "staff_pick" });
      seedItem({ featureType: "featured" });
      expect(listFeaturedContent({ featureType: "all" })).toHaveLength(2);
    });

    it("filters by resourceType", () => {
      seedItem({ resourceType: "prompt" });
      seedItem({ resourceType: "bundle" });
      const prompts = listFeaturedContent({ resourceType: "prompt" });
      expect(prompts).toHaveLength(1);
      expect(prompts[0].resourceType).toBe("prompt");
    });

    it("filters by category", () => {
      seedItem({ category: "writing" });
      seedItem({ category: "coding" });
      const writing = listFeaturedContent({ category: "writing" });
      expect(writing).toHaveLength(1);
    });

    it("excludes inactive items by default", () => {
      const item = seedItem();
      removeFeaturedContent(item.id);
      expect(listFeaturedContent()).toHaveLength(0);
    });

    it("includes inactive items when includeInactive is true", () => {
      const item = seedItem();
      removeFeaturedContent(item.id);
      expect(listFeaturedContent({ includeInactive: true })).toHaveLength(1);
    });

    it("excludes expired items by default", () => {
      seedItem({
        startAt: "2020-01-01T00:00:00.000Z",
        endAt: "2020-02-01T00:00:00.000Z",
      });
      expect(listFeaturedContent()).toHaveLength(0);
    });

    it("includes expired items when includeExpired is true", () => {
      seedItem({
        startAt: "2020-01-01T00:00:00.000Z",
        endAt: "2020-02-01T00:00:00.000Z",
      });
      expect(listFeaturedContent({ includeExpired: true })).toHaveLength(1);
    });

    it("sorts by position ascending", () => {
      const a = seedItem({ position: 2 });
      const b = seedItem({ position: 0 });
      const c = seedItem({ position: 1 });
      const items = listFeaturedContent();
      expect(items[0].id).toBe(b.id);
      expect(items[1].id).toBe(c.id);
      expect(items[2].id).toBe(a.id);
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 5; i++) seedItem();
      expect(listFeaturedContent({ limit: 2 })).toHaveLength(2);
    });

    it("paginates correctly", () => {
      for (let i = 0; i < 5; i++) seedItem({ position: i });
      const page1 = listFeaturedContent({ limit: 2, page: 1 });
      const page2 = listFeaturedContent({ limit: 2, page: 2 });
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it("clamps page to minimum of 1", () => {
      seedItem();
      expect(listFeaturedContent({ page: 0 })).toHaveLength(1);
      expect(listFeaturedContent({ page: -1 })).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // getActiveStaffPicks / getActiveFeatured
  // -----------------------------------------------------------------------

  describe("getActiveStaffPicks", () => {
    it("returns only staff picks", () => {
      seedItem({ featureType: "staff_pick" });
      seedItem({ featureType: "featured" });
      const picks = getActiveStaffPicks();
      expect(picks).toHaveLength(1);
      expect(picks[0].featureType).toBe("staff_pick");
    });

    it("respects resourceType filter", () => {
      seedItem({ featureType: "staff_pick", resourceType: "prompt" });
      seedItem({ featureType: "staff_pick", resourceType: "bundle" });
      expect(getActiveStaffPicks({ resourceType: "prompt" })).toHaveLength(1);
    });
  });

  describe("getActiveFeatured", () => {
    it("returns only featured items", () => {
      seedItem({ featureType: "featured" });
      seedItem({ featureType: "staff_pick" });
      const items = getActiveFeatured();
      expect(items).toHaveLength(1);
      expect(items[0].featureType).toBe("featured");
    });
  });

  // -----------------------------------------------------------------------
  // updateFeaturedContent
  // -----------------------------------------------------------------------

  describe("updateFeaturedContent", () => {
    it("updates position", () => {
      const item = seedItem();
      const updated = updateFeaturedContent({ id: item.id, position: 5 });
      expect(updated?.position).toBe(5);
    });

    it("updates headline", () => {
      const item = seedItem();
      const updated = updateFeaturedContent({ id: item.id, headline: "New headline" });
      expect(updated?.headline).toBe("New headline");
    });

    it("updates description", () => {
      const item = seedItem();
      const updated = updateFeaturedContent({ id: item.id, description: "New desc" });
      expect(updated?.description).toBe("New desc");
    });

    it("updates endAt", () => {
      const item = seedItem();
      const ts = "2027-01-01T00:00:00.000Z";
      const updated = updateFeaturedContent({ id: item.id, endAt: ts });
      expect(updated?.endAt).toBe(ts);
    });

    it("clears fields when set to null", () => {
      const item = seedItem({ headline: "Old" });
      const updated = updateFeaturedContent({ id: item.id, headline: null });
      expect(updated?.headline).toBeNull();
    });

    it("returns null for unknown ID", () => {
      expect(updateFeaturedContent({ id: "nope", position: 1 })).toBeNull();
    });

    it("preserves unchanged fields", () => {
      const item = seedItem({ headline: "Keep" });
      const updated = updateFeaturedContent({ id: item.id, position: 3 });
      expect(updated?.headline).toBe("Keep");
      expect(updated?.position).toBe(3);
    });
  });

  // -----------------------------------------------------------------------
  // removeFeaturedContent
  // -----------------------------------------------------------------------

  describe("removeFeaturedContent", () => {
    it("sets isActive to false", () => {
      const item = seedItem();
      const removed = removeFeaturedContent(item.id);
      expect(removed?.isActive).toBe(false);
    });

    it("item still accessible by ID after removal", () => {
      const item = seedItem();
      removeFeaturedContent(item.id);
      const found = getFeaturedContent(item.id);
      expect(found).not.toBeNull();
      expect(found?.isActive).toBe(false);
    });

    it("returns null for unknown ID", () => {
      expect(removeFeaturedContent("nope")).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // reorderFeaturedContent
  // -----------------------------------------------------------------------

  describe("reorderFeaturedContent", () => {
    it("assigns positions based on array order", () => {
      const a = seedItem();
      const b = seedItem();
      const c = seedItem();
      reorderFeaturedContent([c.id, a.id, b.id]);
      expect(getFeaturedContent(c.id)?.position).toBe(0);
      expect(getFeaturedContent(a.id)?.position).toBe(1);
      expect(getFeaturedContent(b.id)?.position).toBe(2);
    });

    it("skips unknown IDs gracefully", () => {
      const a = seedItem();
      expect(() => reorderFeaturedContent(["nope", a.id])).not.toThrow();
      expect(getFeaturedContent(a.id)?.position).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // getFeaturedStats
  // -----------------------------------------------------------------------

  describe("getFeaturedStats", () => {
    it("returns zeroed stats when empty", () => {
      const stats = getFeaturedStats();
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
    });

    it("counts active items correctly", () => {
      seedItem({ featureType: "staff_pick", resourceType: "prompt" });
      seedItem({ featureType: "featured", resourceType: "bundle" });
      const inactive = seedItem({ featureType: "spotlight" });
      removeFeaturedContent(inactive.id);

      const stats = getFeaturedStats();
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.byType.staff_pick).toBe(1);
      expect(stats.byType.featured).toBe(1);
      expect(stats.byType.spotlight).toBe(0);
      expect(stats.byResourceType.prompt).toBe(1);
      expect(stats.byResourceType.bundle).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // isResourceFeatured
  // -----------------------------------------------------------------------

  describe("isResourceFeatured", () => {
    it("returns isFeatured: true for featured resource", () => {
      seedItem({ resourceType: "prompt", resourceId: "p1", featureType: "staff_pick" });
      const result = isResourceFeatured("prompt", "p1");
      expect(result.isFeatured).toBe(true);
      expect(result.featureType).toBe("staff_pick");
    });

    it("returns isFeatured: false for unfeatured resource", () => {
      const result = isResourceFeatured("prompt", "nope");
      expect(result.isFeatured).toBe(false);
      expect(result.featureType).toBeUndefined();
    });

    it("returns isFeatured: false after removal", () => {
      const item = seedItem({ resourceType: "prompt", resourceId: "p1" });
      removeFeaturedContent(item.id);
      expect(isResourceFeatured("prompt", "p1").isFeatured).toBe(false);
    });
  });
});
