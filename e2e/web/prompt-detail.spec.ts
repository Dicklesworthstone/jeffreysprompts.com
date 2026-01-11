import { test, expect } from "../lib/playwright-logger";

/**
 * Prompt Detail Page E2E Tests
 *
 * Comprehensive tests for the prompt detail modal and page:
 * 1. Content display (title, description, category, tags)
 * 2. Copy/Install/Download functionality
 * 3. Variable inputs and persistence
 * 4. Context textarea
 * 5. Mobile bottom sheet behavior
 * 6. Navigation
 */

test.describe("Prompt Detail Modal - Content Display", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("modal displays prompt title and description", async ({ page, logger }) => {
    await logger.step("wait for prompt cards", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
    });

    await logger.step("open prompt modal", async () => {
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("verify modal is open", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 3000 });
    });

    await logger.step("verify modal has prompt content", async () => {
      const dialog = page.getByRole("dialog");
      // Modal should show Idea Wizard content
      await expect(dialog.getByText(/idea wizard/i).first()).toBeVisible({ timeout: 2000 });
    });

    await logger.step("verify description displays", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText(/ideas/i).first()).toBeVisible();
    });
  });

  test("modal displays category badge", async ({ page, logger }) => {
    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("verify category badge", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // Category badge should be visible (ideation for Idea Wizard)
      await expect(dialog.getByText("ideation").first()).toBeVisible();
    });
  });

  test("modal displays tags", async ({ page, logger }) => {
    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("verify tags display", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // Tags should be visible
      await expect(dialog.getByText("brainstorming").first()).toBeVisible();
    });
  });

  test("modal displays token count if available", async ({ page, logger }) => {
    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("verify token count", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // Token count shown as "X tokens"
      await expect(dialog.getByText(/\d+ tokens/)).toBeVisible();
    });
  });

  test("modal displays prompt content preview", async ({ page, logger }) => {
    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("verify content preview area", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // Content should be in a scrollable area or code-like formatting
      // The actual content includes instructions for generating ideas
      await expect(dialog.getByText(/ideas/i).first()).toBeVisible();
    });
  });
});

test.describe("Prompt Detail Modal - Actions", () => {
  test.beforeEach(async ({ page, context, logger }) => {
    await logger.step("grant clipboard permissions", async () => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("copy button copies content to clipboard", async ({ page, logger }) => {
    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("click copy button", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const copyButton = dialog.getByRole("button", { name: /copy/i }).first();
      await copyButton.click();
    });

    await logger.step("verify copied feedback", async () => {
      // Should show "Copied" feedback or toast
      await expect(page.getByText(/copied/i).first()).toBeVisible({ timeout: 3000 });
    });
  });

  test("install button is present and clickable", async ({ page, logger }) => {
    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("verify install button", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const installButton = dialog.getByRole("button", { name: /install/i });
      await expect(installButton).toBeVisible();
      await expect(installButton).toBeEnabled();
    });

    await logger.step("click install button", async () => {
      const dialog = page.getByRole("dialog");
      const installButton = dialog.getByRole("button", { name: /install/i });
      await installButton.click();
      // Should show success feedback
      await expect(page.getByText(/copied|install/i).first()).toBeVisible({ timeout: 3000 });
    });
  });

  test("download button triggers file download", async ({ page, logger }) => {
    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("click download button", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const downloadButton = dialog.getByRole("button", { name: /download/i });
      await expect(downloadButton).toBeVisible();

      // Listen for download event
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        downloadButton.click(),
      ]);

      expect(download.suggestedFilename()).toMatch(/\.md$/i);
    });
  });
});

test.describe("Prompt Detail Modal - Context Input", () => {
  test.beforeEach(async ({ page, context, logger }) => {
    await logger.step("grant clipboard permissions", async () => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("context textarea is available", async ({ page, logger }) => {
    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("verify context textarea exists", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // Look for context textarea by label or placeholder
      const contextTextarea = dialog.getByPlaceholder(/context|additional|project/i);
      await expect(contextTextarea).toBeVisible();
    });
  });

  test("can enter context text", async ({ page, logger }) => {
    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("enter context", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const contextTextarea = dialog.getByPlaceholder(/context|additional|project/i);
      await contextTextarea.fill("My test project context for E2E testing");
    });

    await logger.step("verify context was entered", async () => {
      const dialog = page.getByRole("dialog");
      const contextTextarea = dialog.getByPlaceholder(/context|additional|project/i);
      await expect(contextTextarea).toHaveValue("My test project context for E2E testing");
    });
  });
});

test.describe("Prompt Detail Modal - Navigation", () => {
  test("modal can be closed with Escape key", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    const dialog = page.getByRole("dialog");
    await logger.step("verify modal is open", async () => {
      await expect(dialog).toBeVisible();
    });

    await logger.step("press Escape to close", async () => {
      await page.keyboard.press("Escape");
    });

    await logger.step("verify modal is closed", async () => {
      await expect(dialog).not.toBeVisible({ timeout: 2000 });
    });
  });

  test("modal can be closed by clicking backdrop", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("open prompt modal", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    const dialog = page.getByRole("dialog");
    await logger.step("verify modal is open", async () => {
      await expect(dialog).toBeVisible();
    });

    await logger.step("click backdrop to close", async () => {
      // Click outside the dialog to close
      await page.locator("body").click({ position: { x: 10, y: 10 } });
    });

    await logger.step("verify modal is closed", async () => {
      await expect(dialog).not.toBeVisible({ timeout: 2000 });
    });
  });
});

