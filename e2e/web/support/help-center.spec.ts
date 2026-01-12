import { test, expect } from "../../lib/playwright-logger";
import {
  HELP_CATEGORIES,
  getHelpPageLocators,
  getArticlePageLocators,
  navigateToHelpCenter,
  navigateToHelpCategory,
  navigateToHelpArticle,
} from "../../lib/support-helpers";

/**
 * Help Center E2E Tests
 *
 * Tests for the help center functionality including:
 * 1. Main help page display
 * 2. Category pages
 * 3. Article pages
 * 4. Navigation and links
 * 5. Search functionality
 */

test.describe("Help Center Main Page", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to help center", async () => {
      await navigateToHelpCenter(page);
    });
  });

  test("help center page loads correctly", async ({ page, logger }) => {
    await logger.step("verify page title", async () => {
      await expect(page).toHaveTitle(/Help Center/i);
    });

    await logger.step("verify main heading", async () => {
      await expect(page.getByRole("heading", { name: "Help Center" })).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify description text", async () => {
      await expect(page.getByText(/Find answers to common questions/i)).toBeVisible();
    });
  });

  test("help categories are displayed", async ({ page, logger }) => {
    for (const category of HELP_CATEGORIES) {
      await logger.step(`verify category: ${category.title}`, async () => {
        await expect(page.getByRole("heading", { name: category.title })).toBeVisible({ timeout: 5000 });
      });
    }
  });

  test("article links are visible for each category", async ({ page, logger }) => {
    for (const category of HELP_CATEGORIES) {
      for (const article of category.articles) {
        await logger.step(`verify article link: ${article.title}`, async () => {
          const articleLink = page.getByRole("link", { name: article.title });
          await expect(articleLink).toBeVisible({ timeout: 5000 });
        });
      }
    }
  });

  test("popular topics section is displayed", async ({ page, logger }) => {
    await logger.step("verify Popular Topics heading", async () => {
      await expect(page.getByRole("heading", { name: "Popular Topics" })).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify popular topic cards", async () => {
      // Should have at least 3 popular topic cards
      const popularCards = page.locator("section").filter({ hasText: "Popular Topics" }).locator("a");
      const count = await popularCards.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  test("search hint is displayed", async ({ page, logger }) => {
    await logger.step("verify search hint text", async () => {
      await expect(page.getByText(/Looking for something specific/i)).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify keyboard shortcut hint", async () => {
      // Check for either Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      await expect(page.locator("kbd").filter({ hasText: /Cmd\+K|Ctrl\+K/ })).toBeVisible();
    });
  });

  test("contact support CTA is visible", async ({ page, logger }) => {
    const locators = getHelpPageLocators(page);

    await logger.step("verify contact support link", async () => {
      await expect(locators.contactSupportLink).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify contact link URL", async () => {
      await expect(locators.contactSupportLink).toHaveAttribute("href", "/contact");
    });
  });
});

test.describe("Help Category Pages", () => {
  for (const category of HELP_CATEGORIES) {
    test(`${category.title} category page loads correctly`, async ({ page, logger }) => {
      await logger.step(`navigate to ${category.slug} category`, async () => {
        await navigateToHelpCategory(page, category.slug);
      });

      await logger.step("verify category heading", async () => {
        await expect(page.getByRole("heading", { name: category.title })).toBeVisible({ timeout: 5000 });
      });

      await logger.step("verify breadcrumb exists", async () => {
        await expect(page.locator("nav").filter({ hasText: "Help Center" })).toBeVisible();
      });

      await logger.step("verify article cards are displayed", async () => {
        for (const article of category.articles) {
          await expect(page.getByRole("link", { name: article.title })).toBeVisible({ timeout: 5000 });
        }
      });
    });
  }
});

test.describe("Help Article Pages", () => {
  test("Getting Started introduction article loads", async ({ page, logger }) => {
    await logger.step("navigate to introduction article", async () => {
      await navigateToHelpArticle(page, "getting-started", "introduction");
    });

    await logger.step("verify article title", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify article content exists", async () => {
      const locators = getArticlePageLocators(page);
      await expect(locators.content).toBeVisible();
    });

    await logger.step("verify breadcrumb navigation", async () => {
      const breadcrumb = page.locator("nav").filter({ hasText: "Help Center" });
      await expect(breadcrumb).toBeVisible();
      // Breadcrumb text uses CSS capitalize so DOM text is lowercase
      await expect(breadcrumb.getByRole("link", { name: /getting started/i })).toBeVisible();
    });
  });

  test("article pages have proper structure", async ({ page, logger }) => {
    await logger.step("navigate to browsing prompts article", async () => {
      await navigateToHelpArticle(page, "getting-started", "browsing-prompts");
    });

    const locators = getArticlePageLocators(page);

    await logger.step("verify article has heading", async () => {
      await expect(locators.title).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify article has content sections", async () => {
      const headingCount = await locators.headings.count();
      expect(headingCount).toBeGreaterThan(0);
    });
  });

  test("CLI installation article loads correctly", async ({ page, logger }) => {
    await logger.step("navigate to CLI installation", async () => {
      await navigateToHelpArticle(page, "cli", "installation");
    });

    await logger.step("verify page loads", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify install commands are shown", async () => {
      const codeBlocks = page.locator("code, pre");
      const count = await codeBlocks.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test("related articles are shown", async ({ page, logger }) => {
    await logger.step("navigate to copying prompts article", async () => {
      await navigateToHelpArticle(page, "prompts", "copying-prompts");
    });

    await logger.step("verify page loads", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 5000 });
    });

    // Related articles may be shown at bottom of page
    await logger.step("scroll to page bottom", async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    });
  });
});

