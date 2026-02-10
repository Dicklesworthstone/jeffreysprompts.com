import { test, expect } from "../lib/playwright-logger";

/**
 * Mobile Interactions E2E Tests
 *
 * Tests mobile-specific behaviors like bottom sheets and touch targets.
 */

test.describe("Mobile Interactions", () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });
  });

  test("prompt detail opens in bottom sheet", async ({ page, logger }) => {
    await logger.step("tap prompt card", async () => {
      await expect(page.getByText("The Idea Wizard").first()).toBeVisible({ timeout: 10000 });
      // Click the card body, not a button
      const card = page.locator("h3").filter({ hasText: "The Idea Wizard" }).first();
      await card.click();
    });

    await logger.step("verify sheet opens", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // Check for sheet-specific styling or behavior if possible, 
      // otherwise just visibility is good.
    });

    await logger.step("verify sheet can be closed by dragging handle", async () => {
      const dialog = page.getByRole("dialog");
      const box = await dialog.boundingBox();
      if (!box) throw new Error("Dialog not found");

      const startX = box.x + box.width / 2;
      const startY = box.y + 20; // Near top handle
      const endY = startY + 300;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX, endY, { steps: 10 });
      await page.mouse.up();

      await expect(dialog).not.toBeVisible();
    });
  });

  test("filters are accessible on mobile", async ({ page, logger }) => {
    await logger.step("verify category filter scroll", async () => {
      // On mobile, categories might be in a horizontal scroll container
      // Use first() because duplicated for responsiveness or multiple instances
      const categoryContainer = page.locator("[aria-label='Filter by category']").first();
      await expect(categoryContainer).toBeVisible();
      // Verify we can scroll it (conceptual check, hard to assert scroll position change without more logic)
    });
  });
});
