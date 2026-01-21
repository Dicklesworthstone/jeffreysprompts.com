import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Helper functions for Admin Dashboard E2E tests
 *
 * Admin API endpoints:
 * - GET /api/admin/stats - Dashboard statistics
 * - GET /api/admin/users - User management
 * - GET /api/admin/reports - Moderation queue
 * - PUT /api/admin/reports - Take action on report
 * - POST /api/admin/moderation/bulk-action - Bulk moderation actions
 * - GET /api/admin/featured - Featured content
 * - GET /api/admin/appeals - User appeals
 */

// Navigation helpers

export async function gotoAdminDashboard(page: Page): Promise<void> {
  await page.goto("/admin", { waitUntil: "networkidle", timeout: 60000 });
}

export async function gotoAdminUsers(page: Page): Promise<void> {
  await page.goto("/admin/users", { waitUntil: "networkidle", timeout: 60000 });
}

export async function gotoAdminModeration(page: Page): Promise<void> {
  await page.goto("/admin/moderation", { waitUntil: "networkidle", timeout: 60000 });
}

export async function gotoAdminSettings(page: Page): Promise<void> {
  await page.goto("/admin/settings", { waitUntil: "networkidle", timeout: 60000 });
}

export async function gotoAdminFeatured(page: Page): Promise<void> {
  await page.goto("/admin/featured", { waitUntil: "networkidle", timeout: 60000 });
}

export async function gotoAdminDmca(page: Page): Promise<void> {
  await page.goto("/admin/dmca", { waitUntil: "networkidle", timeout: 60000 });
}

export async function gotoAdminAppeals(page: Page): Promise<void> {
  await page.goto("/admin/appeals", { waitUntil: "networkidle", timeout: 60000 });
}

export async function gotoAdminTickets(page: Page): Promise<void> {
  await page.goto("/admin/tickets", { waitUntil: "networkidle", timeout: 60000 });
}

// Feature detection

export async function isAdminDashboardAvailable(page: Page): Promise<boolean> {
  const dashboardTitle = page.locator("h1:has-text('Dashboard')");
  const adminShield = page.locator("[data-testid='admin-shield']").or(
    page.locator("text=Admin")
  );

  const [hasDashboard, hasAdmin] = await Promise.all([
    dashboardTitle.isVisible().catch(() => false),
    adminShield.isVisible().catch(() => false),
  ]);

  return hasDashboard || hasAdmin;
}

export async function isAdminAccessDenied(page: Page): Promise<boolean> {
  const accessDenied = page.locator("text=/access denied|unauthorized|forbidden|not authorized/i");
  const loginPrompt = page.locator("text=/sign in|log in|login required/i");

  const [hasDenied, hasLoginPrompt] = await Promise.all([
    accessDenied.isVisible().catch(() => false),
    loginPrompt.isVisible().catch(() => false),
  ]);

  return hasDenied || hasLoginPrompt;
}

// Dashboard selectors

export function getDashboardTitle(page: Page): Locator {
  return page.locator("h1").filter({ hasText: "Dashboard" });
}

export function getStatCard(page: Page, label: string): Locator {
  return page.locator("[data-testid='stat-card']").filter({ hasText: label }).or(
    page.locator(".space-y-8 [class*='Card']").filter({ hasText: label })
  );
}

export function getTotalUsersCard(page: Page): Locator {
  return getStatCard(page, "Total Users");
}

export function getActiveSubscribersCard(page: Page): Locator {
  return getStatCard(page, "Active Subscribers");
}

export function getTotalContentCard(page: Page): Locator {
  return getStatCard(page, "Total Content");
}

export function getPendingModerationCard(page: Page): Locator {
  return getStatCard(page, "Pending Moderation");
}

export function getRecentActivitySection(page: Page): Locator {
  return page.locator("[data-testid='recent-activity']").or(
    page.locator("text=Recent Activity").locator("xpath=ancestor::*[contains(@class, 'Card')]")
  );
}

