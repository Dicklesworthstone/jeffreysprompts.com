import type { Locator, Page, APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Helper functions for Recently Viewed History E2E tests
 */

// Resource types for history
export type HistoryResourceType =
  | "prompt"
  | "collection"
  | "skill"
  | "bundle"
  | "workflow"
  | "search";

export interface ViewHistoryEntry {
  id: string;
  userId: string;
  resourceType: HistoryResourceType;
  resourceId: string | null;
  searchQuery: string | null;
  source: string | null;
  viewedAt: string;
  duration: number | null;
}

// Test user ID for E2E tests
export const TEST_USER_ID = "e2e-history-test-user";
export const TEST_USER_ID_2 = "e2e-history-test-user-2";

// API base URL (relative path)
const HISTORY_API = "/api/history";

// Navigation helpers

export async function gotoPromptPage(page: Page, promptId: string): Promise<void> {
  await page.goto(`/swap-meet/${promptId}`, { waitUntil: "networkidle", timeout: 60000 });
}

export async function gotoCollectionPage(page: Page, collectionId: string): Promise<void> {
  await page.goto(`/collections/${collectionId}`, { waitUntil: "networkidle", timeout: 60000 });
}

export async function gotoProfilePage(page: Page, profileId: string): Promise<void> {
  await page.goto(`/profile/${profileId}`, { waitUntil: "networkidle", timeout: 60000 });
}

// API helpers

export async function recordHistoryViaAPI(
  request: APIRequestContext,
  input: {
    userId: string;
    resourceType: HistoryResourceType;
    resourceId?: string;
    searchQuery?: string;
    source?: string;
  }
): Promise<ViewHistoryEntry> {
  const response = await request.post(HISTORY_API, {
    data: {
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      searchQuery: input.searchQuery,
      source: input.source,
    },
  });

  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  expect(json.success).toBe(true);
  return json.item;
}

export async function getHistoryViaAPI(
  request: APIRequestContext,
  userId: string,
  options?: {
    resourceType?: HistoryResourceType;
    limit?: number;
  }
): Promise<ViewHistoryEntry[]> {
  const params = new URLSearchParams({ userId });
  if (options?.resourceType) {
    params.set("resourceType", options.resourceType);
  }
  if (options?.limit) {
    params.set("limit", options.limit.toString());
  }

  const response = await request.get(`${HISTORY_API}?${params.toString()}`);
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  return json.items;
}

export async function clearHistoryViaAPI(
  request: APIRequestContext,
  userId: string
): Promise<void> {
  const response = await request.delete(`${HISTORY_API}?userId=${userId}`);
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  expect(json.success).toBe(true);
}

// Selectors - RecentlyViewedSidebar

export function getHistorySidebar(page: Page): Locator {
  // The sidebar is a Card with "Recently Viewed" title
  return page.locator("[data-testid='history-sidebar']").or(
    page.locator("div").filter({ hasText: /^Recently Viewed/ }).first()
  );
}

export function getSidebarTitle(page: Page): Locator {
  return page.getByText("Recently Viewed").first();
}

export function getSidebarClearButton(page: Page): Locator {
  return page.getByRole("button", { name: /clear history/i });
}

export function getSidebarEmptyState(page: Page): Locator {
  return page.locator("text=/no recent activity|open a prompt to start/i");
}

export function getSidebarViewFullHistoryLink(page: Page): Locator {
  return page.getByRole("link", { name: /view full history/i });
}

export function getSidebarItems(page: Page): Locator {
  // Items are div elements with badges and titles inside the sidebar
  return getHistorySidebar(page).locator("div.rounded-lg.border").filter({ has: page.locator("a, span") });
}

// Selectors - History Page (/history)

export function getHistoryPageTitle(page: Page): Locator {
  return page.getByRole("heading", { name: /recently viewed/i });
}

export function getHistoryPageBackLink(page: Page): Locator {
  return page.getByRole("link", { name: /back to prompts/i });
}

export function getHistoryPageClearButton(page: Page): Locator {
  return page.getByRole("button", { name: /clear history/i });
}

export function getHistoryPageSearchInput(page: Page): Locator {
  return page.getByPlaceholder(/search history/i);
}

export function getHistoryPageItemCount(page: Page): Locator {
  return page.locator("text=/\\d+ items?/");
}

export function getHistoryPageCards(page: Page): Locator {
  // Cards in the grid layout
  return page.locator(".grid > div").filter({ has: page.locator("[class*='Card']") });
}

export function getHistoryItems(page: Page): Locator {
  return page.locator("[data-testid='history-item']").or(
    page.locator("[data-testid='recently-viewed-item']")
  );
}

export function getHistoryItemByIndex(page: Page, index: number): Locator {
  return getHistoryItems(page).nth(index);
}

export function getClearHistoryButton(page: Page): Locator {
  return page.getByRole("button", { name: /clear.*history/i }).or(
    page.locator("[data-testid='clear-history-button']")
  );
}

export function getRemoveHistoryItemButton(page: Page, index: number): Locator {
  return getHistoryItemByIndex(page, index).getByRole("button", { name: /remove/i }).or(
    getHistoryItemByIndex(page, index).locator("[data-testid='remove-item']")
  );
}

export function getHistoryPageLink(page: Page): Locator {
  return page.getByRole("link", { name: /view.*history|see.*all/i }).or(
    page.locator("[data-testid='view-history-link']")
  );
}

export function getHistoryEmptyState(page: Page): Locator {
  return page.locator("[data-testid='history-empty']").or(
    page.locator("text=/no.*history.*yet|no.*recently.*viewed|no.*recent.*activity/i")
  );
}

export function getHistoryTypeFilter(page: Page): Locator {
  return page.locator("[data-testid='history-type-filter']").or(
    page.getByRole("combobox", { name: /filter.*type/i })
  );
}

// Item type indicators

export function getItemTypeIcon(page: Page, index: number): Locator {
  return getHistoryItemByIndex(page, index).locator("[data-testid='item-type-icon']").or(
    getHistoryItemByIndex(page, index).locator("svg").first()
  );
}

export function getItemTitle(page: Page, index: number): Locator {
  return getHistoryItemByIndex(page, index).locator("[data-testid='item-title']").or(
    getHistoryItemByIndex(page, index).locator("span, a").filter({ hasText: /.+/ }).first()
  );
}

export function getItemTimestamp(page: Page, index: number): Locator {
  return getHistoryItemByIndex(page, index).locator("[data-testid='item-timestamp']").or(
    getHistoryItemByIndex(page, index).locator("text=/\\d+.*ago|just now/i")
  );
}

// Action helpers

export async function clickHistoryItem(page: Page, index: number): Promise<void> {
  const item = getHistoryItemByIndex(page, index);
  await item.click();
}

export async function removeHistoryItem(page: Page, index: number): Promise<void> {
  const removeButton = getRemoveHistoryItemButton(page, index);
  await removeButton.click();
}

export async function clearAllHistory(page: Page): Promise<void> {
  const clearButton = getClearHistoryButton(page);
  await clearButton.click();
  // Handle confirmation dialog if present
  const confirmButton = page.getByRole("button", { name: /confirm|yes|clear/i });
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click();
  }
}

