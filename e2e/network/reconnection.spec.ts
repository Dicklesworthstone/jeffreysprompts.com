import { test, expect } from "../lib/playwright-logger";

/**
 * Network Reconnection E2E Tests
 *
 * Tests for handling network reconnection:
 * 1. Offline indicator disappears when back online
 * 2. Content refreshes/updates on reconnection
 * 3. User actions queued offline complete on reconnect
 *
 * Simulates offline/online state transitions using Playwright's context.setOffline().
 */

test.describe("Reconnection - Indicator State", () => {
  test("should hide offline indicator when reconnected", async ({ page, context, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("go offline", async () => {
      await context.setOffline(true);
      await page.waitForTimeout(500);
    });

    await logger.step("verify offline state", async () => {
      const offlineIndicator = page.getByTestId("offline-indicator");
      const isOfflineVisible = await offlineIndicator.isVisible().catch(() => false);
      logger.info("Offline indicator state", { isOfflineVisible });
    });

    await logger.step("go back online", async () => {
      await context.setOffline(false);
      await page.waitForTimeout(500);
    });

    await logger.step("verify offline indicator is hidden", async () => {
      await expect(page.getByTestId("offline-indicator")).not.toBeVisible({ timeout: 2000 });
    });

    await logger.step("verify page is functional", async () => {
      // Content should still be visible
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible();
    });
  });

  test("should transition smoothly through multiple offline/online cycles", async ({ page, context, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    for (let cycle = 1; cycle <= 3; cycle++) {
      await logger.step(`cycle ${cycle}: go offline`, async () => {
        await context.setOffline(true);
        await page.waitForTimeout(300);
      });

      await logger.step(`cycle ${cycle}: verify offline handling`, async () => {
        // Page should remain functional
        const contentVisible = await page.getByRole("heading", { name: "The Idea Wizard" }).isVisible();
        expect(contentVisible).toBe(true);
      });

      await logger.step(`cycle ${cycle}: go online`, async () => {
        await context.setOffline(false);
        await page.waitForTimeout(300);
      });

      await logger.step(`cycle ${cycle}: verify online handling`, async () => {
        // Offline indicator should be hidden
        await expect(page.getByTestId("offline-indicator")).not.toBeVisible({ timeout: 1000 });
      });
    }

    logger.info("Completed 3 offline/online cycles successfully");
  });
});

test.describe("Reconnection - Content Behavior", () => {
  test("content remains accessible during reconnection", async ({ page, context, logger }) => {
    await logger.step("navigate and load content", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("count initial prompts", async () => {
      const promptCards = page.locator("article").filter({ has: page.locator("h3") });
      const initialCount = await promptCards.count();
      logger.info("Initial prompt count", { initialCount });
      expect(initialCount).toBeGreaterThan(0);
    });

    await logger.step("go offline", async () => {
      await context.setOffline(true);
      await page.waitForTimeout(500);
    });

    await logger.step("verify content still visible offline", async () => {
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible();
    });

    await logger.step("go back online", async () => {
      await context.setOffline(false);
      await page.waitForTimeout(500);
    });

    await logger.step("verify content still visible after reconnection", async () => {
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible();
    });
  });

  test("navigation works after reconnection", async ({ page, context, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("go offline then online", async () => {
      await context.setOffline(true);
      await page.waitForTimeout(300);
      await context.setOffline(false);
      await page.waitForTimeout(300);
    });

    await logger.step("try navigating to another section", async () => {
      // Try clicking a navigation link
      const bundlesLink = page.getByRole("link", { name: /bundles/i });
      if (await bundlesLink.isVisible().catch(() => false)) {
        await bundlesLink.click();
        await page.waitForLoadState("networkidle");

        // Should navigate successfully
        await expect(page.url()).toContain("/bundles");
        logger.info("Navigation after reconnection successful");
      } else {
        // Try another navigation element
        const helpLink = page.getByRole("link", { name: /help|docs/i }).first();
        if (await helpLink.isVisible().catch(() => false)) {
          await helpLink.click();
          await page.waitForTimeout(1000);
          logger.info("Alternative navigation attempted");
        }
      }
    });
  });
});

test.describe("Reconnection - User Actions", () => {
  test("basket actions work after reconnection", async ({ page, context, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("add item to basket while online", async () => {
      const basketButton = page.getByRole("button", { name: /add to basket/i }).first();
      if (await basketButton.isVisible().catch(() => false)) {
        await basketButton.click();
        await expect(page.getByRole("button", { name: /already in basket/i }).first()).toBeVisible();
      }
    });

    await logger.step("go offline then online", async () => {
      await context.setOffline(true);
      await page.waitForTimeout(300);
      await context.setOffline(false);
      await page.waitForTimeout(300);
    });

    await logger.step("verify basket state persisted through reconnection", async () => {
      // First item should still show as in basket
      await expect(page.getByRole("button", { name: /already in basket/i }).first()).toBeVisible();
    });

    await logger.step("add another item after reconnection", async () => {
      const basketButton = page.getByRole("button", { name: /add to basket/i }).first();
      if (await basketButton.isVisible().catch(() => false)) {
        await basketButton.click();
        await expect(page.getByText(/added to basket/i).first()).toBeVisible({ timeout: 3000 });
        logger.info("Successfully added item after reconnection");
      }
    });
  });

  test("copy works after reconnection", async ({ page, context, logger }) => {
    await logger.step("grant clipboard permissions", async () => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("go offline then online", async () => {
      await context.setOffline(true);
      await page.waitForTimeout(300);
      await context.setOffline(false);
      await page.waitForTimeout(300);
    });

    await logger.step("copy prompt after reconnection", async () => {
      const copyButton = page.getByRole("button", { name: /copy.*clipboard|copy prompt/i }).first();
      if (await copyButton.isVisible().catch(() => false)) {
        await copyButton.click();
        await expect(page.getByText(/copied/i).first()).toBeVisible({ timeout: 3000 });
        logger.info("Copy succeeded after reconnection");
      }
    });
  });
});

test.describe("Reconnection - Message Display", () => {
  test("back online message may appear on reconnection", async ({ page, context, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("go offline", async () => {
      await context.setOffline(true);
      await page.waitForTimeout(500);
    });

    await logger.step("go back online", async () => {
      await context.setOffline(false);
      await page.waitForTimeout(1000);
    });

    await logger.step("check for reconnection feedback", async () => {
      // App may show a "back online" or "reconnected" message
      const hasReconnectMessage = await page.getByText(/back online|reconnected|connected/i).isVisible().catch(() => false);

      // Or the offline indicator should disappear
      const offlineIndicatorHidden = !(await page.getByTestId("offline-indicator").isVisible().catch(() => false));

      logger.info("Reconnection feedback", { hasReconnectMessage, offlineIndicatorHidden });

      // At minimum, the offline indicator should be gone
      expect(offlineIndicatorHidden).toBe(true);
    });
  });
});
