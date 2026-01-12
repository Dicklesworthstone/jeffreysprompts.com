import { test, expect } from "../../lib/playwright-logger";

/**
 * Marketing SEO E2E Tests
 *
 * Tests for SEO elements on marketing pages:
 * - Meta tags and titles
 * - Structured data (JSON-LD)
 * - Canonical URLs
 * - Sitemap and robots.txt
 * - Social sharing tags
 */

test.describe("Homepage SEO", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("page has correct title", async ({ page, logger }) => {
    await logger.step("verify title tag", async () => {
      const title = await page.title();
      expect(title).toContain("Jeffrey");
      expect(title).toContain("Prompts");
    });
  });

  test("page has meta description", async ({ page, logger }) => {
    await logger.step("verify meta description exists", async () => {
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", /.+/);
    });

    await logger.step("verify description content is meaningful", async () => {
      const content = await page.locator('meta[name="description"]').getAttribute("content");
      expect(content).not.toBeNull();
      expect(content!.length).toBeGreaterThan(50);
      expect(content!.toLowerCase()).toContain("prompt");
    });
  });

  test("page has canonical URL", async ({ page, logger }) => {
    await logger.step("verify canonical link exists", async () => {
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute("href", /jeffreysprompts\.com/);
    });
  });

  test("page has robots meta", async ({ page, logger }) => {
    await logger.step("verify page is indexable", async () => {
      // Check there's no noindex directive
      const robotsMeta = page.locator('meta[name="robots"]');
      if (await robotsMeta.count() > 0) {
        const content = await robotsMeta.getAttribute("content");
        expect(content).not.toContain("noindex");
      }
    });
  });
});

test.describe("Structured Data (JSON-LD)", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("page has WebSite schema", async ({ page, logger }) => {
    await logger.step("find JSON-LD scripts", async () => {
      const jsonLdScripts = page.locator('script[type="application/ld+json"]');
      const count = await jsonLdScripts.count();
      expect(count).toBeGreaterThan(0);
    });

    await logger.step("verify WebSite schema exists", async () => {
      const jsonLdScripts = page.locator('script[type="application/ld+json"]');
      const count = await jsonLdScripts.count();

      let hasWebSite = false;
      for (let i = 0; i < count; i++) {
        const content = await jsonLdScripts.nth(i).textContent();
        if (content && content.includes('"@type":"WebSite"')) {
          hasWebSite = true;
          break;
        }
      }
      expect(hasWebSite).toBe(true);
    });
  });

  test("JSON-LD is valid JSON", async ({ page, logger }) => {
    await logger.step("parse all JSON-LD scripts", async () => {
      const jsonLdScripts = page.locator('script[type="application/ld+json"]');
      const count = await jsonLdScripts.count();

      for (let i = 0; i < count; i++) {
        const content = await jsonLdScripts.nth(i).textContent();
        expect(content).not.toBeNull();
        // Should not throw
        const parsed = JSON.parse(content!);
        expect(parsed).toHaveProperty("@context");
        expect(parsed).toHaveProperty("@type");
      }
    });
  });
});

test.describe("Open Graph Tags", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("page has og:title", async ({ page, logger }) => {
    await logger.step("verify og:title exists", async () => {
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute("content", /.+/);
    });
  });

  test("page has og:description", async ({ page, logger }) => {
    await logger.step("verify og:description exists", async () => {
      const ogDesc = page.locator('meta[property="og:description"]');
      await expect(ogDesc).toHaveAttribute("content", /.+/);
    });
  });

  test("page has og:image", async ({ page, logger }) => {
    await logger.step("verify og:image exists", async () => {
      const ogImage = page.locator('meta[property="og:image"]');
      await expect(ogImage).toHaveAttribute("content", /https?:\/\/.+/);
    });
  });

  test("page has og:url", async ({ page, logger }) => {
    await logger.step("verify og:url exists", async () => {
      const ogUrl = page.locator('meta[property="og:url"]');
      await expect(ogUrl).toHaveAttribute("content", /jeffreysprompts\.com/);
    });
  });

  test("page has og:type", async ({ page, logger }) => {
    await logger.step("verify og:type exists", async () => {
      const ogType = page.locator('meta[property="og:type"]');
      await expect(ogType).toHaveAttribute("content", /.+/);
    });
  });
});

