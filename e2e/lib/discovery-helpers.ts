import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Helper functions for Discovery & Trending E2E tests
 */

// Navigation helpers

export async function gotoSwapMeet(page: Page): Promise<void> {
  await page.goto("/swap-meet", { waitUntil: "networkidle", timeout: 60000 });
  await expect(page.getByRole("heading", { level: 1, name: "Swap Meet" })).toBeVisible();
}

export async function gotoSwapMeetWithSort(page: Page, sortOption: string): Promise<void> {
  await gotoSwapMeet(page);
  await selectSortOption(page, sortOption);
}

// Sort selectors and actions

export function getSortDropdown(page: Page): Locator {
  return page.getByRole("combobox").first();
}

export function getSortDropdownValue(page: Page): Locator {
  return getSortDropdown(page).locator("[data-slot='value']").or(
    getSortDropdown(page)
  );
}

export async function selectSortOption(page: Page, option: string): Promise<void> {
  const dropdown = getSortDropdown(page);
  await dropdown.click();
  // Wait for dropdown to open
  await page.waitForTimeout(100);
  // Use role="option" to target only dropdown listbox items, not the trigger button
  await page.getByRole("option", { name: option, exact: true }).click();
}

export async function getCurrentSortOption(page: Page): Promise<string | null> {
  const dropdown = getSortDropdown(page);
  return await dropdown.textContent();
}

// Prompt card selectors

export function getPromptCards(page: Page): Locator {
  return page.locator("[data-testid='community-prompt-card']");
}

export function getPromptCardTitles(page: Page): Locator {
  return getPromptCards(page).locator("h3");
}

export function getFirstPromptCard(page: Page): Locator {
  return getPromptCards(page).first();
}

export function getPromptCardByIndex(page: Page, index: number): Locator {
  return getPromptCards(page).nth(index);
}

// Rating selectors on cards

export function getCardRating(card: Locator): Locator {
  return card.locator("text=/\\d\\.\\d/").first();
}

export function getCardViews(card: Locator): Locator {
  // Views are shown next to eye icon or in stats section
  return card.locator(".flex.items-center.gap-1").first();
}

// Category filter selectors

export function getCategoryButtons(page: Page): Locator {
  return page.locator("button").filter({ hasText: /All Categories|Ideation|Documentation|Automation|Refactoring|Testing|Debugging/i });
}

export async function selectCategory(page: Page, category: string): Promise<void> {
  const categoryButton = page.getByRole("button", { name: category, exact: true });
  await categoryButton.click();
}

// Featured section

export function getFeaturedSection(page: Page): Locator {
  return page.locator("text=Editor's Picks").locator("xpath=ancestor::section");
}

export function getFeaturedPromptCards(page: Page): Locator {
  const section = getFeaturedSection(page);
  return section.locator("[data-testid='community-prompt-card']");
}

// Results count

export function getResultsCount(page: Page): Locator {
  return page.locator("text=/Showing \\d+ prompts/i");
}

export async function readResultsCount(page: Page): Promise<number | null> {
  const text = await getResultsCount(page).textContent();
  if (!text) return null;
  const match = text.match(/Showing\s+(\d+)\s+prompts/i);
  return match ? Number(match[1]) : null;
}

// Assertion helpers

export async function assertSortOptionSelected(page: Page, expected: string): Promise<void> {
  const dropdown = getSortDropdown(page);
  await expect(dropdown).toContainText(expected);
}

export async function assertPromptsDisplayed(page: Page, minCount = 1): Promise<void> {
  const cards = getPromptCards(page);
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(minCount);
}

export async function assertPromptCardHasRating(card: Locator): Promise<void> {
  const rating = getCardRating(card);
  await expect(rating).toBeVisible();
  const text = await rating.textContent();
  expect(text).toMatch(/^\d\.\d$/);
}

export async function assertTrendingSortWorks(page: Page): Promise<void> {
  // After selecting trending sort, verify cards are displayed
  await selectSortOption(page, "Trending");
  await page.waitForTimeout(300); // Wait for re-sort

  const cards = getPromptCards(page);
  await expect(cards.first()).toBeVisible();

  // Verify at least 2 cards are displayed
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(2);
}

// Utility functions

export async function getPromptTitlesInOrder(page: Page): Promise<string[]> {
  const titles = getPromptCardTitles(page);
  const count = await titles.count();
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    const text = await titles.nth(i).textContent();
    if (text) result.push(text.trim());
  }

  return result;
}

export async function getPromptRatingsInOrder(page: Page): Promise<number[]> {
  const cards = getPromptCards(page);
  const count = await cards.count();
  const result: number[] = [];

  for (let i = 0; i < count; i++) {
    const ratingText = await getCardRating(cards.nth(i)).textContent();
    if (ratingText) {
      const rating = parseFloat(ratingText);
      if (!isNaN(rating)) result.push(rating);
    }
  }

  return result;
}