test.describe("Prompt Detail Page - Direct Navigation", () => {
  test("can navigate directly to prompt detail page", async ({ page, logger }) => {
    await logger.step("navigate to prompt page", async () => {
      await page.goto("/prompts/idea-wizard");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify page content", async () => {
      // Should display prompt content
      await expect(page.getByText(/idea wizard/i).first()).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify copy button exists", async () => {
      const copyButton = page.getByRole("button", { name: /copy/i });
      await expect(copyButton).toBeVisible();
    });
  });

  test("related prompts section navigates to another prompt", async ({ page, logger }) => {
    let relatedTitle = "";

    await logger.step("navigate to prompt page", async () => {
      await page.goto("/prompts/idea-wizard");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("open first related prompt", async () => {
      const relatedSection = page.locator("section", { hasText: "Related Prompts" });
      await expect(relatedSection.getByRole("heading", { name: "Related Prompts" })).toBeVisible({ timeout: 10000 });

      const relatedLink = relatedSection.getByRole("link").first();
      relatedTitle = (await relatedLink.locator("h3").first().innerText()).trim();

      await Promise.all([
        page.waitForURL((url) => url.pathname.startsWith("/prompts/") && url.pathname !== "/prompts/idea-wizard"),
        relatedLink.click(),
      ]);
    });

    await logger.step("verify new prompt page", async () => {
      await expect(page).not.toHaveURL("/prompts/idea-wizard");
      await expect(page.getByRole("heading", { name: relatedTitle })).toBeVisible({ timeout: 10000 });
    });
  });

  test("back to prompts link navigates home", async ({ page, logger }) => {
    await logger.step("navigate to prompt page", async () => {
      await page.goto("/prompts/idea-wizard");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("click back link", async () => {
      const backLink = page.getByRole("link", { name: /back to prompts/i });
      await backLink.click();
    });

    await logger.step("verify homepage", async () => {
      await expect(page).toHaveURL("/");
    });
  });

  test("404 for invalid prompt ID", async ({ page, logger }) => {
    await logger.step("navigate to invalid prompt", async () => {
      await page.goto("/prompts/nonexistent-prompt-xyz");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify 404 message", async () => {
      await expect(page.getByText(/not found/i).first()).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe("Prompt Detail Modal - Mobile Bottom Sheet", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("opens as bottom sheet on mobile", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("wait for prompts", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
    });

    await logger.step("click on prompt card to open modal", async () => {
      // On mobile, click on the card itself to open the modal
      const promptCard = page.locator("h3").filter({ hasText: "The Idea Wizard" }).first();
      await promptCard.click();
    });

    await logger.step("verify bottom sheet visible", async () => {
      // Bottom sheet should be visible with prompt content
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 2000 });
      // Should show prompt title
      await expect(dialog.getByText(/idea wizard/i).first()).toBeVisible();
    });
  });

  test("mobile sheet has touch-friendly buttons", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("open prompt modal by clicking card", async () => {
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
      // Click on the card itself
      const promptCard = page.locator("h3").filter({ hasText: "The Idea Wizard" }).first();
      await promptCard.click();
    });

    await logger.step("verify button heights are touch-friendly", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 2000 });

      // Check copy button is at least 32px tall (touch-friendly)
      const copyButton = dialog.getByRole("button", { name: /copy/i }).first();
      await expect(copyButton).toBeVisible();
      const height = await copyButton.evaluate((el) => el.offsetHeight);
      expect(height).toBeGreaterThanOrEqual(32);
    });
  });
});

test.describe("Prompt Detail - Featured Prompts", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("featured prompt shows featured badge", async ({ page, logger }) => {
    await logger.step("find featured prompt", async () => {
      // The Idea Wizard is featured
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 10000 });
    });

    await logger.step("open featured prompt modal", async () => {
      const viewButton = page.getByRole("button", { name: /view/i }).first();
      await viewButton.click();
    });

    await logger.step("verify featured badge in modal", async () => {
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // Featured badge should be visible
      await expect(dialog.getByText(/featured/i)).toBeVisible();
    });
  });
});
