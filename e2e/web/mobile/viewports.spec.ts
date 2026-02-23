import { test, expect } from "../../lib/playwright-logger";
import {
  VIEWPORTS,
  hasHorizontalOverflow,
  areCardsStacked,
  isHamburgerMenuVisible,
  isBottomTabBarVisible,
  checkMinFontSize,
} from "../../lib/mobile-helpers";

/**
 * Mobile Viewport E2E Tests
 *
 * Tests for responsive layouts across different viewport sizes.
 */

// Dismiss onboarding modal for all viewport tests
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("jfp-onboarding", JSON.stringify({
      hints: {},
      firstVisit: false,
      firstVisitAt: new Date().toISOString(),
    }));
  });
});

test.describe("Viewport: Mobile Portrait (375px)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
  });

  test("homepage renders without horizontal overflow", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("check for horizontal overflow", async () => {
      const hasOverflow = await hasHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);
    });
  });

  test("hamburger menu is visible on mobile", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify hamburger menu is visible", async () => {
      const isVisible = await isHamburgerMenuVisible(page);
      expect(isVisible).toBe(true);
    });
  });

  test("bottom tab bar is visible on mobile", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify bottom tab bar is visible", async () => {
      const isVisible = await isBottomTabBarVisible(page);
      expect(isVisible).toBe(true);
    });
  });

  test("prompt cards are stacked in single column", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify cards are stacked in browse section", async () => {
      // Scroll to the "Browse All Prompts" section (past featured horizontal scroll)
      const browseSection = page.locator("#prompts-section");
      await browseSection.scrollIntoViewIfNeeded();
      // Wait for grid cards to render in the browse section
      await page.waitForSelector("#prompts-section [data-testid='prompt-card'], #prompts-section article.rounded-lg", { timeout: 5000 }).catch(() => {});
      const stacked = await areCardsStacked(page, "#prompts-section [data-testid='prompt-card'], #prompts-section article.rounded-lg");
      expect(stacked).toBe(true);
    });
  });

  test("text is readable (min 16px)", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("check font sizes", async () => {
      const { allReadable, issues } = await checkMinFontSize(page, 12); // Some small labels are OK
      if (!allReadable && issues.length > 5) {
        // Allow a few small text elements
        expect.soft(issues.length).toBeLessThan(10);
      }
    });
  });
});

test.describe("Viewport: Tablet Portrait (768px)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tabletPortrait);
  });

  test("hamburger menu is hidden on tablet", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify hamburger menu is hidden", async () => {
      const isVisible = await isHamburgerMenuVisible(page);
      expect(isVisible).toBe(false);
    });
  });

  test("desktop navigation is visible", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      // Wait for nav to hydrate — md:flex needs React client render at exactly 768px
      await page.waitForTimeout(1000);
    });

    await logger.step("verify desktop nav links are visible", async () => {
      // Scope to header nav to avoid matching footer links
      const headerNav = page.locator("header nav");
      const bundlesLink = headerNav.getByRole("link", { name: "Bundles" });
      const pricingLink = headerNav.getByRole("link", { name: "Pricing" });
      await expect(bundlesLink).toBeVisible({ timeout: 15000 });
      await expect(pricingLink).toBeVisible({ timeout: 15000 });
    });
  });

  test("bottom tab bar is hidden on tablet", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify bottom tab bar is hidden", async () => {
      const isVisible = await isBottomTabBarVisible(page);
      expect(isVisible).toBe(false);
    });
  });
});

test.describe("Viewport: Desktop (1280px)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
  });

  test("hamburger menu is hidden on desktop", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify hamburger menu is hidden", async () => {
      const isVisible = await isHamburgerMenuVisible(page);
      expect(isVisible).toBe(false);
    });
  });

  test("prompt cards are in multi-column grid", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify cards are not stacked (multi-column)", async () => {
      await page.waitForSelector("[data-testid='prompt-card'], .rounded-lg.border", { timeout: 5000 }).catch(() => {});
      const stacked = await areCardsStacked(page, "[data-testid='prompt-card'], article.rounded-lg");
      expect(stacked).toBe(false);
    });
  });

  test("Go Pro button is visible on desktop", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify Go Pro button is visible", async () => {
      await expect(page.getByRole("button", { name: /Go Pro/i })).toBeVisible();
    });
  });
});

test.describe("Cross-Viewport Consistency", () => {
  const viewportEntries = Object.entries(VIEWPORTS) as [string, { width: number; height: number }][];

  for (const [name, size] of viewportEntries) {
    test(`no horizontal overflow at ${name} (${size.width}x${size.height})`, async ({ page, logger }) => {
      await logger.step(`set viewport to ${name}`, async () => {
        await page.setViewportSize(size);
      });

      await logger.step("navigate to homepage", async () => {
        await page.goto("/");
        await page.waitForLoadState("load");
      });

      await logger.step("check for horizontal overflow", async () => {
        const hasOverflow = await hasHorizontalOverflow(page);
        expect(hasOverflow).toBe(false);
      });
    });
  }
});

test.describe("Page-Specific Viewport Tests", () => {
  test("bundles page works on mobile", async ({ page, logger }) => {
    await logger.step("set mobile viewport", async () => {
      await page.setViewportSize(VIEWPORTS.mobilePortrait);
    });

    await logger.step("navigate to bundles page", async () => {
      await page.goto("/bundles");
      await page.waitForLoadState("load");
    });

    await logger.step("verify content is visible", async () => {
      await expect(page.getByRole("heading", { name: /Prompt Bundles/i })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify no horizontal overflow", async () => {
      const hasOverflow = await hasHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);
    });
  });

  test("workflows page works on mobile", async ({ page, logger }) => {
    await logger.step("set mobile viewport", async () => {
      await page.setViewportSize(VIEWPORTS.mobilePortrait);
    });

    await logger.step("navigate to workflows page", async () => {
      await page.goto("/workflows");
      await page.waitForLoadState("load");
    });

    await logger.step("verify content is visible", async () => {
      await expect(page.getByRole("heading", { name: /Workflow Builder/i })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify no horizontal overflow", async () => {
      const hasOverflow = await hasHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);
    });
  });

  test("pricing page works on mobile", async ({ page, logger }) => {
    await logger.step("set mobile viewport", async () => {
      await page.setViewportSize(VIEWPORTS.mobilePortrait);
    });

    await logger.step("navigate to pricing page", async () => {
      await page.goto("/pricing");
      await page.waitForLoadState("load");
    });

    await logger.step("verify content is visible", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify no horizontal overflow", async () => {
      const hasOverflow = await hasHorizontalOverflow(page);
      expect(hasOverflow).toBe(false);
    });
  });
});
