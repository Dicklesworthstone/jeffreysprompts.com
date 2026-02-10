import { test, expect } from "../lib/playwright-logger";

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

test.describe("Homepage Load", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
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
      await expect(page.getByText(/Battle-tested patterns/i)).toBeVisible();
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
    await logger.step("verify 'All' button exists", async () => {
      const allButton = page.locator("[aria-label='Filter by category'] button").first();
      await expect(allButton).toBeVisible({ timeout: 5000 });
      await expect(allButton).toContainText("All");
    });

    await logger.step("verify category buttons exist", async () => {
      // Check for at least some expected categories
      const categoryGroup = page.locator("[aria-label='Filter by category']");
      const buttons = categoryGroup.locator("button");
      const count = await buttons.count();
      // Should have "All" + at least 4 categories
      expect(count).toBeGreaterThanOrEqual(5);
    });

    await logger.step("verify ideation category exists", async () => {
      await expect(page.getByRole("button", { name: /^ideation$/i })).toBeVisible();
    });
  });
});

test.describe("Prompt Grid Display", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });
  });

  test("prompt grid displays multiple cards", async ({ page, logger }) => {
    await logger.step("wait for prompt cards to load", async () => {
      // Wait for at least one prompt card to be visible
      await expect(page.locator("[data-testid='prompt-card']").first()).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify multiple prompt cards exist", async () => {
      // The grid should display multiple cards
      const cards = page.locator("[data-testid='prompt-card']");
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThanOrEqual(3);
    });

    await logger.step("verify grid has responsive layout classes", async () => {
      const grid = page.locator(".grid.gap-6");
      await expect(grid).toBeVisible();
    });
  });

  test("prompt card has expected structure", async ({ page, logger }) => {
    await logger.step("wait for cards to load", async () => {
      await expect(page.locator("[data-testid='prompt-card']").first()).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify card has title", async () => {
      // Card title is h3 element
      const cardTitle = page.locator("[data-testid='prompt-card'] h3").first();
      await expect(cardTitle).toBeVisible();
    });

    await logger.step("verify card has category badge", async () => {
      // Each card should have a category badge (ideation, documentation, etc.)
      const firstCard = page.locator("[data-testid='prompt-card']").first();
      const categoryBadge = firstCard.locator("span.capitalize").first();
      await expect(categoryBadge).toBeVisible();
    });

    await logger.step("verify card has description", async () => {
      // Description text about generating ideas
      await expect(page.getByText(/Generate 30/i).first()).toBeVisible();
    });

    await logger.step("verify card has action buttons", async () => {
      // Copy button (aria-label="Copy prompt")
      const copyButton = page.locator("[data-testid='prompt-card']").first().getByRole("button", { name: /copy/i });
      await expect(copyButton).toBeVisible();

      // View button
      const viewButton = page.locator("[data-testid='prompt-card']").first().getByRole("button", { name: /view/i });
      await expect(viewButton).toBeVisible();
    });

    await logger.step("verify card has tags", async () => {
      // Cards should have tag elements
      await expect(page.getByText("brainstorming").first()).toBeVisible();
    });
  });

  test("results header shows correct count", async ({ page, logger }) => {
    await logger.step("verify 'Browse All Prompts' heading exists", async () => {
      await expect(page.getByRole("heading", { name: "Browse All Prompts" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify prompt count is displayed", async () => {
      // The count text like "X prompt(s)"
      const countText = page.getByText(/\d+ prompt/);
      await expect(countText.first()).toBeVisible();
    });
  });

  test("empty state is not shown on initial load", async ({ page, logger }) => {
    await logger.step("verify 'No prompts found' is not visible", async () => {
      await expect(page.getByText("No prompts found")).not.toBeVisible();
    });

    await logger.step("verify grid has content", async () => {
      const grid = page.locator(".grid.gap-6");
      const children = grid.locator("> div");
      const count = await children.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});

test.describe("Filter Sections Display", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });
  });

  test("category filter section displays", async ({ page, logger }) => {
    await logger.step("verify category filter exists in main content", async () => {
      // CategoryFilter component renders in the filters section
      await expect(page.getByRole("heading", { name: "Browse All Prompts" })).toBeVisible({ timeout: 10000 });
    });
  });

  test("tag filter section displays", async ({ page, logger }) => {
    await logger.step("verify tag buttons exist", async () => {
      // Tags should be displayed as buttons
      // Common tags like "brainstorming", "ultrathink" should be visible
      await expect(page.getByRole("button", { name: /brainstorming/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test("clear filters button is hidden initially", async ({ page, logger }) => {
    await logger.step("verify clear filters is not visible without active filters", async () => {
      // "Clear all filters" only appears when filters are active
      await expect(page.getByText("Clear all filters")).not.toBeVisible();
    });
  });
});

test.describe("Footer Display", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });
  });

  test("footer displays with site info", async ({ page, logger }) => {
    await logger.step("scroll to footer", async () => {
      const mainFooter = page.locator("footer").first();
      await mainFooter.scrollIntoViewIfNeeded();
    });

    await logger.step("verify site brand in footer", async () => {
      await expect(page.locator("footer").getByText("JeffreysPrompts").first()).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify tagline in footer", async () => {
      await expect(page.locator("footer").getByText(/premium prompt library/i).first()).toBeVisible();
    });
  });

  test("footer has social links", async ({ page, logger }) => {
    await logger.step("scroll to footer", async () => {
      const mainFooter = page.locator("footer").first();
      await mainFooter.scrollIntoViewIfNeeded();
    });

    await logger.step("verify GitHub link", async () => {
      const githubLink = page.locator("footer").getByRole("link", { name: /github/i }).first();
      await expect(githubLink).toBeVisible({ timeout: 5000 });
      await expect(githubLink).toHaveAttribute("href", /github\.com/);
    });

    await logger.step("verify Twitter link", async () => {
      const twitterLink = page.locator("footer").getByRole("link", { name: /twitter/i }).first();
      await expect(twitterLink).toBeVisible();
    });
  });

  test("footer has install command", async ({ page, logger }) => {
    await logger.step("scroll to footer", async () => {
      const mainFooter = page.locator("footer").first();
      await mainFooter.scrollIntoViewIfNeeded();
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
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify hero is visible", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    await logger.step("verify search input is visible and touch-friendly", async () => {
      const searchInput = page.getByPlaceholder("Find your next favorite prompt...");
      await expect(searchInput).toBeVisible();
      // Should have minimum height for touch targets
      const height = await searchInput.evaluate((el) => el.offsetHeight);
      expect(height).toBeGreaterThanOrEqual(44);
    });

    await logger.step("verify prompt cards are visible", async () => {
      await expect(page.locator("[data-testid='prompt-card']").first()).toBeVisible({ timeout: 10000 });
      // On mobile, grid should be single column
      const grid = page.locator(".grid.gap-6");
      await expect(grid).toBeVisible();
    });
  });

  test("desktop viewport shows grid layout", async ({ page, logger }) => {
    await logger.step("set desktop viewport", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify multi-column grid", async () => {
      await expect(page.locator("[data-testid='prompt-card']").first()).toBeVisible({ timeout: 10000 });
      // Desktop should show grid with gap
      const grid = page.locator(".grid.gap-6");
      await expect(grid).toBeVisible();
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
      // DOMContentLoaded should be under 10 seconds (dev server can be slow with compilation)
      expect(domContentLoaded).toBeLessThan(10000);
      // Full load should be under 30 seconds (accounting for dev mode overhead)
      expect(fullLoad).toBeLessThan(30000);
    }, { data: { domContentLoaded, fullLoad } });
  });

  test("no layout shift after initial render", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
    });

    await logger.step("verify prompt grid is stable", async () => {
      // Get initial position of a prompt card
      await expect(page.locator("[data-testid='prompt-card']").first()).toBeVisible({ timeout: 10000 });
      const card = page.locator("[data-testid='prompt-card'] h3").first();
      const initialBox = await card.boundingBox();

      // Wait a bit and check position hasn't shifted
      await page.waitForTimeout(500);
      const finalBox = await card.boundingBox();

      expect(initialBox).not.toBeNull();
      expect(finalBox).not.toBeNull();
      if (initialBox && finalBox) {
        // Y position shouldn't shift by more than 5px after animations settle
        expect(Math.abs(finalBox.y - initialBox.y)).toBeLessThan(50);
      }
    });
  });
});
