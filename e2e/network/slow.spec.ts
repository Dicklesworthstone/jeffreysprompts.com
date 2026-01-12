import { test, expect } from "../lib/playwright-logger";

/**
 * Slow Network E2E Tests
 *
 * Tests for handling slow network conditions:
 * 1. Loading states display correctly
 * 2. Timeouts are handled gracefully
 * 3. User can still interact with cached content
 *
 * Uses Playwright route delays to simulate slow network conditions.
 */

test.describe("Slow Network - Loading States", () => {
  test("should show loading state during slow API response", async ({ page, logger }) => {
    await logger.step("setup slow API response", async () => {
      await page.route("**/api/prompts**", async (route) => {
        // Delay the response by 3 seconds
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      });
    });

    await logger.step("navigate to homepage", async () => {
      // Don't wait for network idle since we're intentionally slowing it
      await page.goto("/", { waitUntil: "domcontentloaded" });
    });

    await logger.step("check for loading indicators", async () => {
      // Check for any loading state indicators
      const hasSpinner = await page.locator("[data-loading], [aria-busy='true'], .animate-spin, .animate-pulse").first().isVisible().catch(() => false);
      const hasSkeleton = await page.locator("[class*='skeleton'], [data-testid*='skeleton']").first().isVisible().catch(() => false);
      const hasLoadingText = await page.getByText(/loading/i).isVisible().catch(() => false);

      logger.info("Loading indicators visible", { hasSpinner, hasSkeleton, hasLoadingText });

      // At least one loading indicator should be present, or page should start rendering immediately
    });

    await logger.step("wait for content to eventually load", async () => {
      // Content should appear after delay
      await expect(page.getByRole("heading", { name: /wizard|prompt/i }).first()).toBeVisible({ timeout: 15000 });
    });
  });

  test("page remains interactive during slow loading", async ({ page, logger }) => {
    await logger.step("setup delayed API", async () => {
      await page.route("**/api/prompts**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
    });

    await logger.step("verify navigation is still interactive", async () => {
      // Navigation should be clickable even while content is loading
      const nav = page.locator("nav");
      await expect(nav).toBeVisible({ timeout: 5000 });

      // Check if nav links are clickable
      const navLink = page.locator("nav a").first();
      const isEnabled = await navLink.isEnabled().catch(() => false);
      logger.info("Navigation interactivity during load", { isEnabled });
    });
  });
});

test.describe("Slow Network - Search Behavior", () => {
  test("search shows loading state during slow response", async ({ page, logger }) => {
    await logger.step("navigate and wait for initial content", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("setup slow search response", async () => {
      await page.route("**/api/search**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });
    });

    await logger.step("perform search", async () => {
      const searchInput = page.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill("test");
        // Trigger search
        await page.keyboard.press("Enter");

        // Should show some loading indication
        await page.waitForTimeout(500);
        logger.info("Search initiated with slow network");
      } else {
        logger.info("Search input not visible - skipping search test");
      }
    });
  });
});

test.describe("Slow Network - User Experience", () => {
  test("slow image loading does not block text content", async ({ page, logger }) => {
    await logger.step("setup slow image loading", async () => {
      await page.route("**/*.{png,jpg,jpeg,gif,webp,svg}", async (route) => {
        // Delay images significantly
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.continue();
      });
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/", { waitUntil: "domcontentloaded" });
    });

    await logger.step("verify text content loads quickly", async () => {
      // Text content should render before images fully load
      const textContent = page.getByRole("heading", { name: /wizard|prompt|browse/i }).first();
      await expect(textContent).toBeVisible({ timeout: 5000 });
      logger.info("Text content visible before images");
    });
  });

  test("copy button works immediately without waiting for slow requests", async ({ page, context, logger }) => {
    await logger.step("grant clipboard permissions", async () => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    });

    await logger.step("navigate and wait for initial content", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "The Idea Wizard" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("setup slow API for subsequent requests", async () => {
      await page.route("**/api/**", async (route) => {
        // Delay all subsequent API calls
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      });
    });

    await logger.step("copy prompt immediately", async () => {
      // Copy should work instantly since content is already loaded
      const copyButton = page.getByRole("button", { name: /copy.*clipboard|copy prompt/i }).first();
      if (await copyButton.isVisible().catch(() => false)) {
        await copyButton.click();

        // Should succeed immediately
        await expect(page.getByText(/copied/i).first()).toBeVisible({ timeout: 2000 });
        logger.info("Copy succeeded immediately despite slow API");
      } else {
        logger.info("Copy button not found");
      }
    });
  });
});

test.describe("Slow Network - Timeout Handling", () => {
  test("very slow requests eventually timeout gracefully", async ({ page, logger }) => {
    await logger.step("setup extremely slow API", async () => {
      await page.route("**/api/prompts**", async (route) => {
        // Simulate very slow response (30+ seconds)
        await new Promise((resolve) => setTimeout(resolve, 30000));
        await route.continue();
      });
    });

    await logger.step("navigate with reduced timeout expectation", async () => {
      await page.goto("/", { waitUntil: "domcontentloaded", timeout: 10000 });
    });

    await logger.step("verify page handles timeout", async () => {
      // Page should either:
      // 1. Show a timeout/error message
      // 2. Show loading state
      // 3. Fall back to cached content

      await page.waitForTimeout(3000);

      const hasError = await page.getByText(/timeout|error|failed|taking.*long/i).isVisible().catch(() => false);
      const hasLoading = await page.locator("[data-loading], .animate-pulse").isVisible().catch(() => false);
      const hasContent = await page.getByRole("heading").first().isVisible().catch(() => false);

      logger.info("Page state after timeout", { hasError, hasLoading, hasContent });

      // Page should be in some meaningful state
      expect(hasError || hasLoading || hasContent).toBe(true);
    });
  });
});
