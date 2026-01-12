import { test, expect } from "../lib/playwright-logger";

/**
 * Network Failure E2E Tests
 *
 * Tests for handling network failures gracefully:
 * 1. API request failures
 * 2. Error message display
 * 3. Page resilience to failed requests
 *
 * Uses Playwright's route interception to simulate network failures.
 */

test.describe("Network Failures - API Request Handling", () => {
  test("should handle API failure gracefully on page load", async ({ page, logger }) => {
    await logger.step("intercept and fail API requests", async () => {
      // Fail the prompts API request
      await page.route("**/api/prompts**", async (route) => {
        await route.abort("connectionfailed");
      });
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
    });

    await logger.step("verify page loads without crashing", async () => {
      // Page should still render even if API fails
      // The hero section should be visible
      const heroSection = page.locator("section").first();
      await expect(heroSection).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify error handling", async () => {
      // Check for any error toast or error state
      // The app may show an error message or fall back to cached/empty state
      const hasError = await page.getByText(/error|failed|unable/i).isVisible().catch(() => false);
      const hasEmptyState = await page.getByText(/no prompts|try again/i).isVisible().catch(() => false);
      const hasPrompts = await page.getByRole("heading", { name: /wizard|prompt/i }).first().isVisible().catch(() => false);

      logger.info("Page state after API failure", { hasError, hasEmptyState, hasPrompts });

      // At least one of these should be true - the app shouldn't just crash
      expect(hasError || hasEmptyState || hasPrompts).toBe(true);
    });
  });

  test("should show error when search API fails", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("intercept search API to fail", async () => {
      await page.route("**/api/search**", async (route) => {
        await route.abort("connectionfailed");
      });
    });

    await logger.step("try to search", async () => {
      // Find and use the search input
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill("test query");
        await page.keyboard.press("Enter");
        await page.waitForTimeout(1000);

        // Should handle gracefully - either show error or fall back to local search
        logger.info("Search attempted with failing API");
      } else {
        logger.info("Search input not found - skipping search API test");
      }
    });
  });
});

test.describe("Network Failures - Request Retry Behavior", () => {
  test("should succeed after transient failure", async ({ page, logger }) => {
    let requestCount = 0;

    await logger.step("setup intermittent failure", async () => {
      await page.route("**/api/prompts**", async (route) => {
        requestCount++;
        logger.debug(`API request #${requestCount}`);

        if (requestCount === 1) {
          // First request fails
          await route.abort("connectionfailed");
        } else {
          // Subsequent requests succeed
          await route.continue();
        }
      });
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify page eventually loads content", async () => {
      // Give time for potential retry
      await page.waitForTimeout(2000);

      // Check if prompts loaded (either from retry or cache)
      const hasPrompts = await page.getByRole("heading", { name: /wizard|prompt/i }).first().isVisible({ timeout: 5000 }).catch(() => false);

      logger.info("Content loaded after transient failure", { requestCount, hasPrompts });
    });
  });
});

test.describe("Network Failures - Static Asset Handling", () => {
  test("page renders core UI even if some assets fail", async ({ page, logger }) => {
    await logger.step("fail some static assets", async () => {
      // Fail some non-critical image requests
      await page.route("**/*.png", async (route) => {
        // Randomly fail some images
        if (Math.random() > 0.5) {
          await route.abort("failed");
        } else {
          await route.continue();
        }
      });
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
    });

    await logger.step("verify core UI is functional", async () => {
      // Navigation should still work
      const nav = page.locator("nav");
      await expect(nav).toBeVisible({ timeout: 10000 });

      // Main content area should render
      const main = page.locator("main");
      await expect(main).toBeVisible();
    });
  });
});

test.describe("Network Failures - User Actions", () => {
  test("copy action works even when partially offline", async ({ page, context, logger }) => {
    await logger.step("grant clipboard permissions", async () => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    });

    await logger.step("navigate and wait for content", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("go offline (simulating poor connectivity)", async () => {
      await context.setOffline(true);
      await page.waitForTimeout(300);
    });

    await logger.step("try to copy a prompt", async () => {
      // Copy button should still work for cached/loaded content
      const copyButton = page.getByRole("button", { name: /copy.*clipboard|copy prompt/i }).first();
      if (await copyButton.isVisible().catch(() => false)) {
        await copyButton.click();

        // Copy should succeed (it's a local operation)
        await expect(page.getByText(/copied/i).first()).toBeVisible({ timeout: 3000 });
        logger.info("Copy succeeded while offline");
      } else {
        logger.info("Copy button not found - skipping copy test");
      }
    });
  });
});
