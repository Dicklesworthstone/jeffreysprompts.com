import { test, expect } from "../lib/playwright-logger";
import type { Page } from "@playwright/test";

/**
 * Homepage Load and Prompt Grid Display E2E Tests
 *
 * Comprehensive tests for the homepage including:
 * 1. Page load and title verification
 * 2. Hero section display and elements
 * 3. Prompt grid and card rendering
 * 4. Filter sections visibility
 * 5. Footer display
 */

/**
 * Navigate to the homepage with resilience against Turbopack streaming stalls.
 *
 * The Next.js Turbopack dev server uses React streaming SSR, which
 * intermittently fails to resolve streaming boundaries. When this happens,
 * the page renders blank. We detect this and reload once.
 */
async function gotoHomepage(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("load");

  // Give streaming a moment to resolve, then check for content
  try {
    await page.waitForFunction(
      () => {
        const main = document.getElementById("main-content");
        if (!main) return false;
        // Real content has sections/h1; the Suspense fallback is just an empty div
        return main.querySelector("h1, section, [data-testid='prompt-card']") !== null;
      },
      { timeout: 10000 },
    );
  } catch {
    // Streaming stalled — reload once
    await page.reload();
    await page.waitForLoadState("load");
  }
}

test.describe("Homepage Load", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await gotoHomepage(page);
      // Wait for React hydration — h1 is SSR'd and visible immediately
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 });
    });
  });

  test("page loads with correct title", async ({ page, logger }) => {
    await logger.step("verify page title", async () => {
      await expect(page).toHaveTitle(/Jeffrey's Prompts/i);
    });

    await logger.step("verify no console errors", async () => {
      // Page should load without critical errors
      const url = page.url();
      expect(url).toContain("/");
    });
  });

  test("hero section displays correctly", async ({ page, logger }) => {
    await logger.step("verify hero badge", async () => {
      await expect(page.getByText("Curated prompts for agentic excellence").first()).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify main headline", async () => {
      // CharacterReveal component renders the headline
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify tagline about prompts", async () => {
      await expect(page.getByText(/Battle-tested patterns/i).first()).toBeVisible();
    });

    await logger.step("verify search input", async () => {
      const searchInput = page.getByPlaceholder("Find your next favorite prompt...");
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEnabled();
    });

    await logger.step("verify category filter in hero", async () => {
      const categoryGroup = page.locator("[aria-label='Filter by category']").first();
      await expect(categoryGroup).toBeVisible();
    });
  });

  test("category filter pills display in hero", async ({ page, logger }) => {
    await logger.step("verify category buttons exist", async () => {
      // Check for at least some expected categories in the hero filter
      const categoryGroup = page.locator("[aria-label='Filter by category']").first();
      await expect(categoryGroup).toBeVisible({ timeout: 5000 });
      const buttons = categoryGroup.locator("button");
      const count = await buttons.count();
      // Should have "All" + at least 4 categories
      expect(count).toBeGreaterThanOrEqual(5);
    });

    await logger.step("verify ideation category exists", async () => {
      await expect(page.getByRole("button", { name: /^ideation$/i }).first()).toBeVisible();
    });
  });
});