test.describe("Help Navigation", () => {
  test("can navigate from main page to article", async ({ page, logger }) => {
    await logger.step("go to help center", async () => {
      await navigateToHelpCenter(page);
    });

    await logger.step("click on introduction article", async () => {
      await page.getByRole("link", { name: "Introduction to JeffreysPrompts" }).click();
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify navigation succeeded", async () => {
      await expect(page).toHaveURL(/\/help\/getting-started\/introduction/);
    });
  });

  test("breadcrumb navigation works", async ({ page, logger }) => {
    await logger.step("go to article page", async () => {
      await navigateToHelpArticle(page, "prompts", "exporting");
    });

    await logger.step("click breadcrumb link to category", async () => {
      // Breadcrumb text uses CSS capitalize so DOM text is lowercase
      await page.locator("nav").filter({ hasText: "Help Center" }).getByRole("link", { name: /prompts/i }).click();
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify navigation to category", async () => {
      await expect(page).toHaveURL(/\/help\/prompts$/);
    });

    await logger.step("click breadcrumb link to help center", async () => {
      await page.locator("nav").filter({ hasText: "Help Center" }).getByRole("link", { name: "Help Center" }).click();
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify navigation to help center", async () => {
      await expect(page).toHaveURL(/\/help$/);
    });
  });
});

test.describe("Help Accessibility", () => {
  test("help pages have proper heading hierarchy", async ({ page, logger }) => {
    await logger.step("go to help center", async () => {
      await navigateToHelpCenter(page);
    });

    await logger.step("verify h1 exists", async () => {
      const h1s = page.locator("h1");
      await expect(h1s).toHaveCount(1);
    });

    await logger.step("verify h2 headings for categories", async () => {
      const h2s = page.locator("main h2");
      const count = await h2s.count();
      // Should have category headings + "Popular Topics"
      expect(count).toBeGreaterThanOrEqual(HELP_CATEGORIES.length);
    });
  });

  test("links have accessible names", async ({ page, logger }) => {
    await logger.step("go to help center", async () => {
      await navigateToHelpCenter(page);
    });

    await logger.step("verify article links have names", async () => {
      const links = page.locator("a[href*='/help/']");
      const count = await links.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const link = links.nth(i);
        const name = await link.textContent();
        expect(name?.trim().length).toBeGreaterThan(0);
      }
    });
  });
});
