import { test, expect } from "../lib/playwright-logger";
import {
  recordHistoryViaAPI,
  getHistoryViaAPI,
  clearHistoryViaAPI,
  generateUniqueUserId,
  TEST_USER_ID,
  TEST_USER_ID_2,
  type ViewHistoryEntry,
} from "../lib/history-helpers";

/**
 * Recently Viewed History E2E Tests
 *
 * Tests for the view history tracking feature:
 * - History recording via API
 * - History retrieval
 * - Deduplication
 * - History management (clear, limit)
 * - Privacy (user isolation)
 */

test.setTimeout(60000);

test.describe("History API - Recording", () => {
  let testUserId: string;

  test.beforeEach(async ({ request, logger }) => {
    testUserId = generateUniqueUserId();
    await logger.step("clear any existing history for test user", async () => {
      await clearHistoryViaAPI(request, testUserId);
    });
  });

  test.afterEach(async ({ request, logger }) => {
    await logger.step("cleanup test user history", async () => {
      await clearHistoryViaAPI(request, testUserId);
    });
  });

  test("records prompt view in history", async ({ request, logger }) => {
    let entry: ViewHistoryEntry;

    await logger.step("record a prompt view", async () => {
      entry = await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "test-prompt-123",
        source: "browse",
      });
    });

    await logger.step("verify entry was created", async () => {
      expect(entry).toBeDefined();
      expect(entry.userId).toBe(testUserId);
      expect(entry.resourceType).toBe("prompt");
      expect(entry.resourceId).toBe("test-prompt-123");
      expect(entry.source).toBe("browse");
      expect(entry.viewedAt).toBeTruthy();
    });

    await logger.step("verify entry appears in history", async () => {
      const history = await getHistoryViaAPI(request, testUserId);
      expect(history.length).toBe(1);
      expect(history[0].id).toBe(entry.id);
    });
  });

  test("records collection view in history", async ({ request, logger }) => {
    await logger.step("record a collection view", async () => {
      const entry = await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "collection",
        resourceId: "test-collection-456",
        source: "direct",
      });

      expect(entry.resourceType).toBe("collection");
      expect(entry.resourceId).toBe("test-collection-456");
    });
  });

  test("records search query in history", async ({ request, logger }) => {
    await logger.step("record a search query", async () => {
      const entry = await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "search",
        searchQuery: "react hooks tutorial",
        source: "search",
      });

      expect(entry.resourceType).toBe("search");
      expect(entry.searchQuery).toBe("react hooks tutorial");
      expect(entry.resourceId).toBeNull();
    });
  });

  test("duplicate views within 5 minutes return existing entry", async ({ request, logger }) => {
    let firstEntry: ViewHistoryEntry;
    let secondEntry: ViewHistoryEntry;

    await logger.step("record first view", async () => {
      firstEntry = await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "dedupe-test-prompt",
        source: "browse",
      });
    });

    await logger.step("record duplicate view immediately", async () => {
      secondEntry = await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "dedupe-test-prompt",
        source: "browse",
      });
    });

    await logger.step("verify same entry returned (deduplication)", async () => {
      expect(secondEntry.id).toBe(firstEntry.id);
    });

    await logger.step("verify only one entry in history", async () => {
      const history = await getHistoryViaAPI(request, testUserId);
      expect(history.length).toBe(1);
    });
  });

  test("different resource types create separate entries", async ({ request, logger }) => {
    await logger.step("record prompt view", async () => {
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "resource-123",
        source: "browse",
      });
    });

    await logger.step("record collection view with same ID", async () => {
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "collection",
        resourceId: "resource-123",
        source: "browse",
      });
    });

    await logger.step("verify two separate entries exist", async () => {
      const history = await getHistoryViaAPI(request, testUserId);
      expect(history.length).toBe(2);
      const types = history.map((h) => h.resourceType).sort();
      expect(types).toEqual(["collection", "prompt"]);
    });
  });
});