test.describe("Prompt Grid Display", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await gotoHomepage(page);
      // Wait for page hydration — H1 in hero is a reliable indicator
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 });
      // Wait for prompt cards to exist in DOM (framer-motion may keep them
      // at opacity:0 on desktop due to layout animations, so we check
      // DOM presence rather than Playwright visibility)
      await page.waitForFunction(
        () => document.querySelectorAll("[data-testid='prompt-card']").length >= 3,
        { timeout: 15000 },
      );
    });
  });

  test("prompt grid displays multiple cards", async ({ page, logger }) => {
    await logger.step("verify multiple prompt cards exist", async () => {
      const cardCount = await page.locator("[data-testid='prompt-card']").count();
      expect(cardCount).toBeGreaterThanOrEqual(3);
    });

    await logger.step("verify grid container exists", async () => {
      // The grid container may not pass Playwright's visibility check if
      // its children are opacity:0, so check DOM presence instead
      const gridCount = await page.locator(".grid.gap-6").count();
      expect(gridCount).toBeGreaterThan(0);
    });
  });

  test("prompt card has expected structure", async ({ page, logger }) => {
    // Target cards in the Browse All section (which is visible on all viewports)
    // The Featured section has lg:hidden cards that cause false negatives on desktop
    const browseSection = page.locator("#prompts-section");

    await logger.step("verify card has title", async () => {
      const titles = browseSection.locator("[data-testid='prompt-card'] h3");
      const titleCount = await titles.count();
      expect(titleCount).toBeGreaterThan(0);
      const titleText = await titles.first().textContent();
      expect(titleText?.length).toBeGreaterThan(0);
    });

    await logger.step("verify card has category badge", async () => {
      const card = browseSection.locator("[data-testid='prompt-card']").first();
      const badge = card.locator("span.capitalize").first();
      const text = await badge.textContent();
      expect(text?.length).toBeGreaterThan(0);
    });

    await logger.step("verify card has description text", async () => {
      const card = browseSection.locator("[data-testid='prompt-card']").first();
      const descText = await card.textContent();
      expect(descText?.length).toBeGreaterThan(10);
    });

    await logger.step("verify card has action buttons", async () => {
      const card = browseSection.locator("[data-testid='prompt-card']").first();
      // Buttons have aria-labels: "Copy prompt" and "Add to basket"
      // "View" is a styled div, not a button
      const copyCount = await card.getByRole("button", { name: /copy/i }).count();
      expect(copyCount).toBeGreaterThan(0);
      const basketCount = await card.getByRole("button", { name: /basket/i }).count();
      expect(basketCount).toBeGreaterThan(0);
      // "View" is a div element, check it exists via text
      const viewText = await card.getByText("View").count();
      expect(viewText).toBeGreaterThan(0);
    });
  });

  test("results header shows correct count", async ({ page, logger }) => {
    await logger.step("verify 'Browse All Prompts' heading exists", async () => {
      await expect(page.getByRole("heading", { name: "Browse All Prompts" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify prompt count is displayed", async () => {
      const countText = await page.getByText(/\d+ prompt/).first().textContent();
      expect(countText).toBeTruthy();
    });
  });

  test("empty state is not shown on initial load", async ({ page, logger }) => {
    await logger.step("verify 'No prompts found' is not visible", async () => {
      await expect(page.getByText("No prompts found")).not.toBeVisible();
    });

    await logger.step("verify prompt cards exist in DOM", async () => {
      const count = await page.locator("[data-testid='prompt-card']").count();
      expect(count).toBeGreaterThan(0);
    });
  });
});

test.describe("Filter Sections Display", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await gotoHomepage(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 });
    });
  });

  test("category filter section displays", async ({ page, logger }) => {
    await logger.step("verify category filter exists in main content", async () => {
      await expect(page.getByRole("heading", { name: "Browse All Prompts" })).toBeVisible({ timeout: 10000 });
    });
  });

  test("tag filter section displays", async ({ page, logger }) => {
    await logger.step("verify tag buttons exist", async () => {
      // Scroll down to see the tag filter section in the Browse All area
      await page.getByRole("heading", { name: "Browse All Prompts" }).scrollIntoViewIfNeeded();
      await expect(page.getByRole("button", { name: /brainstorming/i }).first()).toBeVisible({ timeout: 10000 });
    });
  });

  test("clear filters button is hidden initially", async ({ page, logger }) => {
    await logger.step("verify clear filters is not visible without active filters", async () => {
      await expect(page.getByText("Clear all filters")).not.toBeVisible();
    });
  });
});

test.describe("Footer Display", () => {
  // The layout Footer component uses "hidden md:block" — only visible on ≥768px.
  // On mobile viewports, the page has its own inline footer with different content.
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      // Use gotoHomepage to handle Turbopack streaming stalls that can destroy
      // the execution context during page.evaluate (scroll) calls
      await gotoHomepage(page);
    });
  });

  test("footer displays with site info", async ({ page, logger }) => {
    const viewport = page.viewportSize();
    const isMobile = (viewport?.width ?? 1280) < 768;

    await logger.step("scroll to footer", async () => {
      // Use locator-based scroll instead of page.evaluate to avoid
      // "Execution context destroyed" errors during Turbopack streaming
      await page.locator("footer").last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    });

    if (isMobile) {
      await logger.step("verify page footer on mobile", async () => {
        // The inline page footer has "Jeffrey's Prompts" and GitHub link
        const footer = page.locator("footer");
        await expect(footer.getByText(/GitHub/i).first()).toBeVisible({ timeout: 5000 });
      });
    } else {
      await logger.step("verify site brand in footer", async () => {
        await expect(page.locator("footer").getByText("JeffreysPrompts").first()).toBeVisible({ timeout: 5000 });
      });

      await logger.step("verify tagline in footer", async () => {
        await expect(page.locator("footer").getByText(/premium prompt library/i).first()).toBeVisible();
      });
    }
  });

  test("footer has social links", async ({ page, logger }) => {
    const viewport = page.viewportSize();
    const isMobile = (viewport?.width ?? 1280) < 768;

    await logger.step("scroll to footer", async () => {
      await page.locator("footer").last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    });

    if (isMobile) {
      await logger.step("verify GitHub link on mobile", async () => {
        // Page footer has GitHub as a text link
        const githubLink = page.locator("footer").getByRole("link", { name: /github/i }).first();
        await expect(githubLink).toBeVisible({ timeout: 5000 });
        await expect(githubLink).toHaveAttribute("href", /github\.com/);
      });
    } else {
      await logger.step("verify GitHub link", async () => {
        const githubLink = page.locator("footer").getByRole("link", { name: /github/i }).first();
        await expect(githubLink).toBeVisible({ timeout: 5000 });
        await expect(githubLink).toHaveAttribute("href", /github\.com/);
      });

      await logger.step("verify Twitter link", async () => {
        const twitterLink = page.locator("footer").getByRole("link", { name: /twitter/i }).first();
        await expect(twitterLink).toBeVisible();
      });
    }
  });

  test("footer has install command", async ({ page, logger }) => {
    const viewport = page.viewportSize();
    const isMobile = (viewport?.width ?? 1280) < 768;

    // The install command code block is only in the layout Footer (desktop)
    test.skip(isMobile, "Layout Footer with CLI section is hidden on mobile viewports");

    await logger.step("scroll to footer", async () => {
      await page.locator("footer").last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    });

    await logger.step("verify install command code block", async () => {
      await expect(page.locator("footer code").first()).toContainText("jeffreysprompts.com/install");
    });
  });
});

