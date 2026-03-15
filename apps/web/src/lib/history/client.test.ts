/**
 * Unit tests for history client
 * @module lib/history/client.test
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOrCreateLocalUserId,
  trackHistoryView,
  listHistory,
  clearHistoryForUser,
} from "./client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearLocalStorage() {
  window.localStorage.clear();
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const originalFetch = globalThis.fetch;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("history client", () => {
  beforeEach(() => {
    clearLocalStorage();
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        return jsonResponse({ success: true });
      }

      if (init?.method === "POST") {
        return jsonResponse({ success: true });
      }

      return jsonResponse({ items: [] });
    }) as unknown as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  // -----------------------------------------------------------------------
  // getOrCreateLocalUserId
  // -----------------------------------------------------------------------

  describe("getOrCreateLocalUserId", () => {
    it("creates a new user ID", () => {
      const id = getOrCreateLocalUserId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    });

    it("returns same ID on subsequent calls", () => {
      const id1 = getOrCreateLocalUserId();
      const id2 = getOrCreateLocalUserId();
      expect(id1).toBe(id2);
    });

    it("migrates from legacy rating user ID", () => {
      window.localStorage.setItem("jfp-rating-user-id", "legacy-uuid-123");
      const id = getOrCreateLocalUserId();
      expect(id).toBe("legacy-uuid-123");
    });

    it("stores in both new and legacy keys", () => {
      const id = getOrCreateLocalUserId();
      expect(window.localStorage.getItem("jfpUserId")).toBe(id);
      expect(window.localStorage.getItem("jfp-rating-user-id")).toBe(id);
    });

    it("backfills legacy key if missing", () => {
      window.localStorage.setItem("jfpUserId", "existing-id");
      const id = getOrCreateLocalUserId();
      expect(id).toBe("existing-id");
      expect(window.localStorage.getItem("jfp-rating-user-id")).toBe("existing-id");
    });
  });

  // -----------------------------------------------------------------------
  // trackHistoryView
  // -----------------------------------------------------------------------

  describe("trackHistoryView", () => {
    it("tracks a prompt view", async () => {
      await trackHistoryView({
        resourceType: "prompt",
        resourceId: "prompt-1",
      });

      const items = await listHistory("user");
      expect(items).toHaveLength(1);
      expect(items[0].resourceType).toBe("prompt");
      expect(items[0].resourceId).toBe("prompt-1");
    });

    it("tracks a search view", async () => {
      await trackHistoryView({
        resourceType: "search",
        searchQuery: "test query",
      });

      const items = await listHistory("user");
      expect(items).toHaveLength(1);
      expect(items[0].searchQuery).toBe("test query");
    });

    it("tracks a community prompt view distinctly from first-party prompts", async () => {
      await trackHistoryView({
        resourceType: "community-prompt",
        resourceId: "comm-1",
      });

      const items = await listHistory("user");
      expect(items).toHaveLength(1);
      expect(items[0].resourceType).toBe("community-prompt");
      expect(items[0].resourceId).toBe("comm-1");
    });

    it("deduplicates same resource in time window", async () => {
      await trackHistoryView({
        resourceType: "prompt",
        resourceId: "prompt-1",
      });
      await trackHistoryView({
        resourceType: "prompt",
        resourceId: "prompt-1",
      });

      const items = await listHistory("user");
      expect(items).toHaveLength(1);
    });

    it("deduplicates same search query in time window", async () => {
      await trackHistoryView({
        resourceType: "search",
        searchQuery: "test",
      });
      await trackHistoryView({
        resourceType: "search",
        searchQuery: "test",
      });

      const items = await listHistory("user");
      expect(items).toHaveLength(1);
    });

    it("allows different resources", async () => {
      await trackHistoryView({ resourceType: "prompt", resourceId: "p1" });
      await trackHistoryView({ resourceType: "prompt", resourceId: "p2" });

      const items = await listHistory("user");
      expect(items).toHaveLength(2);
    });

    it("truncates long search queries", async () => {
      const longQuery = "x".repeat(600);
      await trackHistoryView({
        resourceType: "search",
        searchQuery: longQuery,
      });

      const items = await listHistory("user");
      expect(items[0].searchQuery).toHaveLength(500);
    });

    it("dispatches history-update event", async () => {
      const handler = vi.fn();
      window.addEventListener("jfp:history-update", handler);

      await trackHistoryView({ resourceType: "prompt", resourceId: "p1" });
      expect(handler).toHaveBeenCalled();

      window.removeEventListener("jfp:history-update", handler);
    });

    it("most recent item is first", async () => {
      await trackHistoryView({ resourceType: "prompt", resourceId: "p1" });
      await trackHistoryView({ resourceType: "prompt", resourceId: "p2" });

      const items = await listHistory("user");
      expect(items[0].resourceId).toBe("p2");
    });

    it("stores source when provided", async () => {
      await trackHistoryView({
        resourceType: "prompt",
        resourceId: "p1",
        source: "homepage",
      });

      const items = await listHistory("user");
      expect(items[0].source).toBe("homepage");
    });

    it("mirrors tracked views to the history API", async () => {
      await trackHistoryView({
        resourceType: "prompt",
        resourceId: "prompt-1",
        source: "modal",
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/history",
        expect.objectContaining({
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
        })
      );

      const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
      expect(JSON.parse(init?.body as string)).toEqual({
        resourceType: "prompt",
        resourceId: "prompt-1",
        source: "modal",
      });
    });
  });

  // -----------------------------------------------------------------------
  // listHistory
  // -----------------------------------------------------------------------

  describe("listHistory", () => {
    it("returns empty array when no history", async () => {
      const items = await listHistory("user");
      expect(items).toEqual([]);
    });

    it("filters by resource type", async () => {
      await trackHistoryView({ resourceType: "prompt", resourceId: "p1" });
      await trackHistoryView({ resourceType: "community-prompt", resourceId: "comm-1" });
      await trackHistoryView({ resourceType: "search", searchQuery: "q" });

      const prompts = await listHistory("user", { resourceType: "prompt" });
      expect(prompts).toHaveLength(1);
      expect(prompts[0].resourceType).toBe("prompt");
    });

    it("respects limit", async () => {
      for (let i = 0; i < 5; i++) {
        await trackHistoryView({ resourceType: "prompt", resourceId: `p${i}` });
      }

      const items = await listHistory("user", { limit: 3 });
      expect(items).toHaveLength(3);
    });

    it("defaults limit to 20", async () => {
      for (let i = 0; i < 25; i++) {
        await trackHistoryView({ resourceType: "prompt", resourceId: `p${i}` });
      }

      const items = await listHistory("user");
      expect(items).toHaveLength(20);
    });

    it("merges API and local history without duplicating the same entry", async () => {
      window.localStorage.setItem(
        "jfpHistoryV1",
        JSON.stringify([
          {
            id: "local-1",
            userId: "local-user",
            resourceType: "prompt",
            resourceId: "prompt-1",
            searchQuery: null,
            source: "local",
            viewedAt: "2026-03-07T12:00:00.000Z",
            duration: null,
          },
        ])
      );

      globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return jsonResponse({ success: true });
        }
        if (init?.method === "DELETE") {
          return jsonResponse({ success: true });
        }

        return jsonResponse({
          items: [
            {
              id: "remote-duplicate",
              userId: "remote-user",
              resourceType: "prompt",
              resourceId: "prompt-1",
              searchQuery: null,
              source: "remote",
              viewedAt: "2026-03-07T11:00:00.000Z",
              duration: null,
            },
            {
              id: "remote-2",
              userId: "remote-user",
              resourceType: "prompt",
              resourceId: "prompt-2",
              searchQuery: null,
              source: "remote",
              viewedAt: "2026-03-07T13:00:00.000Z",
              duration: null,
            },
          ],
        });
      }) as unknown as typeof fetch;

      const items = await listHistory("user", { limit: 10 });
      expect(items).toHaveLength(2);
      expect(items.map((entry) => entry.resourceId)).toEqual(["prompt-2", "prompt-1"]);
      expect(items[1].source).toBe("local");
    });

    it("ignores malformed stored payloads instead of throwing", async () => {
      window.localStorage.setItem("jfpHistoryV1", JSON.stringify({ invalid: true }));
      await expect(listHistory("user")).resolves.toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // clearHistoryForUser
  // -----------------------------------------------------------------------

  describe("clearHistoryForUser", () => {
    it("clears all history", async () => {
      await trackHistoryView({ resourceType: "prompt", resourceId: "p1" });
      await trackHistoryView({ resourceType: "prompt", resourceId: "p2" });

      await clearHistoryForUser();

      const items = await listHistory("user");
      expect(items).toEqual([]);
    });

    it("dispatches history-update event", async () => {
      const handler = vi.fn();
      window.addEventListener("jfp:history-update", handler);

      await clearHistoryForUser();
      expect(handler).toHaveBeenCalled();

      window.removeEventListener("jfp:history-update", handler);
    });

    it("clears the mirrored API history too", async () => {
      await trackHistoryView({ resourceType: "prompt", resourceId: "p1" });
      vi.mocked(globalThis.fetch).mockClear();

      await clearHistoryForUser();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/history",
        expect.objectContaining({
          method: "DELETE",
          cache: "no-store",
          credentials: "same-origin",
        })
      );
    });
  });
});