test.describe("Twitter Card Tags", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("page has twitter:card", async ({ page, logger }) => {
    await logger.step("verify twitter:card exists", async () => {
      const twitterCard = page.locator('meta[name="twitter:card"]');
      await expect(twitterCard).toHaveAttribute("content", /.+/);
    });
  });

  test("page has twitter:title", async ({ page, logger }) => {
    await logger.step("verify twitter:title exists", async () => {
      const twitterTitle = page.locator('meta[name="twitter:title"]');
      await expect(twitterTitle).toHaveAttribute("content", /.+/);
    });
  });

  test("page has twitter:creator", async ({ page, logger }) => {
    await logger.step("verify twitter:creator exists", async () => {
      const twitterCreator = page.locator('meta[name="twitter:creator"]');
      await expect(twitterCreator).toHaveAttribute("content", /@\w+/);
    });
  });
});

test.describe("Sitemap and Robots", () => {
  test("sitemap.xml is accessible", async ({ page, logger }) => {
    await logger.step("fetch sitemap.xml", async () => {
      const response = await page.goto("/sitemap.xml");
      expect(response).not.toBeNull();
      expect(response!.status()).toBe(200);
    });

    await logger.step("verify sitemap contains URLs", async () => {
      const content = await page.content();
      expect(content).toContain("<urlset");
      expect(content).toContain("<url>");
      expect(content).toContain("jeffreysprompts.com");
    });
  });

  test("robots.txt is accessible", async ({ page, logger }) => {
    await logger.step("fetch robots.txt", async () => {
      const response = await page.goto("/robots.txt");
      expect(response).not.toBeNull();
      expect(response!.status()).toBe(200);
    });

    await logger.step("verify robots.txt has sitemap reference", async () => {
      const content = await page.content();
      expect(content).toContain("Sitemap:");
    });

    await logger.step("verify robots.txt allows crawling", async () => {
      const content = await page.content();
      // Should allow crawling of main content
      expect(content).toContain("User-agent:");
    });
  });

  test("sitemap excludes admin routes", async ({ page, logger }) => {
    await logger.step("fetch sitemap.xml", async () => {
      const response = await page.goto("/sitemap.xml");
      expect(response!.status()).toBe(200);
    });

    await logger.step("verify admin routes not in sitemap", async () => {
      const content = await page.content();
      expect(content).not.toContain("/admin");
    });
  });
});

test.describe("Marketing Pages SEO", () => {
  test("bundles page has unique meta", async ({ page, logger }) => {
    await logger.step("navigate to bundles page", async () => {
      await page.goto("/bundles");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify title is unique", async () => {
      const title = await page.title();
      expect(title).toContain("Bundle");
    });

    await logger.step("verify meta description exists", async () => {
      const description = page.locator('meta[name="description"]');
      await expect(description).toHaveAttribute("content", /.+/);
    });
  });

  test("workflows page has unique meta", async ({ page, logger }) => {
    await logger.step("navigate to workflows page", async () => {
      await page.goto("/workflows");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify title is unique", async () => {
      const title = await page.title();
      expect(title).toContain("Workflow");
    });
  });

  test("prompt detail page has dynamic meta", async ({ page, logger }) => {
    await logger.step("navigate to a prompt detail page", async () => {
      await page.goto("/prompts/idea-wizard");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify title contains prompt name", async () => {
      const title = await page.title();
      expect(title.toLowerCase()).toContain("idea");
    });

    await logger.step("verify og:title is dynamic", async () => {
      const ogTitle = page.locator('meta[property="og:title"]');
      const content = await ogTitle.getAttribute("content");
      expect(content?.toLowerCase()).toContain("idea");
    });
  });
});

test.describe("Performance SEO Signals", () => {
  test("page loads quickly (LCP proxy)", async ({ page, logger }) => {
    const startTime = Date.now();

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
    });

    await logger.step("wait for first contentful paint proxy", async () => {
      // Wait for hero heading as proxy for LCP
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 5000 });
    });

    const loadTime = Date.now() - startTime;

    await logger.step("verify load time is reasonable", async () => {
      // Should load in under 5 seconds in test environment
      expect(loadTime).toBeLessThan(5000);
    }, { data: { loadTimeMs: loadTime } });
  });

  test("images have alt text", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("check images for alt attributes", async () => {
      const images = page.locator("img");
      const count = await images.count();

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 5); i++) {
          const img = images.nth(i);
          const alt = await img.getAttribute("alt");
          // Either has alt text or is decorative (empty alt)
          expect(alt).not.toBeNull();
        }
      }
    });
  });

  test("headings have proper hierarchy", async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify h1 exists", async () => {
      const h1 = page.locator("h1");
      const count = await h1.count();
      expect(count).toBe(1); // Should have exactly one h1
    });

    await logger.step("verify h2 headings exist", async () => {
      const h2 = page.locator("h2");
      const count = await h2.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});
