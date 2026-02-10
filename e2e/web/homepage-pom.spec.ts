/**
 * Homepage E2E Tests using Page Object Model
 *
 * This spec demonstrates the enhanced testing patterns:
 * - Page Objects for encapsulated interactions
 * - Console error monitoring
 * - Hydration error detection
 * - Mobile/desktop responsive checks
 *
 * Design notes:
 * - Uses DOM presence checks for prompt cards (framer-motion GridTransition renders at opacity:0)
 * - Footer tests are viewport-aware (layout Footer uses "hidden md:block")
 * - Streaming stall recovery is handled by HomePage.goto()
 *
 * Run with: bunx playwright test --config e2e/playwright.config.ts e2e/web/homepage-pom.spec.ts
 */

import { test, expect } from "../fixtures/pages";

test.describe("Homepage - Page Object Model", () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test("loads without console errors", async ({ homePage, assertNoConsoleErrors }) => {
    await homePage.waitForPageLoad();

    // Assert no unexpected console errors occurred
    await assertNoConsoleErrors();
  });

  test("has no hydration mismatches", async ({ homePage }) => {
    await homePage.waitForPageLoad();

    // Check for hydration errors (SSR/client mismatch)
    expect(homePage.hasHydrationErrors()).toBe(false);
  });

  test("displays hero section correctly", async ({ homePage }) => {
    // Verify headline is visible
    await homePage.assertVisible(homePage.headline);

    // Verify search input is functional
    await homePage.assertVisible(homePage.searchInput);
    await expect(homePage.searchInput).toBeEnabled();

    // Verify tagline about prompts
    await homePage.assertVisible(homePage.tagline);
  });

  test("displays prompt grid with multiple cards", async ({ homePage }) => {
    await homePage.waitForPromptCards(3);
    const cardCount = await homePage.getPromptCardCount();
    expect(cardCount).toBeGreaterThanOrEqual(3);
  });

  test("can search for prompts", async ({ homePage }) => {
    await homePage.waitForPromptCards(3);

    // Search for a specific term
    await homePage.search("code");

    // Wait for filter to apply
    await homePage.page.waitForTimeout(500);

    // Should still have some results
    const cardCount = await homePage.getPromptCardCount();
    expect(cardCount).toBeGreaterThan(0);
  });

  test("can filter by category", async ({ homePage }) => {
    await homePage.waitForPromptCards(3);

    // Get available categories
    const categories = await homePage.getCategoryButtons();
    expect(categories.length).toBeGreaterThanOrEqual(5);

    // Select a specific category
    if (categories.some((c) => c.toLowerCase() === "ideation")) {
      await homePage.selectCategory("ideation");

      // Wait for filtered prompt cards to appear in the DOM
      await homePage.waitForPromptCards(1, 10000);
      const titles = await homePage.getPromptTitles();
      expect(titles.length).toBeGreaterThan(0);
    }
  });

  test("displays stats counters", async ({ homePage }) => {
    // Check for prompt count stat
    const promptCount = await homePage.getStatValue("Prompts");
    expect(promptCount).not.toBeNull();

    // Check for category count stat
    const categoryCount = await homePage.getStatValue("Categories");
    expect(categoryCount).not.toBeNull();
  });

  test("footer displays correctly", async ({ homePage }) => {
    const isMobile = homePage.isMobile();

    await homePage.scrollToFooter();

    if (isMobile) {
      // Mobile has inline page footer with GitHub link
      await expect(homePage.footer.getByText(/GitHub/i).first()).toBeVisible({ timeout: 5000 });
    } else {
      // Desktop layout footer
      const siteName = await homePage.getFooterSiteName();
      expect(siteName).toContain("JeffreysPrompts");

      // Verify social links exist
      await homePage.assertVisible(homePage.githubLink, { timeout: 5000 });
      await homePage.assertVisible(homePage.twitterLink);

      // Verify install command
      const installCmd = await homePage.getInstallCommand();
      expect(installCmd).toContain("jeffreysprompts.com/install");
    }
  });
});

