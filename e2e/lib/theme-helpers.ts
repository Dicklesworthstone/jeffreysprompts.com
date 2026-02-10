/**
 * Theme E2E Test Helpers
 *
 * Utilities for testing dark mode and theme switching functionality.
 * All helpers are hardened against Turbopack HMR context destruction.
 */

import type { Page } from "@playwright/test";

export type ThemeValue = "light" | "dark" | "system";

/**
 * Retry a page.evaluate call that may fail due to Turbopack HMR
 * destroying the execution context mid-evaluation.
 */
async function safeEvaluate<T>(
  page: Page,
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      const isTransient =
        e instanceof Error &&
        (e.message.includes("Execution context was destroyed") ||
         e.message.includes("frame was detached") ||
         e.message.includes("net::ERR_ABORTED"));
      if (i === retries - 1 || !isTransient) throw e;
      await page.waitForTimeout(1000);
    }
  }
  throw new Error("unreachable");
}

/**
 * Wait for a theme class on documentElement, null-safe for mid-navigation states.
 */
export async function waitForThemeClass(
  page: Page,
  theme: "light" | "dark",
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    (cls) => document.documentElement?.classList?.contains(cls) === true,
    theme,
    { timeout }
  );
}

/**
 * Wait for either light or dark class to be present.
 */
export async function waitForAnyThemeClass(
  page: Page,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    () =>
      document.documentElement?.classList?.contains("dark") === true ||
      document.documentElement?.classList?.contains("light") === true,
    { timeout }
  );
}

/**
 * Reload page safely, retrying on ERR_ABORTED from Turbopack streaming.
 */
export async function safeReload(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    try {
      await page.reload();
      await page.waitForLoadState("load");
      await page.waitForTimeout(1000);
      return;
    } catch (e) {
      const isAborted =
        e instanceof Error &&
        (e.message.includes("net::ERR_ABORTED") ||
         e.message.includes("frame was detached"));
      if (i === 2 || !isAborted) throw e;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Get the current theme from the document element's class list
 */
export async function getCurrentTheme(page: Page): Promise<"light" | "dark"> {
  return safeEvaluate(page, () =>
    page.evaluate(() => {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    })
  );
}

/**
 * Get the theme preference stored in localStorage
 */
export async function getStoredTheme(page: Page): Promise<ThemeValue | null> {
  return safeEvaluate(page, () =>
    page.evaluate(() => {
      const stored = localStorage.getItem("jfp-theme");
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
      return null;
    })
  );
}

/**
 * Set a theme preference directly in localStorage (for testing initial states).
 * Use gotoWithTheme for the most reliable pattern.
 */
export async function setStoredTheme(
  page: Page,
  theme: ThemeValue | null
): Promise<void> {
  await safeEvaluate(page, () =>
    page.evaluate((t) => {
      if (t === null) {
        localStorage.removeItem("jfp-theme");
      } else {
        localStorage.setItem("jfp-theme", t);
      }
    }, theme)
  );
}

/**
 * Navigate to a URL with a pre-set theme.
 * Sets localStorage via addInitScript before navigation to avoid
 * the navigate→set→reload race condition with Turbopack streaming.
 */
export async function gotoWithTheme(
  page: Page,
  url: string,
  theme: ThemeValue
): Promise<void> {
  await page.goto(url);
  await page.waitForLoadState("load");
  // Let Turbopack streaming/HMR settle before touching localStorage
  await page.waitForTimeout(1500);
  await safeEvaluate(page, () =>
    page.evaluate((t) => localStorage.setItem("jfp-theme", t), theme)
  );
  await safeReload(page);
  if (theme !== "system") {
    await waitForThemeClass(page, theme);
  }
}

/**
 * Clear the stored theme preference
 */
export async function clearStoredTheme(page: Page): Promise<void> {
  await safeEvaluate(page, () =>
    page.evaluate(() => {
      localStorage.removeItem("jfp-theme");
    })
  );
}

/**
 * Click the theme toggle button to cycle to the next theme.
 * Waits for the button to be visible and stable before clicking.
 */
export async function clickThemeToggle(page: Page): Promise<void> {
  const toggleButton = getThemeToggleButton(page);
  await toggleButton.waitFor({ state: "visible", timeout: 10000 });
  // Wait for any ongoing animations/hydration to settle
  await page.waitForTimeout(100);
  await toggleButton.click();
}

/**
 * Get the theme toggle button locator
 * Uses a specific aria-label pattern to avoid matching other buttons
 */
export function getThemeToggleButton(page: Page) {
  // The theme toggle has aria-label like "Current: Light mode. Click to change."
  return page.getByRole("button", { name: /Click to change/i });
}

/**
 * Emulate a color scheme preference at the browser level
 */
export async function emulateColorScheme(
  page: Page,
  scheme: "light" | "dark" | "no-preference"
): Promise<void> {
  await page.emulateMedia({ colorScheme: scheme });
}

/**
 * Get the computed background color of the document
 */
export async function getBackgroundColor(page: Page): Promise<string> {
  return safeEvaluate(page, () =>
    page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).backgroundColor;
    })
  );
}

/**
 * Check if the page is in dark mode by inspecting actual styles
 */
export async function isPageInDarkMode(page: Page): Promise<boolean> {
  return safeEvaluate(page, () =>
    page.evaluate(() => {
      const html = document.documentElement;
      // Check class-based dark mode
      if (html.classList.contains("dark")) {
        return true;
      }
      // Fallback: check computed background luminance
      const bg = window.getComputedStyle(html).backgroundColor;
      const match = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [, r, g, b] = match.map(Number);
        // Simple luminance check - dark themes have low luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
      }
      return false;
    })
  );
}

/**
 * Wait for theme transition to complete
 */
export async function waitForThemeTransition(page: Page): Promise<void> {
  // Wait for the theme-transitioning class to be removed (provider removes it after 300ms)
  await page.waitForFunction(
    () => document.documentElement?.classList?.contains("theme-transitioning") !== true,
    { timeout: 5000 }
  ).catch(() => {
    // Fallback: if never had the class, that's OK
  });
  // Small buffer for framer-motion animation
  await page.waitForTimeout(200);
}

/**
 * Get the icon displayed in the theme toggle (Sun, Moon, or Monitor)
 */
export async function getThemeToggleIcon(page: Page): Promise<"sun" | "moon" | "monitor" | null> {
  const toggle = getThemeToggleButton(page);

  // Check for lucide icon classes within the button
  const hasSun = await toggle.locator("svg").first().evaluate((svg) => {
    // Lucide icons have specific path attributes
    const pathD = svg.querySelector("path")?.getAttribute("d") || "";
    // Sun icon has a circle path
    return pathD.includes("M12 2v2") || svg.classList.toString().includes("sun");
  }).catch(() => false);

  const hasMoon = await toggle.locator("svg").first().evaluate((svg) => {
    const pathD = svg.querySelector("path")?.getAttribute("d") || "";
    return pathD.includes("M21 12.79") || svg.classList.toString().includes("moon");
  }).catch(() => false);

  const hasMonitor = await toggle.locator("svg").first().evaluate((svg) => {
    const pathD = svg.querySelector("path")?.getAttribute("d") || "";
    return pathD.includes("M2 3h6") || svg.classList.toString().includes("monitor");
  }).catch(() => false);

  if (hasSun) return "sun";
  if (hasMoon) return "moon";
  if (hasMonitor) return "monitor";
  return null;
}