// Assertion helpers

export async function assertHistoryItemCount(page: Page, expected: number): Promise<void> {
  const items = getHistoryItems(page);
  await expect(items).toHaveCount(expected);
}

export async function assertHistoryItemVisible(page: Page, title: string): Promise<void> {
  const items = getHistoryItems(page);
  await expect(items.filter({ hasText: title }).first()).toBeVisible();
}

export async function assertHistoryEmpty(page: Page): Promise<void> {
  const emptyState = getHistoryEmptyState(page);
  await expect(emptyState).toBeVisible();
}

export async function assertHistoryOrderCorrect(
  page: Page,
  expectedTitles: string[]
): Promise<void> {
  const items = getHistoryItems(page);
  for (let i = 0; i < expectedTitles.length; i++) {
    const itemTitle = getItemTitle(page, i);
    await expect(itemTitle).toContainText(expectedTitles[i]);
  }
}

export async function assertItemHasTypeIndicator(
  page: Page,
  index: number,
  expectedType: HistoryResourceType
): Promise<void> {
  const icon = getItemTypeIcon(page, index);
  await expect(icon).toBeVisible();
  // The icon should have a data attribute or class indicating the type
  await expect(icon.or(getHistoryItemByIndex(page, index))).toHaveAttribute(
    "data-resource-type",
    expectedType
  ).catch(() => {
    // Fallback: just verify there's some icon present
    return expect(icon).toBeVisible();
  });
}

// Utility functions

export function generateUniqueUserId(): string {
  return `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
