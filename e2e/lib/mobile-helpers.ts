/**
 * Mobile E2E Test Helpers
 *
 * Utilities for testing responsive layouts and touch interactions.
 */

import type { Page, BrowserContext } from "@playwright/test";

// Standard viewport sizes for testing
export const VIEWPORTS = {
  mobilePortrait: { width: 375, height: 812 },     // iPhone X portrait
  mobileLandscape: { width: 812, height: 375 },    // iPhone X landscape
  tabletPortrait: { width: 768, height: 1024 },    // iPad portrait
  tabletLandscape: { width: 1024, height: 768 },   // iPad landscape
  desktop: { width: 1280, height: 800 },           // Desktop
  desktopLarge: { width: 1920, height: 1080 },     // Large desktop
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

/**
 * Set viewport to a predefined size
 */
export async function setViewport(page: Page, viewport: ViewportName): Promise<void> {
  const size = VIEWPORTS[viewport];
  await page.setViewportSize(size);
}

/**
 * Check if the page is currently in mobile viewport (< 768px)
 */
export async function isMobileViewport(page: Page): Promise<boolean> {
  const viewport = page.viewportSize();
  return viewport ? viewport.width < 768 : false;
}

/**
 * Check if an element has adequate touch target size (min 44px)
 */
export async function hasAdequateTouchTarget(
  page: Page,
  selector: string
): Promise<{ adequate: boolean; width: number; height: number }> {
  const element = page.locator(selector).first();
  const box = await element.boundingBox();

  if (!box) {
    return { adequate: false, width: 0, height: 0 };
  }

  const minSize = 44;
  return {
    adequate: box.width >= minSize && box.height >= minSize,
    width: box.width,
    height: box.height,
  };
}

/**
 * Get the hamburger menu button for mobile navigation
 */
export function getHamburgerMenu(page: Page) {
  return page.getByRole("button", { name: /open menu|close menu/i });
}

/**
 * Check if hamburger menu is visible (indicates mobile view)
 */
export async function isHamburgerMenuVisible(page: Page): Promise<boolean> {
  const menu = getHamburgerMenu(page);
  try {
    await menu.waitFor({ state: "visible", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Open the mobile navigation menu
 */
export async function openMobileMenu(page: Page): Promise<void> {
  const menuButton = getHamburgerMenu(page);
  await menuButton.click();
  // Wait for the sheet to open
  await page.waitForTimeout(300);
}

/**
 * Close the mobile navigation menu
 */
export async function closeMobileMenu(page: Page): Promise<void> {
  // Try clicking the close button or clicking outside
  const closeButton = page.getByRole("button", { name: /close menu/i });
  if (await closeButton.isVisible()) {
    await closeButton.click();
  } else {
    // Click outside the sheet to close
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(300);
}

/**
 * Get the bottom tab bar (visible on mobile)
 * Matches both BottomTabBar (data-tab-bar) and BottomNav (aria-label)
 */
export function getBottomTabBar(page: Page) {
  return page.locator("[data-tab-bar], nav[aria-label='Mobile navigation']");
}

/**
 * Check if bottom tab bar is visible
 */
export async function isBottomTabBarVisible(page: Page): Promise<boolean> {
  const tabBar = getBottomTabBar(page);
  try {
    await tabBar.first().waitFor({ state: "visible", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Tap a bottom tab bar item
 */
export async function tapBottomTab(page: Page, tabLabel: string): Promise<void> {
  const tabBar = getBottomTabBar(page);
  await tabBar.getByText(tabLabel, { exact: true }).click();
}

/**
 * Perform a swipe gesture on an element
 */
export async function swipe(
  page: Page,
  selector: string,
  direction: "left" | "right" | "up" | "down",
  distance = 200
): Promise<void> {
  const element = page.locator(selector).first();
  const box = await element.boundingBox();

  if (!box) {
    throw new Error(`Element not found: ${selector}`);
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  let endX = startX;
  let endY = startY;

  switch (direction) {
    case "left":
      endX = startX - distance;
      break;
    case "right":
      endX = startX + distance;
      break;
    case "up":
      endY = startY - distance;
      break;
    case "down":
      endY = startY + distance;
      break;
  }

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.up();
}

/**
 * Perform a long press on an element
 */
export async function longPress(
  page: Page,
  selector: string,
  duration = 500
): Promise<void> {
  const element = page.locator(selector).first();
  const box = await element.boundingBox();

  if (!box) {
    throw new Error(`Element not found: ${selector}`);
  }

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(duration);
  await page.mouse.up();
}

/**
 * Check for horizontal overflow (indicates mobile layout issues)
 */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    return body.scrollWidth > html.clientWidth;
  });
}

/**
 * Get all interactive elements and check their touch target sizes
 */
export async function auditTouchTargets(
  page: Page
): Promise<Array<{ selector: string; width: number; height: number; adequate: boolean }>> {
  const results: Array<{ selector: string; width: number; height: number; adequate: boolean }> = [];

  // Check buttons, links, and other interactive elements
  const selectors = ["button", "a", "[role='button']", "input", "select", "textarea"];

  for (const selector of selectors) {
    const elements = await page.locator(selector).all();

    for (let i = 0; i < elements.length; i++) {
      const box = await elements[i].boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        const minSize = 44;
        results.push({
          selector: `${selector}[${i}]`,
          width: Math.round(box.width),
          height: Math.round(box.height),
          adequate: box.width >= minSize && box.height >= minSize,
        });
      }
    }
  }

  return results;
}

/**
 * Check if text is readable (minimum font size)
 */
export async function checkMinFontSize(
  page: Page,
  minSize = 16
): Promise<{ allReadable: boolean; issues: Array<{ text: string; fontSize: number }> }> {
  const issues = await page.evaluate((min) => {
    const problems: Array<{ text: string; fontSize: number }> = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text && text.length > 0) {
        const element = node.parentElement;
        if (element) {
          const style = window.getComputedStyle(element);
          const fontSize = parseFloat(style.fontSize);
          if (fontSize < min) {
            problems.push({
              text: text.slice(0, 50),
              fontSize: Math.round(fontSize),
            });
          }
        }
      }
    }

    return problems.slice(0, 10); // Limit to first 10 issues
  }, minSize);

  return {
    allReadable: issues.length === 0,
    issues,
  };
}

/**
 * Scroll and check sticky header behavior
 */
export async function checkStickyHeader(
  page: Page
): Promise<{ isSticky: boolean; hidesOnScroll: boolean }> {
  // Get initial header position
  const header = page.locator("header").first();
  const initialBox = await header.boundingBox();

  if (!initialBox) {
    return { isSticky: false, hidesOnScroll: false };
  }

  // Scroll down
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(300);

  const afterScrollBox = await header.boundingBox();

  // Check if header stayed at top (sticky)
  const isSticky = afterScrollBox ? afterScrollBox.y < 100 : false;

  // Check if header hides (optional behavior)
  const hidesOnScroll = !afterScrollBox || afterScrollBox.y < 0;

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));

  return { isSticky, hidesOnScroll };
}

/**
 * Emulate mobile touch device
 */
export async function emulateMobileDevice(context: BrowserContext): Promise<void> {
  // Note: This should be done when creating the context
  // This is a helper to document the expected configuration
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "maxTouchPoints", {
      get: () => 5,
    });
  });
}

/**
 * Check if cards are stacked (single column) on mobile
 */
export async function areCardsStacked(
  page: Page,
  cardSelector: string
): Promise<boolean> {
  const cards = await page.locator(cardSelector).all();

  if (cards.length < 2) {
    return true; // Can't determine with only one card
  }

  const firstBox = await cards[0].boundingBox();
  const secondBox = await cards[1].boundingBox();

  if (!firstBox || !secondBox) {
    return false;
  }

  // Cards are stacked if the second card is below the first
  return secondBox.y > firstBox.y + firstBox.height - 10;
}

/**
 * Wait for any CSS transitions to complete
 */
export async function waitForTransitions(page: Page): Promise<void> {
  await page.waitForTimeout(350); // Most transitions are 300ms
}