export function getQuickActionsSection(page: Page): Locator {
  return page.locator("[data-testid='quick-actions']").or(
    page.locator("text=Quick Actions").locator("xpath=ancestor::*[contains(@class, 'Card')]")
  );
}

// Sidebar navigation

export function getAdminSidebar(page: Page): Locator {
  return page.locator("aside").or(page.locator("[data-testid='admin-sidebar']"));
}

export function getAdminNavLink(page: Page, label: string): Locator {
  return page.locator(`a[href^='/admin']`).filter({ hasText: label });
}

// User management selectors

export function getUsersTable(page: Page): Locator {
  return page.locator("[data-testid='users-table']").or(
    page.locator("table, [role='table']")
  );
}

export function getUserRow(page: Page, identifier: string): Locator {
  return page.locator("tr, [role='row']").filter({ hasText: identifier });
}

export function getUserSearchInput(page: Page): Locator {
  return page.locator("[data-testid='user-search']").or(
    page.getByPlaceholder(/search.*users?/i)
  );
}

export function getUserTierFilter(page: Page): Locator {
  return page.locator("[data-testid='tier-filter']").or(
    page.getByRole("combobox", { name: /tier|plan/i })
  );
}

export function getUserStatusFilter(page: Page): Locator {
  return page.locator("[data-testid='status-filter']").or(
    page.getByRole("combobox", { name: /status/i })
  );
}

export function getSuspendUserButton(page: Page): Locator {
  return page.getByRole("button", { name: /suspend/i });
}

export function getUnsuspendUserButton(page: Page): Locator {
  return page.getByRole("button", { name: /unsuspend|reactivate/i });
}

export function getDeleteUserButton(page: Page): Locator {
  return page.getByRole("button", { name: /delete/i });
}

export function getImpersonateButton(page: Page): Locator {
  return page.getByRole("button", { name: /impersonate/i });
}

// Moderation selectors

export function getModerationTitle(page: Page): Locator {
  return page.locator("h1").filter({ hasText: "Content Moderation" });
}

export function getModerationStatsRow(page: Page): Locator {
  return page.locator("[data-testid='moderation-stats']").or(
    page.locator(".grid.gap-4").first()
  );
}

export function getPendingReviewStat(page: Page): Locator {
  return page.locator("text=Pending Review").locator("xpath=ancestor::*[contains(@class, 'Card')]");
}

export function getModerationFilterBar(page: Page): Locator {
  return page.locator("[data-testid='filter-bar']").or(
    page.locator("select").first().locator("xpath=ancestor::*[contains(@class, 'Card')]")
  );
}

export function getModerationStatusFilter(page: Page): Locator {
  return page.locator("select").filter({ has: page.locator("option[value='pending']") }).first();
}

export function getModerationContentTypeFilter(page: Page): Locator {
  return page.locator("select").filter({ has: page.locator("option[value='prompt']") });
}

export function getModerationReasonFilter(page: Page): Locator {
  return page.locator("select").filter({ has: page.locator("option[value='spam']") });
}

export function getModerationPriorityFilter(page: Page): Locator {
  return page.locator("select").filter({ has: page.locator("option[value='critical']") });
}

export function getReportCards(page: Page): Locator {
  return page.locator("[data-testid='report-card']").or(
    page.locator("[class*='Card']").filter({ has: page.locator("text=Reported by") })
  );
}

export function getReportCardByTitle(page: Page, title: string): Locator {
  return getReportCards(page).filter({ hasText: title });
}

export function getRefreshButton(page: Page): Locator {
  return page.getByRole("button", { name: /refresh/i });
}

export function getDismissButton(card: Locator): Locator {
  return card.getByRole("button", { name: /dismiss/i });
}

export function getWarnButton(card: Locator): Locator {
  return card.getByRole("button", { name: /warn/i });
}

export function getRemoveButton(card: Locator): Locator {
  return card.getByRole("button", { name: /remove/i });
}

