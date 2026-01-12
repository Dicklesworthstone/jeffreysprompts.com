import { test, expect } from "../../lib/playwright-logger";

/**
 * Status Page E2E Tests
 *
 * Tests the public status page functionality:
 * - Page loads correctly
 * - Component status display
 * - Status summary
 * - Links and navigation
 */

test.describe("Status Page - Display", () => {
  test("loads status page successfully", async ({ page, logger }) => {
    await logger.step("navigate to status page", async () => {
      await page.goto("/status");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify page title exists", async () => {
      const title = page.getByRole("heading", { level: 1, name: /system status/i });
      await expect(title).toBeVisible();
    });
  });

  test("displays overall system status", async ({ page, logger }) => {
    await logger.step("navigate to status page", async () => {
      await page.goto("/status");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify status indicator exists", async () => {
      // The status box should contain a status message
      const statusMessage = page.getByText(/all systems operational|experiencing issues|outage/i);
      await expect(statusMessage).toBeVisible();
    });
  });

  test("displays component list", async ({ page, logger }) => {
    await logger.step("navigate to status page", async () => {
      await page.goto("/status");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify components heading exists", async () => {
      const componentsHeading = page.getByRole("heading", { name: /components/i });
      await expect(componentsHeading).toBeVisible();
    });

    await logger.step("verify at least one component is listed", async () => {
      // Components are listed with their display names
      const componentNames = page.getByText(/web application|api|prompt registry/i).first();
      await expect(componentNames).toBeVisible();
    });
  });

  test("displays component status indicators", async ({ page, logger }) => {
    await logger.step("navigate to status page", async () => {
      await page.goto("/status");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify status labels exist for components", async () => {
      // Each component should have a status label
      const statusLabels = page.getByText(/operational|degraded|maintenance/i);
      const count = await statusLabels.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test("shows last updated timestamp", async ({ page, logger }) => {
    await logger.step("navigate to status page", async () => {
      await page.goto("/status");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify last updated text exists", async () => {
      const lastUpdated = page.getByText(/last updated/i);
      await expect(lastUpdated).toBeVisible();
    });
  });

  test("has link to home page", async ({ page, logger }) => {
    await logger.step("navigate to status page", async () => {
      await page.goto("/status");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify link to home exists", async () => {
      const homeLink = page.getByRole("link", { name: /jeffreysprompts|home/i });
      await expect(homeLink).toBeVisible();
    });
  });

  test("has link to history page", async ({ page, logger }) => {
    await logger.step("navigate to status page", async () => {
      await page.goto("/status");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify link to history exists", async () => {
      const historyLink = page.getByRole("link", { name: /history|full history/i });
      await expect(historyLink).toBeVisible();
    });

    await logger.step("click history link navigates correctly", async () => {
      const historyLink = page.getByRole("link", { name: /history|full history/i });
      await historyLink.click();
      await expect(page).toHaveURL(/\/status\/history/);
    });
  });
});

test.describe("Status Page - API", () => {
  test("status API returns valid response", async ({ logger, request }) => {
    const response = await logger.step("fetch status API", async () => {
      return request.get("/api/status");
    });

    await logger.step("verify response status", async () => {
      expect(response.status()).toBe(200);
    });

    await logger.step("verify response structure", async () => {
      const body = await response.json();
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("message");
      expect(body).toHaveProperty("components");
      expect(body).toHaveProperty("updatedAt");
    }, { data: { body: await response.json() } });
  });

  test("quick status API returns simplified response", async ({ logger, request }) => {
    const response = await logger.step("fetch quick status API", async () => {
      return request.get("/api/status?quick=true");
    });

    await logger.step("verify response status", async () => {
      expect(response.status()).toBe(200);
    });

    await logger.step("verify quick response structure", async () => {
      const body = await response.json();
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("message");
      // Quick response should NOT have full component details
      expect(body).not.toHaveProperty("components");
    });
  });

  test("incidents API returns valid response", async ({ logger, request }) => {
    const response = await logger.step("fetch incidents API", async () => {
      return request.get("/api/status/incidents");
    });

    await logger.step("verify response status", async () => {
      expect(response.status()).toBe(200);
    });

    await logger.step("verify response structure", async () => {
      const body = await response.json();
      expect(body).toHaveProperty("incidents");
      expect(body).toHaveProperty("total");
      expect(Array.isArray(body.incidents)).toBe(true);
    });
  });
});
