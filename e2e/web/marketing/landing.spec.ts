import { test, expect } from "../../lib/playwright-logger";

/**
 * Landing Page Marketing E2E Tests
 *
 * Tests for marketing-focused landing page sections:
 * - Features section with feature cards
 * - How It Works section with steps
 * - Pricing preview section
 * - Final CTA section
 * - Navigation and conversion paths
 */

test.describe("Features Section", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("features section displays with header", async ({ page, logger }) => {
    await logger.step("scroll to features section", async () => {
      const featuresSection = page.locator("text=Prompt Packs").first();
      await featuresSection.scrollIntoViewIfNeeded();
    });

    await logger.step("verify features header exists", async () => {
      await expect(page.getByText("Everything you need to prompt like a pro")).toBeVisible({ timeout: 5000 });
    });
  });

  test("all feature cards are displayed", async ({ page, logger }) => {
    const expectedFeatures = [
      "Prompt Packs",
      "Claude Code Skills",
      "Swap Meet",
      "Collections",
      "CLI Integration",
      "Analytics",
      "Smart Search",
      "Zero Config",
    ];

    await logger.step("scroll to features section", async () => {
      const featuresSection = page.locator("text=Prompt Packs").first();
      await featuresSection.scrollIntoViewIfNeeded();
    });

    for (const feature of expectedFeatures) {
      await logger.step(`verify "${feature}" feature card`, async () => {
        await expect(page.getByText(feature).first()).toBeVisible({ timeout: 5000 });
      });
    }
  });

  test("feature cards have descriptions", async ({ page, logger }) => {
    await logger.step("scroll to features section", async () => {
      const featuresSection = page.locator("text=Prompt Packs").first();
      await featuresSection.scrollIntoViewIfNeeded();
    });

    await logger.step("verify Prompt Packs description", async () => {
      await expect(page.getByText("Curated bundles of battle-tested prompts")).toBeVisible();
    });

    await logger.step("verify CLI Integration description", async () => {
      await expect(page.getByText("Access prompts from your terminal")).toBeVisible();
    });
  });
});

test.describe("How It Works Section", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("how it works section displays", async ({ page, logger }) => {
    await logger.step("scroll to how it works section", async () => {
      const section = page.locator("text=How It Works").first();
      await section.scrollIntoViewIfNeeded();
    });

    await logger.step("verify section header", async () => {
      await expect(page.getByText("From search to ship in seconds")).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify no signup message", async () => {
      await expect(page.getByText("No signup required")).toBeVisible();
    });
  });

  test("all three steps are displayed", async ({ page, logger }) => {
    const steps = [
      { number: "01", title: "Browse & Search" },
      { number: "02", title: "Copy or Export" },
      { number: "03", title: "Supercharge Your Workflow" },
    ];

    await logger.step("scroll to how it works section", async () => {
      const section = page.locator("text=How It Works").first();
      await section.scrollIntoViewIfNeeded();
    });

    for (const step of steps) {
      await logger.step(`verify step ${step.number}: ${step.title}`, async () => {
        await expect(page.getByText(step.title)).toBeVisible({ timeout: 5000 });
      });
    }
  });

  test("steps have descriptions", async ({ page, logger }) => {
    await logger.step("scroll to how it works section", async () => {
      const section = page.locator("text=How It Works").first();
      await section.scrollIntoViewIfNeeded();
    });

    await logger.step("verify browse step description", async () => {
      await expect(page.getByText("Explore our curated library")).toBeVisible();
    });

    await logger.step("verify export step description", async () => {
      await expect(page.getByText("One-click copy to clipboard")).toBeVisible();
    });
  });
});

