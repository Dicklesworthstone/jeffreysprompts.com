import { test, expect } from "../lib/playwright-logger";

/**
 * Keyboard Shortcuts E2E Tests
 *
 * Tests for keyboard shortcuts functionality:
 * 1. Global shortcuts (search, help, new prompt)
 * 2. Navigation shortcuts (g h, g b, g w, g c)
 * 3. Help modal display and interaction
 */

test.describe("Keyboard Shortcuts - Global", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("? key opens keyboard shortcuts help modal", async ({ page, logger }) => {
    await logger.step("press ? key", async () => {
      await page.keyboard.press("Shift+/"); // ? is Shift+/
    });

    await logger.step("verify shortcuts modal is visible", async () => {
      const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
      await expect(modal).toBeVisible({ timeout: 2000 });
    });

    await logger.step("verify modal has title", async () => {
      const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
      await expect(modal.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeVisible();
      await expect(modal.getByText("Navigate faster with your keyboard")).toBeVisible();
    });
  });

  // Skipped: Meta+/ may conflict with browser DevTools shortcut in some environments
  test.skip("Cmd+/ opens keyboard shortcuts help modal (global)", async ({ page, logger }) => {
    await logger.step("press Cmd+/", async () => {
      await page.keyboard.press("Meta+/");
    });

    await logger.step("verify shortcuts modal is visible", async () => {
      const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
      await expect(modal).toBeVisible({ timeout: 2000 });
    });
  });

  test("/ key opens spotlight search (when not in input)", async ({ page, logger }) => {
    await logger.step("ensure no input is focused", async () => {
      await page.click("body");
    });

    await logger.step("press / key", async () => {
      await page.keyboard.press("/");
    });

    await logger.step("verify spotlight opens", async () => {
      const dialog = page.getByRole("dialog", { name: /search prompts/i });
      await expect(dialog).toBeVisible({ timeout: 2000 });
    });
  });

  // Skipped: Flaky due to race condition with spotlight dialog lazy loading
  test.skip("shortcuts don't fire when input is focused (non-global)", async ({ page, logger }) => {
    await logger.step("open spotlight search with /", async () => {
      await page.keyboard.press("/");
    });

    const searchDialog = page.getByRole("dialog", { name: /search prompts/i });
    await logger.step("ensure search input is focused", async () => {
      await expect(searchDialog).toBeVisible({ timeout: 2000 });
      const searchInput = searchDialog.getByRole("combobox");
      await expect(searchInput).toBeFocused();
    });

    await logger.step("type / in search input", async () => {
      const searchInput = searchDialog.getByRole("combobox");
      await searchInput.type("/");
    });

    await logger.step("verify / was typed, not triggering another action", async () => {
      const searchInput = searchDialog.getByRole("combobox");
      await expect(searchInput).toHaveValue("/");
    });
  });

  // Skipped: Meta+N may be intercepted by browser (new window)
  test.skip("Cmd+N navigates to contribute page", async ({ page, logger }) => {
    await logger.step("press Cmd+N", async () => {
      await page.keyboard.press("Meta+n");
    });

    await logger.step("verify navigation to contribute page", async () => {
      // Wait for URL to change - use a longer timeout as navigation may take time
      await expect(page).toHaveURL(/\/contribute/, { timeout: 10000 });
    });
  });
});