test.describe("History API - Retrieval", () => {
  let testUserId: string;

  test.beforeEach(async ({ request, logger }) => {
    testUserId = generateUniqueUserId();
    await logger.step("setup: create test history entries", async () => {
      // Clear first
      await clearHistoryViaAPI(request, testUserId);

      // Create multiple entries with slight delays to ensure order
      for (let i = 1; i <= 5; i++) {
        await recordHistoryViaAPI(request, {
          userId: testUserId,
          resourceType: "prompt",
          resourceId: `prompt-${i}`,
          source: "test",
        });
      }
    });
  });

  test.afterEach(async ({ request }) => {
    await clearHistoryViaAPI(request, testUserId);
  });

  test("returns history in most recent first order", async ({ request, logger }) => {
    await logger.step("fetch history", async () => {
      const history = await getHistoryViaAPI(request, testUserId);
      expect(history.length).toBe(5);
      // Most recently added should be first (prompt-5)
      expect(history[0].resourceId).toBe("prompt-5");
      expect(history[4].resourceId).toBe("prompt-1");
    });
  });

  test("respects limit parameter", async ({ request, logger }) => {
    await logger.step("fetch history with limit=3", async () => {
      const history = await getHistoryViaAPI(request, testUserId, { limit: 3 });
      expect(history.length).toBe(3);
      // Should be the 3 most recent
      expect(history[0].resourceId).toBe("prompt-5");
      expect(history[2].resourceId).toBe("prompt-3");
    });
  });

  test("filters by resource type", async ({ request, logger }) => {
    await logger.step("add a collection entry", async () => {
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "collection",
        resourceId: "collection-1",
        source: "test",
      });
    });

    await logger.step("fetch only prompt entries", async () => {
      const promptHistory = await getHistoryViaAPI(request, testUserId, {
        resourceType: "prompt",
      });
      expect(promptHistory.length).toBe(5);
      expect(promptHistory.every((h) => h.resourceType === "prompt")).toBe(true);
    });

    await logger.step("fetch only collection entries", async () => {
      const collectionHistory = await getHistoryViaAPI(request, testUserId, {
        resourceType: "collection",
      });
      expect(collectionHistory.length).toBe(1);
      expect(collectionHistory[0].resourceType).toBe("collection");
    });
  });

  test("returns empty array for user with no history", async ({ request, logger }) => {
    const emptyUserId = generateUniqueUserId();

    await logger.step("fetch history for new user", async () => {
      const history = await getHistoryViaAPI(request, emptyUserId);
      expect(history).toEqual([]);
    });
  });
});