test.describe("Homepage - Responsive Layout", () => {
  test("mobile layout is touch-friendly", async ({ homePage, page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    await homePage.goto();
    await homePage.waitForPageLoad();

    // Verify mobile layout
    await homePage.assertMobileLayout();
  });

  test("desktop layout shows multi-column grid", async ({ homePage, page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    await homePage.goto();
    await homePage.waitForPageLoad();
    await homePage.waitForPromptCards(3);

    // Verify desktop layout — checks grid container exists in DOM
    await homePage.assertDesktopLayout();

    // Should have multiple cards in DOM
    const cardCount = await homePage.getPromptCardCount();
    expect(cardCount).toBeGreaterThan(0);
  });

  test("tablet layout works correctly", async ({ homePage, page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await homePage.goto();

    // Page should load without errors
    await homePage.waitForPageLoad();
  });
});

test.describe("Homepage - Performance", () => {
  test("page loads within acceptable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const domContentLoaded = Date.now() - startTime;

    await page.waitForLoadState("load");
    const fullLoad = Date.now() - startTime;

    // Dev server can be slow with compilation; allow 20s for DOMContentLoaded
    expect(domContentLoaded).toBeLessThan(20000);

    // Full load should be under 30 seconds (accounting for dev mode overhead)
    expect(fullLoad).toBeLessThan(30000);
  });

  test("no layout shift after render", async ({ homePage }) => {
    await homePage.goto();
    await homePage.waitForPageLoad();

    // Use the hero heading as the stability anchor (always visible, unlike
    // prompt cards which may have framer-motion opacity:0 on desktop)
    const heading = homePage.headline;
    const initialBox = await heading.boundingBox();

    // Wait a bit and check position hasn't shifted
    await homePage.page.waitForTimeout(1000);
    const finalBox = await heading.boundingBox();

    expect(initialBox).not.toBeNull();
    expect(finalBox).not.toBeNull();
    if (initialBox && finalBox) {
      // Y position shouldn't shift by more than 50px after hydration settles
      expect(Math.abs(finalBox.y - initialBox.y)).toBeLessThan(50);
    }
  });
});

test.describe("Homepage - Network Resilience", () => {
  test("handles slow network gracefully", async ({ homePage, page }) => {
    // Simulate slow 3G — note: in dev mode Turbopack serves large unminified
    // bundles, so the simulated throughput needs to be higher than production
    const client = await page.context().newCDPSession(page);
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: (1500 * 1024) / 8, // 1.5 Mbps (slow but viable for dev bundles)
      uploadThroughput: (500 * 1024) / 8,
      latency: 200, // 200ms
    });

    await homePage.goto();

    // Should still load (with longer timeout for dev mode)
    await homePage.waitForPageLoad(45000);

    // Should have at least the hero heading visible
    await homePage.assertVisible(homePage.headline);
  });
});

test.describe("Homepage - Accessibility Basics", () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.waitForPageLoad();
  });

  test("has proper heading hierarchy", async ({ homePage }) => {
    // Should have exactly one h1
    const h1Count = await homePage.page.locator("h1").count();
    expect(h1Count).toBe(1);

    // h1 should be visible
    await homePage.assertVisible(homePage.headline);
  });

  test("search input is accessible", async ({ homePage }) => {
    // Search input should be visible and enabled
    await homePage.assertVisible(homePage.searchInput);
    await expect(homePage.searchInput).toBeEnabled();

    // Should have placeholder for context
    const placeholder = await homePage.searchInput.getAttribute("placeholder");
    expect(placeholder).toBeTruthy();
  });

  test("category buttons have accessible names", async ({ homePage }) => {
    // Category filter group should have aria-label
    await homePage.assertVisible(homePage.categoryFilterGroup);

    // Each category button should have text content
    const categories = await homePage.getCategoryButtons();
    expect(categories.length).toBeGreaterThanOrEqual(5);
    for (const cat of categories) {
      expect(cat.length).toBeGreaterThan(0);
    }
  });
});
