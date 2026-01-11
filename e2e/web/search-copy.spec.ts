import { test, expect } from "../lib/playwright-logger";

/**
 * Search & Copy Flow E2E Tests
 *
 * Tests the critical user journey:
 * 1. Load homepage
 * 2. Search for prompts
 * 3. View prompt details
 * 4. Copy prompt to clipboard
 */

test.describe("Search & Copy Flow", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("homepage loads with prompt cards", async ({ page, logger }) => {
    await logger.step("verify title", async () => {
      await expect(page).toHaveTitle(/Jeffrey's Prompts/i);
    });

    await logger.step("verify prompt card visible", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
    });
  });

  test("can navigate to prompt detail modal", async ({ page, logger }) => {
    await logger.step("wait for prompts", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
    });

    await logger.step("open prompt modal", async () => {
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await expect(viewButton).toBeVisible();
      await viewButton.click();
    });

    await logger.step("confirm dialog visible", async () => {
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2000 });
    });
  });

  test("prompt detail page has copy button", async ({ page, logger }) => {
    await logger.step("navigate to prompt page", async () => {
      await page.goto("/prompts/idea-wizard");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify copy button", async () => {
      const copyButton = page.getByRole("button", { name: /copy/i });
      await expect(copyButton).toBeVisible();
    });
  });

  test("copy button shows success feedback", async ({ page, context, logger }) => {
    await logger.step("grant clipboard permissions", async () => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    });

    await logger.step("open prompt page", async () => {
      await page.goto("/prompts/idea-wizard");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("click copy button", async () => {
      const copyButton = page.getByRole("button", { name: /copy/i });
      await copyButton.click();
    });

    await logger.step("verify copied feedback", async () => {
      await expect(page.getByText(/copied/i).first()).toBeVisible({ timeout: 3000 });
    });

    await logger.step("verify clipboard contents", async () => {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain("Come up with your very best ideas for improving this project.");
    });
  });

  test("back navigation works from prompt detail", async ({ page, logger }) => {
    await logger.step("open prompt page", async () => {
      await page.goto("/prompts/idea-wizard");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("click back link", async () => {
      const backLink = page.getByRole("link", { name: /back to prompts/i });
      await backLink.click();
    });

    await logger.step("verify homepage url", async () => {
      await expect(page).toHaveURL("/");
    });
  });

  test("search submit updates results", async ({ page, logger }) => {
    await logger.step("enter search query", async () => {
      const searchInput = page.getByPlaceholder("Search prompts...");
      await searchInput.fill("wizard");
      await searchInput.press("Enter");
    });

    await logger.step("verify search results header", async () => {
      await expect(page.getByRole("heading", { name: /search results/i })).toBeVisible({ timeout: 2000 });
    });
  });

  test("search input debounces and updates results", async ({ page, logger }) => {
    await logger.step("type search query", async () => {
      const searchInput = page.getByPlaceholder("Search prompts...");
      await searchInput.fill("wizard");
    });

    await logger.step("wait for debounce", async () => {
      await page.waitForTimeout(350);
    });

    await logger.step("verify url and results", async () => {
      await expect(page).toHaveURL(/\?q=wizard/);
      await expect(page.getByRole("heading", { name: /search results/i })).toBeVisible({ timeout: 2000 });
      await expect(page.getByText(/for "wizard"/i)).toBeVisible({ timeout: 2000 });
    });
  });
});

test.describe("Filter Flow", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("can filter by category", async ({ page, logger }) => {
    await logger.step("wait for heading", async () => {
      await expect(page.getByRole("heading", { name: "All Prompts" })).toBeVisible({ timeout: 10000 });
    });

    await logger.step("select ideation category", async () => {
      const ideationButton = page.getByRole("button", { name: /ideation/i }).first();
      await expect(ideationButton).toBeVisible();
      await ideationButton.click();
    });

    await logger.step("verify category heading", async () => {
      await expect(page.getByRole("heading", { name: /ideation/i })).toBeVisible({ timeout: 2000 });
    });
  });

  test("can filter by tag", async ({ page, logger }) => {
    await logger.step("select a tag", async () => {
      const tagButton = page.getByRole("button", { name: /brainstorming/i });
      await expect(tagButton).toBeVisible();
      await tagButton.click();
    });

    await logger.step("verify tag filter reflected", async () => {
      await expect(page.getByText(/with tags:/i)).toBeVisible({ timeout: 2000 });
    });
  });

  test("category and tag filters work together and clear", async ({ page, logger }) => {
    await logger.step("select ideation category", async () => {
      const ideationButton = page.getByRole("button", { name: /ideation/i }).first();
      await expect(ideationButton).toBeVisible();
      await ideationButton.click();
    });

    await logger.step("select brainstorming tag", async () => {
      const tagButton = page.getByRole("button", { name: /brainstorming/i });
      await expect(tagButton).toBeVisible();
      await tagButton.click();
    });

    await logger.step("verify combined filters in summary", async () => {
      await expect(page.getByRole("heading", { name: /ideation/i })).toBeVisible({ timeout: 2000 });
      await expect(page.getByText(/with tags:/i)).toBeVisible({ timeout: 2000 });
    });

    await logger.step("clear all filters", async () => {
      const clearButton = page.getByRole("button", { name: /clear all filters/i });
      await expect(clearButton).toBeVisible();
      await clearButton.click();
    });

    await logger.step("verify filters cleared", async () => {
      await expect(page.getByRole("heading", { name: "All Prompts" })).toBeVisible({ timeout: 2000 });
      await expect(page.getByText(/with tags:/i)).not.toBeVisible();
    });
  });
});