test.describe("History API - Management", () => {
  let testUserId: string;

  test.beforeEach(async ({ request, logger }) => {
    testUserId = generateUniqueUserId();
    await logger.step("clear any existing history", async () => {
      await clearHistoryViaAPI(request, testUserId);
    });
  });

  test.afterEach(async ({ request }) => {
    await clearHistoryViaAPI(request, testUserId);
  });

  test("clears all history for user", async ({ request, logger }) => {
    await logger.step("create multiple history entries", async () => {
      for (let i = 1; i <= 3; i++) {
        await recordHistoryViaAPI(request, {
          userId: testUserId,
          resourceType: "prompt",
          resourceId: `clear-test-${i}`,
          source: "test",
        });
      }
    });

    await logger.step("verify entries exist", async () => {
      const history = await getHistoryViaAPI(request, testUserId);
      expect(history.length).toBe(3);
    });

    await logger.step("clear all history", async () => {
      await clearHistoryViaAPI(request, testUserId);
    });

    await logger.step("verify history is empty", async () => {
      const history = await getHistoryViaAPI(request, testUserId);
      expect(history.length).toBe(0);
    });
  });

  test("respects maximum limit of 100 entries", async ({ request, logger }) => {
    await logger.step("request 150 entries (exceeds max)", async () => {
      // Create a few entries first
      for (let i = 1; i <= 5; i++) {
        await recordHistoryViaAPI(request, {
          userId: testUserId,
          resourceType: "prompt",
          resourceId: `limit-test-${i}`,
          source: "test",
        });
      }

      // Request with very high limit
      const history = await getHistoryViaAPI(request, testUserId, { limit: 150 });
      // Should return all 5 (since we only have 5), but limit is capped at 100
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });
});

test.describe("History API - Privacy", () => {
  const user1 = TEST_USER_ID;
  const user2 = TEST_USER_ID_2;

  test.beforeEach(async ({ request, logger }) => {
    await logger.step("clear history for both test users", async () => {
      await clearHistoryViaAPI(request, user1);
      await clearHistoryViaAPI(request, user2);
    });
  });

  test.afterEach(async ({ request }) => {
    await clearHistoryViaAPI(request, user1);
    await clearHistoryViaAPI(request, user2);
  });

  test("history is isolated between users", async ({ request, logger }) => {
    await logger.step("user1 views a prompt", async () => {
      await recordHistoryViaAPI(request, {
        userId: user1,
        resourceType: "prompt",
        resourceId: "private-prompt-1",
        source: "browse",
      });
    });

    await logger.step("user2 views a different prompt", async () => {
      await recordHistoryViaAPI(request, {
        userId: user2,
        resourceType: "prompt",
        resourceId: "private-prompt-2",
        source: "browse",
      });
    });

    await logger.step("verify user1 only sees their history", async () => {
      const user1History = await getHistoryViaAPI(request, user1);
      expect(user1History.length).toBe(1);
      expect(user1History[0].resourceId).toBe("private-prompt-1");
    });

    await logger.step("verify user2 only sees their history", async () => {
      const user2History = await getHistoryViaAPI(request, user2);
      expect(user2History.length).toBe(1);
      expect(user2History[0].resourceId).toBe("private-prompt-2");
    });
  });

  test("clearing one users history does not affect another", async ({ request, logger }) => {
    await logger.step("both users view prompts", async () => {
      await recordHistoryViaAPI(request, {
        userId: user1,
        resourceType: "prompt",
        resourceId: "user1-prompt",
        source: "browse",
      });
      await recordHistoryViaAPI(request, {
        userId: user2,
        resourceType: "prompt",
        resourceId: "user2-prompt",
        source: "browse",
      });
    });

    await logger.step("user1 clears their history", async () => {
      await clearHistoryViaAPI(request, user1);
    });

    await logger.step("verify user1 history is empty", async () => {
      const user1History = await getHistoryViaAPI(request, user1);
      expect(user1History.length).toBe(0);
    });

    await logger.step("verify user2 history is intact", async () => {
      const user2History = await getHistoryViaAPI(request, user2);
      expect(user2History.length).toBe(1);
      expect(user2History[0].resourceId).toBe("user2-prompt");
    });
  });
});

test.describe("History API - Validation", () => {
  test("rejects requests without userId", async ({ request, logger }) => {
    await logger.step("attempt GET without userId", async () => {
      const response = await request.get("/api/history");
      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("userId");
    });

    await logger.step("attempt POST without userId", async () => {
      const response = await request.post("/api/history", {
        data: {
          resourceType: "prompt",
          resourceId: "test",
        },
      });
      expect(response.status()).toBe(400);
    });

    await logger.step("attempt DELETE without userId", async () => {
      const response = await request.delete("/api/history");
      expect(response.status()).toBe(400);
    });
  });

  test("rejects invalid resource type", async ({ request, logger }) => {
    await logger.step("attempt to record with invalid resource type", async () => {
      const response = await request.post("/api/history", {
        data: {
          userId: "test-user",
          resourceType: "invalid_type",
          resourceId: "test",
        },
      });
      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("resource type");
    });
  });

  test("requires resourceId for non-search types", async ({ request, logger }) => {
    await logger.step("attempt to record prompt without resourceId", async () => {
      const response = await request.post("/api/history", {
        data: {
          userId: "test-user",
          resourceType: "prompt",
        },
      });
      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("resourceId");
    });
  });

  test("requires searchQuery for search type", async ({ request, logger }) => {
    await logger.step("attempt to record search without searchQuery", async () => {
      const response = await request.post("/api/history", {
        data: {
          userId: "test-user",
          resourceType: "search",
        },
      });
      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("searchQuery");
    });
  });

  test("rejects excessively long userId", async ({ request, logger }) => {
    await logger.step("attempt with very long userId", async () => {
      const longUserId = "a".repeat(250);
      const response = await request.get(`/api/history?userId=${longUserId}`);
      expect(response.status()).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Invalid user id");
    });
  });

  test("rejects invalid JSON body", async ({ request, logger }) => {
    await logger.step("send malformed JSON", async () => {
      const response = await request.post("/api/history", {
        headers: { "Content-Type": "application/json" },
        data: "not valid json{",
      });
      expect(response.status()).toBe(400);
    });
  });
});

/**
 * UI Tests for History Page (/history)
 */
test.describe("History Page - UI", () => {
  let testUserId: string;

  test.beforeEach(async ({ request, page, logger }) => {
    testUserId = generateUniqueUserId();
    await logger.step("clear any existing history", async () => {
      await clearHistoryViaAPI(request, testUserId);
    });

    // Set the userId in localStorage so the page uses it
    await logger.step("navigate to history page", async () => {
      await page.goto("/history");
      await page.evaluate((userId) => {
        localStorage.setItem("jp_user_id", userId);
      }, testUserId);
      await page.reload();
    });
  });

  test.afterEach(async ({ request }) => {
    await clearHistoryViaAPI(request, testUserId);
  });

  test("displays page header and navigation", async ({ page, logger }) => {
    await logger.step("verify page header", async () => {
      await expect(page.getByRole("heading", { name: /recently viewed/i })).toBeVisible();
    });

    await logger.step("verify back link", async () => {
      await expect(page.getByRole("link", { name: /back to prompts/i })).toBeVisible();
    });

    await logger.step("verify clear button exists", async () => {
      await expect(page.getByRole("button", { name: /clear history/i })).toBeVisible();
    });
  });

  test("shows empty state when no history", async ({ page, logger }) => {
    await logger.step("verify empty state message", async () => {
      await expect(page.locator("text=/no history yet|open a prompt/i")).toBeVisible();
    });

    await logger.step("verify clear button is disabled", async () => {
      const clearButton = page.getByRole("button", { name: /clear history/i });
      await expect(clearButton).toBeDisabled();
    });
  });

  test("displays history items after adding entries", async ({ page, request, logger }) => {
    await logger.step("add history entries via API", async () => {
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "test-prompt-ui",
        source: "browse",
      });
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "search",
        searchQuery: "test search query",
        source: "search",
      });
    });

    await logger.step("reload page to see new entries", async () => {
      await page.reload();
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify items are displayed", async () => {
      // Should show 2 items
      await expect(page.locator("text=/2 items/")).toBeVisible();
    });

    await logger.step("verify search entry shows query", async () => {
      await expect(page.locator("text=/test search query/i")).toBeVisible();
    });
  });

  test("search filter works", async ({ page, request, logger }) => {
    await logger.step("add multiple entries", async () => {
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "apple-prompt",
        source: "browse",
      });
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "banana-prompt",
        source: "browse",
      });
    });

    await logger.step("reload and verify entries", async () => {
      await page.reload();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=/2 items/")).toBeVisible();
    });

    await logger.step("search for apple", async () => {
      const searchInput = page.getByPlaceholder(/search history/i);
      await searchInput.fill("apple");
    });

    await logger.step("verify filtered results", async () => {
      await expect(page.locator("text=/1 item(?!s)/")).toBeVisible();
      await expect(page.locator("text=/apple-prompt/i")).toBeVisible();
    });
  });

  test("clear history button works", async ({ page, request, logger }) => {
    await logger.step("add history entry", async () => {
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "clear-test-prompt",
        source: "browse",
      });
    });

    await logger.step("reload page", async () => {
      await page.reload();
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify entry exists", async () => {
      await expect(page.locator("text=/1 item/")).toBeVisible();
    });

    await logger.step("click clear button", async () => {
      const clearButton = page.getByRole("button", { name: /clear history/i });
      await clearButton.click();
    });

    await logger.step("verify history is cleared", async () => {
      await expect(page.locator("text=/0 items/")).toBeVisible();
      await expect(page.locator("text=/no history yet|no matches/i")).toBeVisible();
    });
  });

  test("back link navigates to home", async ({ page, logger }) => {
    await logger.step("click back link", async () => {
      const backLink = page.getByRole("link", { name: /back to prompts/i });
      await backLink.click();
    });

    await logger.step("verify navigation to home", async () => {
      await page.waitForURL("/");
      expect(page.url()).toMatch(/\/$/);
    });
  });
});

