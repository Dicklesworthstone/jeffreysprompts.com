import { test, expect } from "../lib/playwright-logger";
import {
  getCurrentTheme,
  clickThemeToggle,
  getThemeToggleButton,
  waitForThemeTransition,
  gotoWithTheme,
  waitForThemeClass,
  safeReload,
} from "../lib/theme-helpers";

/**
 * Theme Toggling E2E Tests
 *
 * Verifies light/dark mode functionality and persistence.
 */

test.describe("Theme Functionality", () => {
  test("can toggle theme", async ({ page, logger }) => {
    await logger.step("navigate with light theme", async () => {
      await gotoWithTheme(page, "/", "light");
    });

    await logger.step("find theme toggle", async () => {
      const toggle = getThemeToggleButton(page);
      await expect(toggle).toBeVisible({ timeout: 10000 });
    });

    await logger.step("click toggle and verify dark", async () => {
      await clickThemeToggle(page);
      await waitForThemeTransition(page);
      await waitForThemeClass(page, "dark", 5000);

      const newTheme = await getCurrentTheme(page);
      expect(newTheme).toBe("dark");
    });
  });

  test("theme persists across reload", async ({ page, logger }) => {
    await logger.step("navigate with dark theme", async () => {
      await gotoWithTheme(page, "/", "dark");
    });

    await logger.step("reload page", async () => {
      await safeReload(page);
      await waitForThemeClass(page, "dark");
    });

    await logger.step("verify theme persisted", async () => {
      const theme = await getCurrentTheme(page);
      expect(theme).toBe("dark");
    });
  });
});
