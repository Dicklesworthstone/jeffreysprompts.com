import { test, expect } from "../lib/playwright-logger";

/**
 * Install Flow E2E Tests
 *
 * Verifies the "Install Skill" functionality from the web UI.
 * This ensures users can get the correct commands to install prompts
 * into their local Claude Code environment.
 */

// Increase timeout for Turbopack streaming stalls
test.setTimeout(60000);

test.describe("Install Skill Flow", () => {
  test.beforeEach(async ({ page, context, logger }) => {
    // Grant clipboard permissions for reliable testing
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("load");
      await page.waitForTimeout(2000);
      // Wait for prompt cards to render (framer-motion)
      await page.waitForFunction(
        () => document.querySelectorAll("[data-testid='prompt-card']").length >= 3,
        { timeout: 15000 }
      );
    });
  });

  test("can copy install command from prompt detail", async ({ page, logger }) => {
    await logger.step("open first prompt detail", async () => {
      // Use the same pattern as search-copy.spec.ts which works reliably
      const card = page.locator("[data-testid='prompt-card']").first();
      await expect(card).toBeVisible({ timeout: 15000 });
      const viewBtn = card.getByRole("button", { name: /view/i });
      await viewBtn.click();
    });

    await logger.step("verify modal is open", async () => {
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    });

    await logger.step("click install button", async () => {
      // The button text is "Terminal Install"
      const installButton = page.getByRole("dialog").getByRole("button", { name: /install/i });
      await expect(installButton).toBeVisible({ timeout: 5000 });
      await installButton.click();
    });

    await logger.step("verify success feedback", async () => {
      // Toast shows "Install command copied"
      await expect(page.getByText(/install command copied/i)).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify clipboard content", async () => {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      // The install command is: curl -fsSL "URL/install.sh?ids=<id>" | bash
      expect(clipboardText).toContain("curl");
      expect(clipboardText).toContain("install.sh");
    });
  });

  test("can copy install command for all skills from footer", async ({ page, logger, isMobile }) => {
    // Footer is hidden on mobile layout
    test.skip(!!isMobile, "Footer is hidden on mobile");

    await logger.step("scroll to footer", async () => {
      const footer = page.locator("footer").first();
      await footer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    });

    await logger.step("find install command block", async () => {
      const codeBlock = page.locator("footer code");
      await expect(codeBlock).toBeVisible({ timeout: 5000 });
      await expect(codeBlock).toContainText("curl");
    });
  });
});