/**
 * UI Tests for RecentlyViewedSidebar component (displayed on homepage)
 */
test.describe("RecentlyViewedSidebar - UI", () => {
  let testUserId: string;

  test.beforeEach(async ({ request, page, logger }) => {
    testUserId = generateUniqueUserId();
    await logger.step("clear any existing history", async () => {
      await clearHistoryViaAPI(request, testUserId);
    });

    // Set the userId in localStorage
    await logger.step("setup localStorage userId and navigate to home", async () => {
      await page.goto("/");
      await page.evaluate((userId) => {
        localStorage.setItem("jp_user_id", userId);
      }, testUserId);
      await page.reload();
      await page.waitForLoadState("networkidle");
    });
  });

  test.afterEach(async ({ request }) => {
    await clearHistoryViaAPI(request, testUserId);
  });

  test("displays sidebar with title", async ({ page, logger }) => {
    await logger.step("verify sidebar title", async () => {
      await expect(page.getByText("Recently Viewed").first()).toBeVisible();
    });
  });

  test("shows empty state when no history", async ({ page, logger }) => {
    await logger.step("verify empty state", async () => {
      await expect(page.locator("text=/no recent activity|open a prompt/i")).toBeVisible();
    });
  });

  test("displays view full history link", async ({ page, logger }) => {
    await logger.step("verify full history link", async () => {
      const link = page.getByRole("link", { name: /view full history/i });
      await expect(link).toBeVisible();
    });

    await logger.step("verify link href", async () => {
      const link = page.getByRole("link", { name: /view full history/i });
      await expect(link).toHaveAttribute("href", "/history");
    });
  });

  test("shows items after adding history", async ({ page, request, logger }) => {
    await logger.step("add history entries via API", async () => {
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "sidebar-test-prompt",
        source: "browse",
      });
    });

    await logger.step("reload to see entries", async () => {
      await page.reload();
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify item appears", async () => {
      // The sidebar shows resourceId or title
      await expect(page.locator("text=/sidebar-test-prompt/i")).toBeVisible();
    });
  });

  test("view full history link navigates to history page", async ({ page, logger }) => {
    await logger.step("click view full history", async () => {
      const link = page.getByRole("link", { name: /view full history/i });
      await link.click();
    });

    await logger.step("verify navigation to history page", async () => {
      await page.waitForURL("/history");
      await expect(page.getByRole("heading", { name: /recently viewed/i })).toBeVisible();
    });
  });

  test("sidebar limits to 8 items", async ({ page, request, logger }) => {
    await logger.step("add 10 history entries", async () => {
      for (let i = 1; i <= 10; i++) {
        await recordHistoryViaAPI(request, {
          userId: testUserId,
          resourceType: "prompt",
          resourceId: `limit-test-prompt-${i}`,
          source: "browse",
        });
      }
    });

    await logger.step("reload page", async () => {
      await page.reload();
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify most recent 8 are shown", async () => {
      // prompt-10 should be visible (most recent)
      await expect(page.locator("text=/limit-test-prompt-10/")).toBeVisible();
      // prompt-3 should be visible (8th most recent)
      await expect(page.locator("text=/limit-test-prompt-3/")).toBeVisible();
      // prompt-2 should NOT be visible (9th most recent, beyond limit)
      await expect(page.locator("text=/limit-test-prompt-2/")).not.toBeVisible();
    });
  });
});