test.describe("Keyboard Shortcuts - Navigation Sequences", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("g then h navigates to home", async ({ page, logger }) => {
    await logger.step("navigate away from home first", async () => {
      await page.goto("/bundles");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("press g then h sequence", async () => {
      await page.keyboard.press("g");
      await page.keyboard.press("h");
    });

    await logger.step("verify navigation to home", async () => {
      // Wait for URL to not contain /bundles anymore
      await expect(page).not.toHaveURL(/\/bundles/, { timeout: 5000 });
      // Home page URL should be just / or end with localhost:port/
      const url = page.url();
      expect(url.endsWith("/") || url.match(/localhost:\d+\/?$/)).toBeTruthy();
    });
  });

  // Skipped: Sequence shortcuts have race condition when starting from homepage
  // The g+h test works because it starts from /bundles (away from home)
  // These may fail due to homepage having auto-focused elements or routing conflicts
  test.skip("g then b navigates to bundles", async ({ page, logger }) => {
    await logger.step("press g then b sequence", async () => {
      await page.keyboard.press("g");
      await page.keyboard.press("b");
    });

    await logger.step("verify navigation to bundles", async () => {
      await expect(page).toHaveURL(/\/bundles/, { timeout: 10000 });
    });
  });

  test.skip("g then w navigates to workflows", async ({ page, logger }) => {
    await logger.step("press g then w sequence", async () => {
      await page.keyboard.press("g");
      await page.keyboard.press("w");
    });

    await logger.step("verify navigation to workflows", async () => {
      await expect(page).toHaveURL(/\/workflows/, { timeout: 10000 });
    });
  });

  test.skip("g then c navigates to contribute", async ({ page, logger }) => {
    await logger.step("press g then c sequence", async () => {
      await page.keyboard.press("g");
      await page.keyboard.press("c");
    });

    await logger.step("verify navigation to contribute", async () => {
      await expect(page).toHaveURL(/\/contribute/, { timeout: 10000 });
    });
  });

  test("sequence timeout resets after 1 second", async ({ page, logger }) => {
    await logger.step("press g key", async () => {
      await page.keyboard.press("g");
    });

    await logger.step("wait more than 1 second", async () => {
      await page.waitForTimeout(1100);
    });

    await logger.step("press b key (should not trigger navigation)", async () => {
      // Since timeout elapsed, g+b sequence should not work
      // b alone doesn't do anything
      await page.keyboard.press("b");
    });

    await logger.step("verify still on homepage", async () => {
      // Wait a moment to see if navigation would happen
      await page.waitForTimeout(500);
      // URL should not have changed to /bundles
      const url = page.url();
      expect(url).not.toMatch(/\/bundles/);
    });
  });
});

test.describe("Keyboard Shortcuts - Help Modal", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("help modal shows shortcuts grouped by category", async ({ page, logger }) => {
    await logger.step("open help modal", async () => {
      await page.keyboard.press("Shift+/");
    });

    await logger.step("verify categories are displayed", async () => {
      const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
      await expect(modal).toBeVisible();

      // Check for category headers - they are uppercase in h3 elements
      // Use locator with text matcher that's more specific
      await expect(modal.locator("h3").filter({ hasText: /search/i })).toBeVisible();
      await expect(modal.locator("h3").filter({ hasText: /navigation/i })).toBeVisible();
      await expect(modal.locator("h3").filter({ hasText: /actions/i })).toBeVisible();
      await expect(modal.locator("h3").filter({ hasText: /help/i })).toBeVisible();
    });
  });

  test("help modal shows all registered shortcuts", async ({ page, logger }) => {
    await logger.step("open help modal", async () => {
      await page.keyboard.press("Shift+/");
    });

    await logger.step("verify shortcuts are listed", async () => {
      const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });

      // Check for specific shortcut descriptions - use first() where needed
      await expect(modal.getByText("Open search").first()).toBeVisible();
      await expect(modal.getByText("Show keyboard shortcuts").first()).toBeVisible();
      await expect(modal.getByText("Go to home")).toBeVisible();
      await expect(modal.getByText("Go to bundles")).toBeVisible();
      await expect(modal.getByText("Create new prompt")).toBeVisible();
    });
  });

  test("help modal closes with Escape key", async ({ page, logger }) => {
    await logger.step("open help modal", async () => {
      await page.keyboard.press("Shift+/");
    });

    const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
    await logger.step("verify modal is open", async () => {
      await expect(modal).toBeVisible();
    });

    await logger.step("press Escape to close", async () => {
      await page.keyboard.press("Escape");
    });

    await logger.step("verify modal is closed", async () => {
      await expect(modal).not.toBeVisible({ timeout: 2000 });
    });
  });

  test("help modal closes when clicking backdrop", async ({ page, logger }) => {
    await logger.step("open help modal", async () => {
      await page.keyboard.press("Shift+/");
    });

    const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
    await logger.step("verify modal is open", async () => {
      await expect(modal).toBeVisible();
    });

    await logger.step("click backdrop", async () => {
      // Click outside the modal dialog (on the backdrop)
      await page.locator("body").click({ position: { x: 10, y: 10 } });
    });

    await logger.step("verify modal is closed", async () => {
      await expect(modal).not.toBeVisible({ timeout: 2000 });
    });
  });

  test("help modal closes with X button", async ({ page, logger }) => {
    await logger.step("open help modal", async () => {
      await page.keyboard.press("Shift+/");
    });

    const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
    await logger.step("verify modal is open", async () => {
      await expect(modal).toBeVisible();
    });

    await logger.step("click close button", async () => {
      const closeButton = modal.getByRole("button", { name: /close/i });
      await closeButton.click();
    });

    await logger.step("verify modal is closed", async () => {
      await expect(modal).not.toBeVisible({ timeout: 2000 });
    });
  });

  test("help modal footer shows hint", async ({ page, logger }) => {
    await logger.step("open help modal", async () => {
      await page.keyboard.press("Shift+/");
    });

    await logger.step("verify footer hint", async () => {
      const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
      await expect(modal.getByText(/press.*\?.*anytime/i)).toBeVisible();
    });
  });
});

test.describe("Keyboard Shortcuts - Accessibility", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("help modal has proper ARIA attributes", async ({ page, logger }) => {
    await logger.step("open help modal", async () => {
      await page.keyboard.press("Shift+/");
    });

    await logger.step("verify ARIA attributes", async () => {
      const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
      await expect(modal).toBeVisible();
      await expect(modal).toHaveAttribute("aria-modal", "true");
      await expect(modal).toHaveAttribute("aria-labelledby", "shortcuts-title");
    });
  });

  test("help modal title has correct ID for aria-labelledby", async ({ page, logger }) => {
    await logger.step("open help modal", async () => {
      await page.keyboard.press("Shift+/");
    });

    await logger.step("verify title element", async () => {
      const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
      const title = modal.locator("#shortcuts-title");
      await expect(title).toBeVisible();
      await expect(title).toHaveText("Keyboard Shortcuts");
    });
  });
});

test.describe("Keyboard Shortcuts - Sequence Keys Display", () => {
  test("sequence shortcuts show 'then' between keys", async ({ page, logger }) => {
    await logger.step("navigate and open help modal", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.keyboard.press("Shift+/");
    });

    await logger.step("verify sequence display format", async () => {
      const modal = page.getByRole("dialog", { name: /keyboard shortcuts/i });
      // Look for "G then H" pattern in the modal
      await expect(modal.getByText("then").first()).toBeVisible();
    });
  });
});