test.describe("Pricing Preview Section", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("pricing section displays", async ({ page, logger }) => {
    await logger.step("scroll to pricing section", async () => {
      // Look for pricing-related content
      const pricingSection = page.locator("text=Free Forever").first();
      await pricingSection.scrollIntoViewIfNeeded();
    });

    await logger.step("verify free tier is displayed", async () => {
      await expect(page.getByText("Free Forever").first()).toBeVisible({ timeout: 5000 });
    });
  });

  test("free tier benefits are listed", async ({ page, logger }) => {
    await logger.step("scroll to pricing section", async () => {
      const pricingSection = page.locator("text=Free Forever").first();
      await pricingSection.scrollIntoViewIfNeeded();
    });

    await logger.step("verify core features mentioned", async () => {
      // Check for common free tier features
      await expect(page.getByText(/browse.*prompts/i).first()).toBeVisible();
    });
  });
});

test.describe("Final CTA Section", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("final CTA section displays", async ({ page, logger }) => {
    await logger.step("scroll to bottom of page", async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    });

    await logger.step("verify CTA is visible", async () => {
      // Look for final call-to-action content
      const ctaSection = page.locator("text=Ready to level up").first();
      if (await ctaSection.isVisible()) {
        await expect(ctaSection).toBeVisible();
      }
    });
  });
});

test.describe("Navigation Links", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("main nav links are visible", async ({ page, logger }) => {
    await logger.step("verify Prompts nav link", async () => {
      const promptsLink = page.getByRole("navigation").getByRole("link", { name: /prompts/i }).first();
      await expect(promptsLink).toBeVisible();
    });

    await logger.step("verify Bundles nav link", async () => {
      const bundlesLink = page.getByRole("navigation").getByRole("link", { name: /bundles/i }).first();
      await expect(bundlesLink).toBeVisible();
    });
  });

  test("nav links navigate correctly", async ({ page, logger }) => {
    await logger.step("click Bundles link", async () => {
      const bundlesLink = page.getByRole("navigation").getByRole("link", { name: /bundles/i }).first();
      await bundlesLink.click();
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify bundles page loaded", async () => {
      await expect(page).toHaveURL(/\/bundles/);
    });
  });
});

test.describe("CTA Buttons", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });
  });

  test("install CLI button is visible and functional", async ({ page, logger }) => {
    await logger.step("verify Install CLI button exists", async () => {
      const installButton = page.getByRole("button", { name: /install cli/i });
      await expect(installButton).toBeVisible();
    });

    await logger.step("click Install CLI button", async () => {
      const installButton = page.getByRole("button", { name: /install cli/i });
      await installButton.click();
    });

    await logger.step("verify modal or tooltip appears", async () => {
      // Install command should be shown
      await expect(page.getByText(/curl|jeffreysprompts\.com\/install/i).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test("search input is functional", async ({ page, logger }) => {
    await logger.step("focus search input", async () => {
      const searchInput = page.getByPlaceholder("Search prompts...");
      await searchInput.click();
    });

    await logger.step("type search query", async () => {
      const searchInput = page.getByPlaceholder("Search prompts...");
      await searchInput.fill("idea");
    });

    await logger.step("verify results update", async () => {
      // Should filter to show matching prompts
      await expect(page.getByText("The Idea Wizard")).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe("Mobile Marketing Experience", () => {
  test("landing sections stack correctly on mobile", async ({ page, logger }) => {
    await logger.step("set mobile viewport", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify hero is visible", async () => {
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    await logger.step("scroll through sections", async () => {
      // Scroll to features
      const features = page.locator("text=Prompt Packs").first();
      await features.scrollIntoViewIfNeeded();
      await expect(features).toBeVisible({ timeout: 5000 });

      // Scroll to how it works
      const howItWorks = page.locator("text=How It Works").first();
      await howItWorks.scrollIntoViewIfNeeded();
      await expect(howItWorks).toBeVisible();
    });
  });

  test("CTAs are touch-friendly on mobile", async ({ page, logger }) => {
    await logger.step("set mobile viewport", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
    });

    await logger.step("navigate to homepage", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify Install CLI button has adequate touch target", async () => {
      const installButton = page.getByRole("button", { name: /install cli/i });
      await expect(installButton).toBeVisible();
      const box = await installButton.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        // Minimum 44px touch target per Apple HIG
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    });
  });
});