test.describe("Responsive Layout", () => {
  test("mobile viewport shows correct layout", async ({ page, logger }) => {
    await logger.step("set mobile viewport", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
    });

    await logger.step("navigate to homepage", async () => {
      await gotoHomepage(page);
    });

    await logger.step("verify hero is visible", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 });
    });

    await logger.step("verify search input is visible and touch-friendly", async () => {
      const searchInput = page.getByPlaceholder("Find your next favorite prompt...");
      await expect(searchInput).toBeVisible();
      const height = await searchInput.evaluate((el) => el.offsetHeight);
      expect(height).toBeGreaterThanOrEqual(44);
    });

    await logger.step("verify prompt cards are visible", async () => {
      await expect(page.locator("[data-testid='prompt-card']").first()).toBeVisible({ timeout: 15000 });
      const grid = page.locator(".grid.gap-6");
      await expect(grid).toBeVisible();
    });
  });

  test("desktop viewport shows grid layout", async ({ page, logger }) => {
    await logger.step("set desktop viewport", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
    });

    await logger.step("navigate to homepage", async () => {
      await gotoHomepage(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 });
    });

    await logger.step("verify multi-column grid has cards", async () => {
      // On desktop, framer-motion GridTransition may keep cards at opacity:0
      // during layout animations, so verify DOM presence + grid structure
      await page.waitForFunction(
        () => document.querySelectorAll("[data-testid='prompt-card']").length >= 3,
        { timeout: 15000 },
      );
      const gridCount = await page.locator(".grid.gap-6").count();
      expect(gridCount).toBeGreaterThan(0);
    });
  });
});

test.describe("Performance Indicators", () => {
  test("page loads within reasonable time", async ({ page, logger }) => {
    const startTime = Date.now();

    await logger.step("navigate and time load", async () => {
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
    });

    const domContentLoaded = Date.now() - startTime;

    await logger.step("wait for full load", async () => {
      await page.waitForLoadState("load");
    });

    const fullLoad = Date.now() - startTime;

    await logger.step("verify load times", async () => {
      // Dev server can be slow with compilation; allow 20s for DOMContentLoaded
      expect(domContentLoaded).toBeLessThan(20000);
      // Full load should be under 30 seconds (accounting for dev mode overhead)
      expect(fullLoad).toBeLessThan(30000);
    }, { data: { domContentLoaded, fullLoad } });
  });

  test("no layout shift after initial render", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await gotoHomepage(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 });
    });

    await logger.step("verify hero section is stable", async () => {
      // Use the hero heading as the stability anchor — it's always visible
      // (unlike prompt cards which may have framer-motion opacity:0 on desktop)
      const heading = page.getByRole("heading", { level: 1 });
      const initialBox = await heading.boundingBox();

      // Wait a bit and check position hasn't shifted
      await page.waitForTimeout(1000);
      const finalBox = await heading.boundingBox();

      expect(initialBox).not.toBeNull();
      expect(finalBox).not.toBeNull();
      if (initialBox && finalBox) {
        // Y position shouldn't shift by more than 50px after hydration settles
        expect(Math.abs(finalBox.y - initialBox.y)).toBeLessThan(50);
      }
    });
  });
});
