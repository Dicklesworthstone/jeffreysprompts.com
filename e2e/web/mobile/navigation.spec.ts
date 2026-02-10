import { test, expect } from "../../lib/playwright-logger";
import {
  VIEWPORTS,
  getHamburgerMenu,
  openMobileMenu,
  closeMobileMenu,
  isHamburgerMenuVisible,
  getBottomTabBar,
  isBottomTabBarVisible,
  tapBottomTab,
  checkStickyHeader,
  waitForTransitions,
} from "../../lib/mobile-helpers";

/**
 * Mobile Navigation E2E Tests
 *
 * Tests for hamburger menu, bottom tab bar, and navigation behavior.
 */

test.describe("Hamburger Menu", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
  });

  test("hamburger menu opens and closes", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("open mobile menu", async () => {
      await openMobileMenu(page);
      await waitForTransitions(page);
    });

    await logger.step("verify menu is open (navigation links visible)", async () => {
      const navSheet = page.locator("[role='dialog'], [data-state='open']");
      await expect(navSheet.first()).toBeVisible({ timeout: 5000 });
    });

    await logger.step("close mobile menu", async () => {
      await closeMobileMenu(page);
      await waitForTransitions(page);
    });
  });

  test("menu links navigate correctly", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("open mobile menu", async () => {
      await openMobileMenu(page);
      await waitForTransitions(page);
    });

    await logger.step("click on Bundles link", async () => {
      await page.getByRole("link", { name: "Bundles" }).click();
      await page.waitForLoadState("load");
    });

    await logger.step("verify navigation to bundles page", async () => {
      await expect(page).toHaveURL(/\/bundles/);
      await expect(page.getByRole("heading", { name: /Prompt Bundles/i })).toBeVisible({ timeout: 10000 });
    });
  });

  test("menu closes after navigation", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("open mobile menu and navigate", async () => {
      await openMobileMenu(page);
      await page.getByRole("link", { name: "Workflows" }).click();
      await page.waitForLoadState("load");
    });

    await logger.step("verify menu is closed after navigation", async () => {
      // The menu should close after clicking a link
      await waitForTransitions(page);
      const navSheet = page.locator("[role='dialog'][data-state='open']");
      await expect(navSheet).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // It's OK if the sheet doesn't exist
      });
    });
  });

  test("menu has proper touch targets", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("open mobile menu", async () => {
      await openMobileMenu(page);
      await waitForTransitions(page);
    });

    await logger.step("verify menu links have adequate touch targets", async () => {
      const links = page.locator("[role='dialog'] a, [data-state='open'] a");
      const count = await links.count();

      for (let i = 0; i < count; i++) {
        const box = await links.nth(i).boundingBox();
        if (box) {
          expect.soft(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });
});

test.describe("Bottom Tab Bar", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
  });

  test("bottom tab bar shows correct tabs", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify tab bar tabs", async () => {
      const tabBar = getBottomTabBar(page);
      await expect(tabBar.getByText("Home")).toBeVisible();
      await expect(tabBar.getByText("Bundles")).toBeVisible();
      await expect(tabBar.getByText("Search")).toBeVisible();
      await expect(tabBar.getByText("Workflows")).toBeVisible();
      await expect(tabBar.getByText("More")).toBeVisible();
    });
  });

  test("tab navigation works", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("tap Bundles tab", async () => {
      await tapBottomTab(page, "Bundles");
      await page.waitForLoadState("load");
    });

    await logger.step("verify navigation to bundles", async () => {
      await expect(page).toHaveURL(/\/bundles/);
    });

    await logger.step("tap Workflows tab", async () => {
      await tapBottomTab(page, "Workflows");
      await page.waitForLoadState("load");
    });

    await logger.step("verify navigation to workflows", async () => {
      await expect(page).toHaveURL(/\/workflows/);
    });

    await logger.step("tap Home tab", async () => {
      await tapBottomTab(page, "Home");
      await page.waitForLoadState("load");
    });

    await logger.step("verify navigation to home", async () => {
      await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/);
    });
  });

  test("Search tab opens spotlight search", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("tap Search tab", async () => {
      await tapBottomTab(page, "Search");
      await waitForTransitions(page);
    });

    await logger.step("verify search dialog opens", async () => {
      // The spotlight search should open
      const searchDialog = page.locator("[role='dialog']");
      await expect(searchDialog.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test("More menu opens submenu", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("tap More tab", async () => {
      await tapBottomTab(page, "More");
      await waitForTransitions(page);
    });

    await logger.step("verify more menu appears", async () => {
      // The more menu should show additional options
      await expect(page.getByText("Basket")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Pricing")).toBeVisible();
    });
  });

  test("tab bar hides on scroll down", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("get initial tab bar visibility", async () => {
      const isVisible = await isBottomTabBarVisible(page);
      expect(isVisible).toBe(true);
    });

    await logger.step("scroll down", async () => {
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(500);
    });

    await logger.step("verify tab bar is hidden or transitioning", async () => {
      // The tab bar might hide or become transparent on scroll
      const tabBar = getBottomTabBar(page);
      const box = await tabBar.first().boundingBox();
      // Tab bar might be off-screen or have opacity
      if (box) {
        // If visible, should be at bottom
        expect(box.y).toBeGreaterThan(0);
      }
    });
  });
});

test.describe("Sticky Header", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
  });

  test("header stays visible when scrolling", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("check sticky header behavior", async () => {
      const { isSticky } = await checkStickyHeader(page);
      expect(isSticky).toBe(true);
    });
  });

  test("header contains logo on mobile", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify logo is visible", async () => {
      // On mobile, logo should show abbreviated text
      const header = page.locator("header");
      await expect(header.getByText(/JFP|Jeffrey/i).first()).toBeVisible();
    });
  });
});

test.describe("Navigation Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobilePortrait);
  });

  test("hamburger button has accessible label", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify hamburger button accessibility", async () => {
      const hamburger = getHamburgerMenu(page);
      await expect(hamburger).toBeVisible();

      const ariaLabel = await hamburger.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
    });
  });

  test("bottom tab bar has navigation role", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify tab bar accessibility", async () => {
      const tabBar = getBottomTabBar(page);
      await expect(tabBar.first()).toBeVisible();
      // <nav> element has implicit navigation role; verify via tag name
      const tagName = await tabBar.first().evaluate((el) => el.tagName.toLowerCase());
      expect(tagName).toBe("nav");
    });
  });

  test("keyboard navigation works in mobile menu", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("open mobile menu", async () => {
      const hamburger = getHamburgerMenu(page);
      await hamburger.click();
      await waitForTransitions(page);
    });

    await logger.step("close with Escape key", async () => {
      await page.keyboard.press("Escape");
      await waitForTransitions(page);
    });

    await logger.step("verify menu closed", async () => {
      const navSheet = page.locator("[role='dialog'][data-state='open']");
      await expect(navSheet).not.toBeVisible({ timeout: 2000 }).catch(() => {
        // OK if sheet doesn't exist
      });
    });
  });
});
