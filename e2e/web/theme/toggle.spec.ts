import { test, expect } from "../../lib/playwright-logger";
import {
  getCurrentTheme,
  getStoredTheme,
  clearStoredTheme,
  clickThemeToggle,
  getThemeToggleButton,
  waitForThemeTransition,
  gotoWithTheme,
  waitForThemeClass,
  safeReload,
} from "../../lib/theme-helpers";

/**
 * Theme Toggle E2E Tests
 *
 * Tests for the manual theme toggle functionality.
 */

test.describe("Manual Toggle", () => {
  test("toggle switch is visible", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify theme toggle button exists", async () => {
      const toggle = getThemeToggleButton(page);
      await expect(toggle).toBeVisible({ timeout: 10000 });
    });
  });

  test("click switches theme from light to dark", async ({ page, logger }) => {
    await logger.step("set initial theme to light", async () => {
      await gotoWithTheme(page, "/", "light");
    });

    await logger.step("verify starting in light mode", async () => {
      const theme = await getCurrentTheme(page);
      expect(theme).toBe("light");
    });

    await logger.step("click theme toggle", async () => {
      await clickThemeToggle(page);
      await waitForThemeTransition(page);
    });

    await logger.step("verify theme changed to dark", async () => {
      await waitForThemeClass(page, "dark", 5000);
      const theme = await getCurrentTheme(page);
      expect(theme).toBe("dark");
    });
  });

  test("theme cycles through light -> dark -> system", async ({ page, logger }) => {
    await logger.step("start with light theme", async () => {
      await gotoWithTheme(page, "/", "light");
    });

    await logger.step("verify light theme", async () => {
      const stored = await getStoredTheme(page);
      expect(stored).toBe("light");
    });

    await logger.step("click to dark", async () => {
      await clickThemeToggle(page);
      await waitForThemeTransition(page);
      await waitForThemeClass(page, "dark", 5000);
      const stored = await getStoredTheme(page);
      expect(stored).toBe("dark");
    });

    await logger.step("click to system", async () => {
      await clickThemeToggle(page);
      await waitForThemeTransition(page);
      const stored = await getStoredTheme(page);
      expect(stored).toBe("system");
    });
  });

  test("preference persists after refresh", async ({ page, logger }) => {
    await logger.step("set theme to dark via toggle", async () => {
      await gotoWithTheme(page, "/", "light");
      await clickThemeToggle(page);
      await waitForThemeTransition(page);
      await waitForThemeClass(page, "dark", 5000);
    });

    await logger.step("verify dark theme", async () => {
      const stored = await getStoredTheme(page);
      expect(stored).toBe("dark");
    });

    await logger.step("refresh page", async () => {
      await safeReload(page);
    });

    await logger.step("verify dark theme persists", async () => {
      const stored = await getStoredTheme(page);
      expect(stored).toBe("dark");
      const theme = await getCurrentTheme(page);
      expect(theme).toBe("dark");
    });
  });

  test("works in logged-out state", async ({ page, logger }) => {
    await logger.step("clear any auth state", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        localStorage.removeItem("auth_token");
        sessionStorage.clear();
      });
    });

    await logger.step("verify theme toggle works", async () => {
      await safeReload(page);
      const toggle = getThemeToggleButton(page);
      await expect(toggle).toBeVisible({ timeout: 10000 });
      await expect(toggle).toBeEnabled();
    });

    await logger.step("click toggle and verify change", async () => {
      await clearStoredTheme(page);
      await safeReload(page);
      await clickThemeToggle(page);
      await waitForThemeTransition(page);
      const stored = await getStoredTheme(page);
      expect(stored).toBeTruthy();
    });
  });
});

test.describe("Toggle Icon Display", () => {
  test("toggle has icon in light mode", async ({ page, logger }) => {
    await logger.step("set light theme", async () => {
      await gotoWithTheme(page, "/", "light");
    });

    await logger.step("verify toggle has an icon", async () => {
      const toggle = getThemeToggleButton(page);
      const svg = toggle.locator("svg").first();
      await expect(svg).toBeVisible({ timeout: 10000 });
    });
  });

  test("toggle has icon in dark mode", async ({ page, logger }) => {
    await logger.step("set dark theme", async () => {
      await gotoWithTheme(page, "/", "dark");
    });

    await logger.step("verify toggle has an icon", async () => {
      const toggle = getThemeToggleButton(page);
      const svg = toggle.locator("svg").first();
      await expect(svg).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe("Toggle Accessibility", () => {
  test("toggle has proper ARIA attributes", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify aria-label is present", async () => {
      const toggle = getThemeToggleButton(page);
      await expect(toggle).toBeVisible({ timeout: 10000 });
      const ariaLabel = await toggle.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
    });
  });

  test("toggle responds to keyboard interaction", async ({ page, logger }) => {
    await logger.step("set up light theme", async () => {
      await gotoWithTheme(page, "/", "light");
    });

    await logger.step("focus toggle and activate with Enter", async () => {
      const toggle = getThemeToggleButton(page);
      await expect(toggle).toBeVisible({ timeout: 10000 });
      await toggle.focus();
      await expect(toggle).toBeFocused();
      await toggle.press("Enter");
      await waitForThemeTransition(page);
      await waitForThemeClass(page, "dark", 5000);
    });

    await logger.step("verify theme changed", async () => {
      const stored = await getStoredTheme(page);
      expect(stored).toBe("dark");
    });
  });

  test("toggle is focusable", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("focus the toggle", async () => {
      const toggle = getThemeToggleButton(page);
      await expect(toggle).toBeVisible({ timeout: 10000 });
      await toggle.focus();
      await expect(toggle).toBeFocused();
    });
  });
});

test.describe("Toggle on Different Pages", () => {
  test("toggle works on prompt detail page", async ({ page, logger }) => {
    await logger.step("navigate with light theme", async () => {
      await gotoWithTheme(page, "/prompts/idea-wizard", "light");
    });

    await logger.step("verify toggle is present and works", async () => {
      const toggle = getThemeToggleButton(page);
      await expect(toggle).toBeVisible({ timeout: 10000 });
      await clickThemeToggle(page);
      await waitForThemeTransition(page);
      await waitForThemeClass(page, "dark", 5000);
      const stored = await getStoredTheme(page);
      expect(stored).toBe("dark");
    });
  });

  test("toggle works on bundles page", async ({ page, logger }) => {
    await logger.step("navigate to bundles page", async () => {
      await page.goto("/bundles");
      await page.waitForLoadState("load");
    });

    await logger.step("verify toggle is present", async () => {
      const toggle = getThemeToggleButton(page);
      await expect(toggle).toBeVisible({ timeout: 10000 });
    });
  });
});