export function getViewContentButton(card: Locator): Locator {
  return card.getByRole("button", { name: /view content/i });
}

export function getBulkActionToolbar(page: Page): Locator {
  return page.locator("[data-testid='bulk-actions']").or(
    page.locator("text=/selected/i").locator("xpath=ancestor::*[contains(@class, 'Card')]")
  );
}

export function getSelectAllCheckbox(page: Page): Locator {
  return page.locator("[data-testid='select-all']").or(
    page.locator("button").filter({ has: page.locator("svg[class*='Square']") }).first()
  );
}

export function getBulkDismissButton(page: Page): Locator {
  return getBulkActionToolbar(page).getByRole("button", { name: /dismiss all/i });
}

export function getBulkWarnButton(page: Page): Locator {
  return getBulkActionToolbar(page).getByRole("button", { name: /warn all/i });
}

export function getBulkRemoveButton(page: Page): Locator {
  return getBulkActionToolbar(page).getByRole("button", { name: /remove all/i });
}

export function getEmptyModerationState(page: Page): Locator {
  return page.locator("text=/all caught up|no pending|nothing to review/i");
}

// Featured content selectors

export function getFeaturedContentList(page: Page): Locator {
  return page.locator("[data-testid='featured-list']").or(
    page.locator("ul, ol").filter({ has: page.locator("[data-testid='featured-item']") })
  );
}

export function getMarkFeaturedButton(page: Page): Locator {
  return page.getByRole("button", { name: /mark.*featured|add to featured/i });
}

export function getRemoveFeaturedButton(page: Page): Locator {
  return page.getByRole("button", { name: /remove.*featured|unfeature/i });
}

export function getPromptOfTheDaySection(page: Page): Locator {
  return page.locator("[data-testid='prompt-of-the-day']").or(
    page.locator("text=/prompt of the day/i").locator("xpath=ancestor::section|ancestor::div")
  );
}

// Settings selectors

export function getSettingsTitle(page: Page): Locator {
  return page.locator("h1").filter({ hasText: "Settings" });
}

export function getMaintenanceModeToggle(page: Page): Locator {
  return page.locator("[data-testid='maintenance-toggle']").or(
    page.getByRole("switch", { name: /maintenance/i })
  );
}

export function getFeatureFlagsSection(page: Page): Locator {
  return page.locator("[data-testid='feature-flags']").or(
    page.locator("text=/feature flags/i").locator("xpath=ancestor::section|ancestor::div")
  );
}

export function getAnnouncementSection(page: Page): Locator {
  return page.locator("[data-testid='announcements']").or(
    page.locator("text=/announcement/i").locator("xpath=ancestor::section|ancestor::div")
  );
}

// Appeals selectors

export function getAppealsQueue(page: Page): Locator {
  return page.locator("[data-testid='appeals-queue']").or(
    page.locator("text=/appeals?/i").locator("xpath=ancestor::*[contains(@class, 'Card')]")
  );
}

export function getAppealCard(page: Page, identifier: string): Locator {
  return page.locator("[data-testid='appeal-card']").filter({ hasText: identifier }).or(
    page.locator("[class*='Card']").filter({ hasText: identifier })
  );
}

export function getApproveAppealButton(card: Locator): Locator {
  return card.getByRole("button", { name: /approve|grant/i });
}

export function getDenyAppealButton(card: Locator): Locator {
  return card.getByRole("button", { name: /deny|reject/i });
}

// Action helpers

export async function searchUsers(page: Page, query: string): Promise<void> {
  const searchInput = getUserSearchInput(page);
  await searchInput.fill(query);
  await searchInput.press("Enter");
  await page.waitForLoadState("networkidle");
}

export async function filterModerationByStatus(page: Page, status: string): Promise<void> {
  const statusFilter = getModerationStatusFilter(page);
  await statusFilter.selectOption(status);
  await page.waitForTimeout(500); // Wait for filter to apply
}

