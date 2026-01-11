/**
 * Theme E2E Test Helpers
 *
 * Utilities for testing dark mode and theme switching functionality.
 */

import type { Page } from "@playwright/test";

export type ThemeValue = "light" | "dark" | "system";

/**
 * Get the current theme from the document element's class list
 */
export async function getCurrentTheme(page: Page): Promise<"light" | "dark"> {
  return page.evaluate(() => {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });
}

/**
 * Get the theme preference stored in localStorage
 */
export async function getStoredTheme(page: Page): Promise<ThemeValue | null> {
  return page.evaluate(() => {
    const stored = localStorage.getItem("jfp-theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    return null;
  });
}

/**
 * Set a theme preference directly in localStorage (for testing initial states)
 */
export async function setStoredTheme(
  page: Page,
  theme: ThemeValue | null
): Promise<void> {
  await page.evaluate((t) => {
    if (t === null) {
      localStorage.removeItem("jfp-theme");
    } else {
      localStorage.setItem("jfp-theme", t);
    }
  }, theme);
}

/**
 * Clear the stored theme preference
 */
export async function clearStoredTheme(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("jfp-theme");
  });
}

/**
 * Click the theme toggle button to cycle to the next theme
 */
export async function clickThemeToggle(page: Page): Promise<void> {
  const toggleButton = getThemeToggleButton(page);
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
  return page.evaluate(() => {
    const body = document.body;
    return window.getComputedStyle(body).backgroundColor;
  });
}

/**
 * Check if the page is in dark mode by inspecting actual styles
 */
export async function isPageInDarkMode(page: Page): Promise<boolean> {
  return page.evaluate(() => {
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
  });
}

/**
 * Wait for theme transition to complete
 */
export async function waitForThemeTransition(page: Page): Promise<void> {
  // Theme transitions are 300ms
  await page.waitForTimeout(350);
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
