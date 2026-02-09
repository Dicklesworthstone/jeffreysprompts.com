/**
 * Unit tests for history-store
 * @module lib/history/history-store.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { recordView, listHistory, clearHistory } from "./history-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearStore() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g["__jfp_view_history_store__"];
}

function getEntriesByUserMap(): Map<string, string[]> | null {
  const g = globalThis as unknown as Record<string, unknown>;
  const store = g["__jfp_view_history_store__"] as
    | { entriesByUser?: Map<string, string[]> }
    | undefined;
  return store?.entriesByUser ?? null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("history-store", () => {
  beforeEach(() => {
    clearStore();
  });

  // -----------------------------------------------------------------------
  // recordView
  // -----------------------------------------------------------------------

  describe("recordView", () => {
    it("creates a new view entry", () => {
      const entry = recordView({
        userId: "u1",
        resourceType: "prompt",
        resourceId: "p1",
      });

      expect(entry.id).toBeTruthy();
      expect(entry.userId).toBe("u1");
      expect(entry.resourceType).toBe("prompt");
      expect(entry.resourceId).toBe("p1");
      expect(entry.viewedAt).toBeTruthy();
    });

    it("assigns unique IDs to entries", () => {
      const e1 = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      const e2 = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p2" });
      expect(e1.id).not.toBe(e2.id);
    });

    it("sets null fields when optional params omitted", () => {
      const entry = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      expect(entry.searchQuery).toBeNull();
      expect(entry.source).toBeNull();
      expect(entry.duration).toBeNull();
    });

    it("stores provided optional fields", () => {
      const entry = recordView({
        userId: "u1",
        resourceType: "search",
        searchQuery: "hello world",
        source: "homepage",
        duration: 42,
      });
      expect(entry.searchQuery).toBe("hello world");
      expect(entry.source).toBe("homepage");
      expect(entry.duration).toBe(42);
    });

    it("sets resourceId to null for search type entries", () => {
      const entry = recordView({
        userId: "u1",
        resourceType: "search",
        resourceId: "should-be-ignored",
        searchQuery: "test",
      });
      expect(entry.resourceId).toBeNull();
    });

    it("uses provided viewedAt timestamp", () => {
      const ts = "2026-01-15T12:00:00.000Z";
      const entry = recordView({
        userId: "u1",
        resourceType: "prompt",
        resourceId: "p1",
        viewedAt: ts,
      });
      expect(entry.viewedAt).toBe(ts);
    });

    it("falls back to current time for invalid viewedAt", () => {
      const before = Date.now();
      const entry = recordView({
        userId: "u1",
        resourceType: "prompt",
        resourceId: "p1",
        viewedAt: "not-a-date",
      });
      const viewedMs = new Date(entry.viewedAt).getTime();
      expect(viewedMs).toBeGreaterThanOrEqual(before);
    });

    it("deduplicates views of same resource within window", () => {
      const e1 = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      const e2 = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      expect(e2.id).toBe(e1.id);
    });

    it("updates viewedAt on duplicate", () => {
      const ts1 = "2026-02-01T10:00:00.000Z";
      const ts2 = "2026-02-01T10:01:00.000Z";
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1", viewedAt: ts1 });
      const updated = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1", viewedAt: ts2 });
      expect(updated.viewedAt).toBe(ts2);
    });

    it("updates source on duplicate when provided", () => {
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1", source: "old" });
      const updated = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1", source: "new" });
      expect(updated.source).toBe("new");
    });

    it("updates duration on duplicate when provided", () => {
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1", duration: 10 });
      const updated = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1", duration: 20 });
      expect(updated.duration).toBe(20);
    });

    it("deduplicates search queries case-insensitively", () => {
      const e1 = recordView({ userId: "u1", resourceType: "search", searchQuery: "Hello World" });
      const e2 = recordView({ userId: "u1", resourceType: "search", searchQuery: "hello world" });
      expect(e2.id).toBe(e1.id);
    });

    it("does not deduplicate different resource types", () => {
      const e1 = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      const e2 = recordView({ userId: "u1", resourceType: "bundle", resourceId: "p1" });
      expect(e2.id).not.toBe(e1.id);
    });

    it("does not deduplicate different users", () => {
      const e1 = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      const e2 = recordView({ userId: "u2", resourceType: "prompt", resourceId: "p1" });
      expect(e2.id).not.toBe(e1.id);
    });

    it("creates new entry outside dedupe window", () => {
      vi.useFakeTimers();
      try {
        const e1 = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
        vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes > 5 min window
        const e2 = recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
        expect(e2.id).not.toBe(e1.id);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // -----------------------------------------------------------------------
  // listHistory
  // -----------------------------------------------------------------------

  describe("listHistory", () => {
    it("returns empty array for new user", () => {
      const items = listHistory({ userId: "u1" });
      expect(items).toEqual([]);
    });

    it("returns entries most-recent-first", () => {
      const older = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const newer = new Date(Date.now() - 60 * 1000).toISOString();
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1", viewedAt: older });
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p2", viewedAt: newer });
      const items = listHistory({ userId: "u1" });
      expect(items).toHaveLength(2);
      expect(items[0].resourceId).toBe("p2");
      expect(items[1].resourceId).toBe("p1");
    });

    it("filters by resourceType", () => {
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      recordView({ userId: "u1", resourceType: "bundle", resourceId: "b1" });
      const prompts = listHistory({ userId: "u1", resourceType: "prompt" });
      expect(prompts).toHaveLength(1);
      expect(prompts[0].resourceType).toBe("prompt");
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 5; i++) {
        recordView({ userId: "u1", resourceType: "prompt", resourceId: `p${i}` });
      }
      const items = listHistory({ userId: "u1", limit: 3 });
      expect(items).toHaveLength(3);
    });

    it("uses default limit of 20", () => {
      for (let i = 0; i < 25; i++) {
        recordView({ userId: "u1", resourceType: "prompt", resourceId: `p${i}` });
      }
      const items = listHistory({ userId: "u1" });
      expect(items).toHaveLength(20);
    });

    it("isolates history per user", () => {
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      recordView({ userId: "u2", resourceType: "prompt", resourceId: "p2" });
      expect(listHistory({ userId: "u1" })).toHaveLength(1);
      expect(listHistory({ userId: "u2" })).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // clearHistory
  // -----------------------------------------------------------------------

  describe("clearHistory", () => {
    it("clears all history for a user", () => {
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p2" });
      clearHistory("u1");
      expect(listHistory({ userId: "u1" })).toEqual([]);
    });

    it("does not affect other users", () => {
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      recordView({ userId: "u2", resourceType: "prompt", resourceId: "p2" });
      clearHistory("u1");
      expect(listHistory({ userId: "u1" })).toEqual([]);
      expect(listHistory({ userId: "u2" })).toHaveLength(1);
    });

    it("is safe to call for nonexistent user", () => {
      expect(() => clearHistory("nobody")).not.toThrow();
    });

    it("removes empty user buckets from internal index", () => {
      recordView({ userId: "u1", resourceType: "prompt", resourceId: "p1" });
      clearHistory("u1");

      const entriesByUser = getEntriesByUserMap();
      expect(entriesByUser?.has("u1")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // TTL pruning
  // -----------------------------------------------------------------------

  describe("pruning", () => {
    it("prunes entries older than 30 days on next access", () => {
      vi.useFakeTimers();
      try {
        recordView({ userId: "u1", resourceType: "prompt", resourceId: "old" });
        // Advance past 30-day TTL + prune interval
        vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);
        recordView({ userId: "u1", resourceType: "prompt", resourceId: "new" });
        const items = listHistory({ userId: "u1" });
        // Only the new entry should remain
        expect(items).toHaveLength(1);
        expect(items[0].resourceId).toBe("new");
      } finally {
        vi.useRealTimers();
      }
    });

    it("removes user bucket when all entries expire", () => {
      vi.useFakeTimers();
      try {
        recordView({ userId: "u1", resourceType: "prompt", resourceId: "old" });
        vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

        const items = listHistory({ userId: "u1" });
        expect(items).toEqual([]);

        const entriesByUser = getEntriesByUserMap();
        expect(entriesByUser?.has("u1")).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