export async function filterModerationByContentType(page: Page, type: string): Promise<void> {
  const typeFilter = getModerationContentTypeFilter(page);
  await typeFilter.selectOption(type);
  await page.waitForTimeout(500);
}

export async function dismissReport(page: Page, reportTitle: string): Promise<void> {
  const card = getReportCardByTitle(page, reportTitle);
  const dismissBtn = getDismissButton(card);
  await dismissBtn.click();
  await page.waitForLoadState("networkidle");
}

export async function warnReportCreator(page: Page, reportTitle: string): Promise<void> {
  const card = getReportCardByTitle(page, reportTitle);
  const warnBtn = getWarnButton(card);
  await warnBtn.click();
  await page.waitForLoadState("networkidle");
}

export async function removeReportedContent(page: Page, reportTitle: string): Promise<void> {
  const card = getReportCardByTitle(page, reportTitle);
  const removeBtn = getRemoveButton(card);
  await removeBtn.click();
  // Handle confirmation if present
  const confirmBtn = page.getByRole("button", { name: /confirm/i });
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click();
  }
  await page.waitForLoadState("networkidle");
}

export async function selectAllPendingReports(page: Page): Promise<void> {
  const selectAllBtn = getSelectAllCheckbox(page);
  await selectAllBtn.click();
}

export async function performBulkAction(page: Page, action: "dismiss" | "warn" | "remove"): Promise<void> {
  let btn: Locator;
  switch (action) {
    case "dismiss":
      btn = getBulkDismissButton(page);
      break;
    case "warn":
      btn = getBulkWarnButton(page);
      break;
    case "remove":
      btn = getBulkRemoveButton(page);
      break;
  }
  await btn.click();
  // Handle confirmation
  const confirmBtn = page.getByRole("button", { name: /confirm/i });
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click();
  }
  await page.waitForLoadState("networkidle");
}

export async function toggleMaintenanceMode(page: Page): Promise<void> {
  const toggle = getMaintenanceModeToggle(page);
  await toggle.click();
  await page.waitForLoadState("networkidle");
}

// Assertion helpers

export async function assertAdminAccessGranted(page: Page): Promise<void> {
  const isAvailable = await isAdminDashboardAvailable(page);
  const isDenied = await isAdminAccessDenied(page);
  expect(isAvailable).toBeTruthy();
  expect(isDenied).toBeFalsy();
}

export async function assertAdminAccessDenied(page: Page): Promise<void> {
  const isDenied = await isAdminAccessDenied(page);
  expect(isDenied).toBeTruthy();
}

export async function assertStatCardValue(page: Page, label: string, expectedValue: string | number): Promise<void> {
  const card = getStatCard(page, label);
  await expect(card).toContainText(expectedValue.toString());
}

export async function assertReportCount(page: Page, minCount: number): Promise<void> {
  const reports = getReportCards(page);
  const count = await reports.count();
  expect(count).toBeGreaterThanOrEqual(minCount);
}

export async function assertNoReports(page: Page): Promise<void> {
  const emptyState = getEmptyModerationState(page);
  await expect(emptyState).toBeVisible();
}

export async function assertUserInList(page: Page, identifier: string): Promise<void> {
  const userRow = getUserRow(page, identifier);
  await expect(userRow).toBeVisible();
}

export async function assertBulkActionToolbarVisible(page: Page): Promise<void> {
  const toolbar = getBulkActionToolbar(page);
  await expect(toolbar).toBeVisible();
}

// Utility functions

export function generateTestReportTitle(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `Test Report ${timestamp}_${random}`;
}

export async function waitForModerationUpdate(page: Page, timeout: number = 5000): Promise<void> {
  const startTime = Date.now();
  const initialCount = await getReportCards(page).count();

  while (Date.now() - startTime < timeout) {
    await page.waitForTimeout(500);
    const currentCount = await getReportCards(page).count();
    if (currentCount !== initialCount) {
      return;
    }
  }
}