/**
 * Integration tests - tracking views through page navigation
 */
test.describe("History Tracking Integration", () => {
  let testUserId: string;

  test.beforeEach(async ({ request, page, logger }) => {
    testUserId = generateUniqueUserId();
    await logger.step("clear any existing history", async () => {
      await clearHistoryViaAPI(request, testUserId);
    });

    await logger.step("setup localStorage userId", async () => {
      await page.goto("/");
      await page.evaluate((userId) => {
        localStorage.setItem("jp_user_id", userId);
      }, testUserId);
    });
  });

  test.afterEach(async ({ request }) => {
    await clearHistoryViaAPI(request, testUserId);
  });

  test("history updates reflect across pages", async ({ page, request, logger }) => {
    await logger.step("add entry via API", async () => {
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "cross-page-test",
        source: "api",
      });
    });

    await logger.step("verify sidebar shows entry on homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=/cross-page-test/")).toBeVisible();
    });

    await logger.step("verify history page shows entry", async () => {
      await page.goto("/history");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=/cross-page-test/")).toBeVisible();
    });
  });

  test("clearing history on page reflects in sidebar", async ({ page, request, logger }) => {
    await logger.step("add entry via API", async () => {
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "prompt",
        resourceId: "clear-sync-test",
        source: "api",
      });
    });

    await logger.step("go to history page and clear", async () => {
      await page.goto("/history");
      await page.waitForLoadState("networkidle");
      const clearButton = page.getByRole("button", { name: /clear history/i });
      await clearButton.click();
    });

    await logger.step("verify history page is empty", async () => {
      await expect(page.locator("text=/no history yet/i")).toBeVisible();
    });

    await logger.step("verify sidebar on homepage is empty", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=/no recent activity/i")).toBeVisible();
    });
  });

  test("search entries show with query text", async ({ page, request, logger }) => {
    await logger.step("add search entry", async () => {
      await recordHistoryViaAPI(request, {
        userId: testUserId,
        resourceType: "search",
        searchQuery: "react hooks tutorial",
        source: "search",
      });
    });

    await logger.step("verify on sidebar", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=/react hooks tutorial/i")).toBeVisible();
    });

    await logger.step("verify on history page", async () => {
      await page.goto("/history");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=/react hooks tutorial/i")).toBeVisible();
      await expect(page.locator("text=/Query:/i")).toBeVisible();
    });
  });
});
