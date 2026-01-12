import { test, expect } from "../../lib/playwright-logger";

/**
 * Status History Page E2E Tests
 *
 * Tests the incident history page functionality:
 * - Page loads correctly
 * - Statistics display
 * - Incident list
 * - Navigation
 */

test.describe("Status History - Display", () => {
  test("loads history page successfully", async ({ page, logger }) => {
    await logger.step("navigate to history page", async () => {
      await page.goto("/status/history");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify page title exists", async () => {
      const title = page.getByRole("heading", { level: 1, name: /incident history/i });
      await expect(title).toBeVisible();
    });
  });

  test("displays breadcrumb navigation", async ({ page, logger }) => {
    await logger.step("navigate to history page", async () => {
      await page.goto("/status/history");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify breadcrumb exists", async () => {
      const statusBreadcrumb = page.getByRole("link", { name: /^status$/i });
      await expect(statusBreadcrumb).toBeVisible();
    });

    await logger.step("breadcrumb navigates to status page", async () => {
      const statusBreadcrumb = page.getByRole("link", { name: /^status$/i });
      await statusBreadcrumb.click();
      await expect(page).toHaveURL("/status");
    });
  });

  test("displays incident statistics", async ({ page, logger }) => {
    await logger.step("navigate to history page", async () => {
      await page.goto("/status/history");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify statistics cards exist", async () => {
      // Check for stat labels
      const totalLabel = page.getByText(/total incidents/i);
      const resolvedLabel = page.getByText(/resolved/i);
      await expect(totalLabel).toBeVisible();
      await expect(resolvedLabel).toBeVisible();
    });
  });

  test("shows past incidents section", async ({ page, logger }) => {
    await logger.step("navigate to history page", async () => {
      await page.goto("/status/history");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify past incidents heading exists", async () => {
      const pastIncidentsHeading = page.getByRole("heading", { name: /past incidents/i });
      await expect(pastIncidentsHeading).toBeVisible();
    });
  });

  test("shows empty state when no incidents", async ({ page, logger }) => {
    await logger.step("navigate to history page", async () => {
      await page.goto("/status/history");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify empty state or incident list", async () => {
      // Either empty state or incident cards should be visible
      const emptyState = page.getByText(/no past incidents/i);
      const incidentCard = page.locator("[data-testid='incident-card']").first();

      // One of these should be visible
      const emptyStateVisible = await emptyState.isVisible();
      const incidentCardVisible = await incidentCard.isVisible();

      expect(emptyStateVisible || incidentCardVisible).toBe(true);
    });
  });

  test("has footer links", async ({ page, logger }) => {
    await logger.step("navigate to history page", async () => {
      await page.goto("/status/history");
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify footer links exist", async () => {
      const backToStatus = page.getByRole("link", { name: /back to current status/i });
      const returnHome = page.getByRole("link", { name: /return to jeffreysprompts/i });

      await expect(backToStatus).toBeVisible();
      await expect(returnHome).toBeVisible();
    });
  });
});

test.describe("Status History - API", () => {
  test("resolved incidents API returns valid response", async ({ logger, request }) => {
    const response = await logger.step("fetch resolved incidents", async () => {
      return request.get("/api/status/incidents?status=resolved");
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

  test("incidents API supports pagination", async ({ logger, request }) => {
    const response = await logger.step("fetch incidents with limit", async () => {
      return request.get("/api/status/incidents?limit=5");
    });

    await logger.step("verify response status", async () => {
      expect(response.status()).toBe(200);
    });

    await logger.step("verify limited response", async () => {
      const body = await response.json();
      expect(body.incidents.length).toBeLessThanOrEqual(5);
    });
  });
});
