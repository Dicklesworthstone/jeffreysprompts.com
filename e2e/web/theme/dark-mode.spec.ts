import { test, expect } from "../../lib/playwright-logger";
import {
  getCurrentTheme,
  clearStoredTheme,
  emulateColorScheme,
  isPageInDarkMode,
  waitForThemeTransition,
  getThemeToggleButton,
  gotoWithTheme,
  waitForThemeClass,
  waitForAnyThemeClass,
  safeReload,
} from "../../lib/theme-helpers";

/**
 * Dark Mode E2E Tests
 *
 * Tests for dark mode rendering and system preference detection.
 */

test.describe("Theme Detection", () => {
  test("follows system preference by default (dark)", async ({ page, logger }) => {
    await logger.step("emulate dark system preference", async () => {
      await emulateColorScheme(page, "dark");
    });

    await logger.step("navigate with no stored preference", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);
      await clearStoredTheme(page);
      await safeReload(page);
      await waitForThemeTransition(page);
      await waitForAnyThemeClass(page);
    });

    await logger.step("verify dark theme is applied", async () => {
      const theme = await getCurrentTheme(page);
      expect(theme).toBe("dark");
    });
  });

  test("follows system preference by default (light)", async ({ page, logger }) => {
    await logger.step("emulate light system preference", async () => {
      await emulateColorScheme(page, "light");
    });

    await logger.step("navigate with no stored preference", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
      await page.waitForTimeout(1500);
      await clearStoredTheme(page);
      await safeReload(page);
      await waitForThemeTransition(page);
      await waitForAnyThemeClass(page);
    });

    await logger.step("verify light theme is applied", async () => {
      const theme = await getCurrentTheme(page);
      expect(theme).toBe("light");
    });
  });

  test("light mode renders correctly", async ({ page, logger }) => {
    await logger.step("set light theme", async () => {
      await gotoWithTheme(page, "/", "light");
    });

    await logger.step("verify light theme class", async () => {
      const hasLightClass = await page.evaluate(() =>
        document.documentElement.classList.contains("light")
      );
      expect(hasLightClass).toBe(true);
    });

    await logger.step("verify page is not in dark mode visually", async () => {
      const isDark = await isPageInDarkMode(page);
      expect(isDark).toBe(false);
    });
  });

  test("dark mode renders correctly", async ({ page, logger }) => {
    await logger.step("set dark theme", async () => {
      await gotoWithTheme(page, "/", "dark");
    });

    await logger.step("verify dark theme class", async () => {
      const hasDarkClass = await page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      );
      expect(hasDarkClass).toBe(true);
    });

    await logger.step("verify page is in dark mode visually", async () => {
      const isDark = await isPageInDarkMode(page);
      expect(isDark).toBe(true);
    });
  });
});

test.describe("Visual Consistency", () => {
  test("content is visible in light mode", async ({ page, logger }) => {
    await logger.step("set up light mode", async () => {
      await gotoWithTheme(page, "/", "light");
    });

    await logger.step("verify main heading is visible", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify navigation is visible", async () => {
      const nav = page.locator("nav").first();
      await expect(nav).toBeVisible();
    });
  });

  test("content is visible in dark mode", async ({ page, logger }) => {
    await logger.step("set up dark mode", async () => {
      await gotoWithTheme(page, "/", "dark");
    });

    await logger.step("verify main heading is visible", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify dark mode class is present", async () => {
      const hasDarkClass = await page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      );
      expect(hasDarkClass).toBe(true);
    });
  });

  test("dark mode persists during navigation", async ({ page, logger }) => {
    await logger.step("set up dark mode", async () => {
      await gotoWithTheme(page, "/", "dark");
    });

    await logger.step("verify initial dark mode", async () => {
      const isDark = await isPageInDarkMode(page);
      expect(isDark).toBe(true);
    });

    await logger.step("navigate to another page", async () => {
      await page.goto("/bundles");
      await page.waitForLoadState("load");
      await page.waitForTimeout(1000);
    });

    await logger.step("verify dark mode persists", async () => {
      const isDark = await isPageInDarkMode(page);
      expect(isDark).toBe(true);
    });
  });
});

test.describe("Edge Cases", () => {
  test("explicit preference overrides system preference", async ({ page, logger }) => {
    await logger.step("set system to dark but user preference to light", async () => {
      await emulateColorScheme(page, "dark");
      await gotoWithTheme(page, "/", "light");
    });

    await logger.step("verify light theme despite dark system preference", async () => {
      const theme = await getCurrentTheme(page);
      expect(theme).toBe("light");
    });
  });

  test("theme persists after refresh", async ({ page, logger }) => {
    await logger.step("set dark theme", async () => {
      await gotoWithTheme(page, "/", "dark");
    });

    await logger.step("verify dark theme", async () => {
      const theme = await getCurrentTheme(page);
      expect(theme).toBe("dark");
    });

    await logger.step("reload page", async () => {
      await safeReload(page);
      await waitForThemeClass(page, "dark");
    });

    await logger.step("verify dark theme persists", async () => {
      const theme = await getCurrentTheme(page);
      expect(theme).toBe("dark");
    });
  });

  test("theme toggle button is accessible", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify theme toggle exists and is accessible", async () => {
      const toggle = getThemeToggleButton(page);
      await expect(toggle).toBeVisible({ timeout: 10000 });
      await expect(toggle).toBeEnabled();
    });

    await logger.step("verify toggle has accessible label", async () => {
      const toggle = getThemeToggleButton(page);
      const label = await toggle.getAttribute("aria-label");
      expect(label).toBeTruthy();
    });
  });
});
