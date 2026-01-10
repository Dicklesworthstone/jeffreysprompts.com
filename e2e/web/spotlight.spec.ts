import { test, expect } from "@playwright/test";

/**
 * SpotlightSearch E2E Tests
 *
 * Tests the Cmd+K spotlight search modal:
 * 1. Open with keyboard shortcut
 * 2. Type to search
 * 3. Navigate with arrow keys
 * 4. Select with Enter to copy
 * 5. Close with Escape
 */

test.describe("SpotlightSearch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("opens with Cmd+K keyboard shortcut", async ({ page }) => {
    // Press Cmd+K (or Ctrl+K on non-Mac)
    await page.keyboard.press("Meta+k");

    // Dialog should be visible
    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    await expect(dialog).toBeVisible({ timeout: 2000 });

    // Search input within dialog should be focused (use combobox role)
    const searchInput = dialog.getByRole("combobox");
    await expect(searchInput).toBeFocused();
  });

  test("opens with Ctrl+K on Windows/Linux", async ({ page }) => {
    // Press Ctrl+K
    await page.keyboard.press("Control+k");

    // Dialog should be visible
    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    await expect(dialog).toBeVisible({ timeout: 2000 });
  });

  test("closes with Escape key", async ({ page }) => {
    // Open spotlight
    await page.keyboard.press("Meta+k");

    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    await expect(dialog).toBeVisible();

    // Wait for input to be focused (Escape handler is on the input)
    const searchInput = dialog.getByRole("combobox");
    await expect(searchInput).toBeFocused();

    // Press Escape to close
    await page.keyboard.press("Escape");

    // Dialog should be hidden (allow time for close animation)
    await expect(dialog).not.toBeVisible({ timeout: 2000 });
  });

  test("closes when clicking backdrop", async ({ page }) => {
    // Open spotlight
    await page.keyboard.press("Meta+k");

    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    await expect(dialog).toBeVisible();

    // Click outside dialog (on backdrop)
    await page.locator("body").click({ position: { x: 10, y: 10 } });

    // Dialog should be hidden
    await expect(dialog).not.toBeVisible();
  });

  test("typing shows search results", async ({ page }) => {
    // Open spotlight
    await page.keyboard.press("Meta+k");

    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    await expect(dialog).toBeVisible();

    // Get search input within dialog (use combobox role to distinguish from page search)
    const searchInput = dialog.getByRole("combobox");
    await expect(searchInput).toBeFocused();

    // Type search query
    await searchInput.fill("wizard");

    // Wait for debounced search
    await page.waitForTimeout(300);

    // Results should appear within dialog
    const resultsList = dialog.locator("#spotlight-results");
    await expect(resultsList).toBeVisible();

    // Should find idea-wizard
    const ideaWizardResult = dialog.getByText("The Idea Wizard");
    await expect(ideaWizardResult).toBeVisible({ timeout: 2000 });
  });

  test("arrow keys navigate results", async ({ page }) => {
    // Open spotlight
    await page.keyboard.press("Meta+k");

    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    const searchInput = dialog.getByRole("combobox");
    await searchInput.fill("idea");

    // Wait for results
    await page.waitForTimeout(300);

    // Get all result options
    const options = dialog.locator('[role="option"]');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1); // Need at least 2 results to test navigation

    // First item should be selected initially (index 0)
    await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");

    // Press ArrowDown to navigate to second item
    await page.keyboard.press("ArrowDown");

    // Second item should now be selected
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  });

  test("Enter key copies selected prompt", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Open spotlight
    await page.keyboard.press("Meta+k");

    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    const searchInput = dialog.getByRole("combobox");
    await searchInput.fill("idea wizard");

    // Wait for results
    await page.waitForTimeout(300);

    // Press Enter to select and copy
    await page.keyboard.press("Enter");

    // Should show "Copied!" feedback (first match - could be toast or inline text)
    await expect(page.getByText(/copied/i).first()).toBeVisible({ timeout: 2000 });
  });

  test("shows 'No results' for empty search", async ({ page }) => {
    // Open spotlight
    await page.keyboard.press("Meta+k");

    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    const searchInput = dialog.getByRole("combobox");
    await searchInput.fill("xyznonexistent123456789");

    // Wait for debounced search
    await page.waitForTimeout(300);

    // Should show no results message within dialog
    await expect(dialog.getByText(/no results/i)).toBeVisible();
  });

  test("clicking result item selects it", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Open spotlight
    await page.keyboard.press("Meta+k");

    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    const searchInput = dialog.getByRole("combobox");
    await searchInput.fill("wizard");

    // Wait for results
    await page.waitForTimeout(300);

    // Click on a result within the dialog
    const resultItem = dialog.locator("[data-result-item]").first();
    await resultItem.click();

    // Should show "Copied!" feedback
    await expect(page.getByText(/copied/i).first()).toBeVisible({ timeout: 2000 });
  });
});

test.describe("SpotlightSearch Accessibility", () => {
  test("has proper ARIA attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open spotlight
    await page.keyboard.press("Meta+k");

    // Check dialog role and label
    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    // Check combobox role on input within dialog
    const searchInput = dialog.getByRole("combobox");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("aria-autocomplete", "list");
  });

  test("listbox has proper structure", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Meta+k");

    const dialog = page.getByRole("dialog", { name: /search prompts/i });
    await expect(dialog).toBeVisible({ timeout: 2000 });

    const searchInput = dialog.getByRole("combobox");
    await searchInput.fill("wizard");
    await page.waitForTimeout(300);

    // Results list should have listbox role within dialog
    const listbox = dialog.getByRole("listbox");
    await expect(listbox).toBeVisible();

    // Each result should have option role
    const options = dialog.locator('[role="option"]');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });
});