test.describe("Basket Flow", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("wait for prompts", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
    });
  });

  test("add and remove prompts from basket", async ({ page, logger }) => {
    await logger.step("add prompt to basket", async () => {
      const addButton = page.getByRole("button", { name: /^add$/i }).first();
      await addButton.click();
    });

    await logger.step("open basket", async () => {
      const basketButton = page.getByRole("button", { name: /open basket/i });
      await basketButton.click();
    });

    await logger.step("verify basket list populated", async () => {
      await expect(page.getByText("Basket")).toBeVisible();
      await expect(page.getByText(/idea wizard/i)).toBeVisible({ timeout: 2000 });
    });

    await logger.step("remove item from basket", async () => {
      const basketItem = page.locator("aside ul li").first();
      const removeButton = basketItem.getByRole("button");
      await removeButton.click();
    });

    await logger.step("verify basket empty", async () => {
      await expect(page.getByText(/your basket is empty/i)).toBeVisible({ timeout: 2000 });
    });
  });

  test("basket exports markdown and skills", async ({ page, logger }) => {
    await logger.step("add two prompts", async () => {
      const addButtons = page.getByRole("button", { name: /^add$/i });
      await addButtons.nth(0).click();
      await addButtons.nth(1).click();
    });

    await logger.step("open basket", async () => {
      const basketButton = page.getByRole("button", { name: /open basket/i });
      await basketButton.click();
    });

    await logger.step("download markdown zip", async () => {
      const downloadButton = page.getByRole("button", { name: /download as markdown/i });
      const [filename] = await Promise.all([
        page.waitForEvent("download").then((download) => download.suggestedFilename()),
        downloadButton.click(),
      ]);
      expect(filename).toMatch(/\.zip$/i);
    });

    await logger.step("download skills zip", async () => {
      const downloadButton = page.getByRole("button", { name: /download as skills/i });
      const [filename] = await Promise.all([
        page.waitForEvent("download").then((download) => download.suggestedFilename()),
        downloadButton.click(),
      ]);
      expect(filename).toMatch(/skills\.zip$/i);
    });
  });
});

test.describe("Error States", () => {
  test("404 page for invalid prompt IDs", async ({ page, logger }) => {
    await logger.step("navigate to invalid prompt", async () => {
      await page.goto("/prompts/does-not-exist");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify 404 UI", async () => {
      await expect(page.getByText(/prompt not found/i)).toBeVisible({ timeout: 2000 });
    });
  });

  test("offline banner appears when offline", async ({ page, context, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("wait for service worker registration", async () => {
      await page.waitForFunction(() =>
        navigator.serviceWorker?.getRegistration().then((registration) => !!registration)
      );
    });

    await logger.step("set offline", async () => {
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    });

    await logger.step("verify offline banner", async () => {
      await expect(page.getByText(/showing cached prompts/i)).toBeVisible({ timeout: 5000 });
    });

    await logger.step("dismiss offline banner", async () => {
      const dismissButton = page.getByRole("button", { name: /dismiss offline notification/i });
      await expect(dismissButton).toBeVisible();
      await dismissButton.click();
      await expect(page.getByText(/showing cached prompts/i)).not.toBeVisible({ timeout: 3000 });
    });

    await logger.step("restore online", async () => {
      await context.setOffline(false);
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
    });

    await logger.step("go offline again and ensure banner returns", async () => {
      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));
      await expect(page.getByText(/showing cached prompts/i)).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe("Mobile Interactions", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("prompt detail opens as bottom sheet", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("open prompt modal via tap", async () => {
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.tap();
    });

    await logger.step("verify bottom sheet visible", async () => {
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2000 });
      await expect(page.getByRole("heading", { name: /idea wizard/i })).toBeVisible({ timeout: 2000 });
    });
  });
});
