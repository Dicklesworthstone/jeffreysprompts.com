import { test, expect } from "../lib/playwright-logger";
import {
  gotoAdminDashboard,
  gotoAdminUsers,
  gotoAdminModeration,
  gotoAdminSettings,
  isAdminDashboardAvailable,
  isAdminAccessDenied,
  getDashboardTitle,
  getAdminSidebar,
  getAdminNavLink,
  assertAdminAccessGranted,
  assertAdminAccessDenied,
} from "../lib/admin-helpers";

/**
 * Admin Access Control E2E Tests
 *
 * Tests admin authentication and authorization:
 * - Non-admin users cannot access /admin routes
 * - Admin users can access dashboard
 * - Admin role is verified on each request
 * - Protected routes redirect appropriately
 */

test.describe("Admin Access - Unauthenticated", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("clear authentication state", async () => {
      await page.context().clearCookies();
    });
  });

  test("unauthenticated user cannot access admin dashboard", async ({ page, logger }) => {
    await logger.step("attempt to access admin dashboard", async () => {
      await gotoAdminDashboard(page);
    });

    await logger.step("verify access is denied or redirected", async () => {
      // Either shows access denied or redirects to login
      const isDenied = await isAdminAccessDenied(page);
      const isLoginPage = page.url().includes("login") || page.url().includes("signin");
      const notOnAdmin = !page.url().includes("/admin") || page.url().includes("login");

      expect(isDenied || isLoginPage || notOnAdmin).toBeTruthy();
    });
  });

  test("unauthenticated user cannot access admin users page", async ({ page, logger }) => {
    await logger.step("attempt to access admin users", async () => {
      await gotoAdminUsers(page);
    });

    await logger.step("verify access is denied", async () => {
      const isDenied = await isAdminAccessDenied(page);
      const isLoginPage = page.url().includes("login") || page.url().includes("signin");
      const notOnAdmin = !page.url().includes("/admin/users");

      expect(isDenied || isLoginPage || notOnAdmin).toBeTruthy();
    });
  });

  test("unauthenticated user cannot access moderation page", async ({ page, logger }) => {
    await logger.step("attempt to access moderation", async () => {
      await gotoAdminModeration(page);
    });

    await logger.step("verify access is denied", async () => {
      const isDenied = await isAdminAccessDenied(page);
      const isLoginPage = page.url().includes("login") || page.url().includes("signin");
      const notOnAdmin = !page.url().includes("/admin/moderation");

      expect(isDenied || isLoginPage || notOnAdmin).toBeTruthy();
    });
  });

  test("unauthenticated user cannot access admin settings", async ({ page, logger }) => {
    await logger.step("attempt to access admin settings", async () => {
      await gotoAdminSettings(page);
    });

    await logger.step("verify access is denied", async () => {
      const isDenied = await isAdminAccessDenied(page);
      const isLoginPage = page.url().includes("login") || page.url().includes("signin");
      const notOnAdmin = !page.url().includes("/admin/settings");

      expect(isDenied || isLoginPage || notOnAdmin).toBeTruthy();
    });
  });
});

test.describe("Admin Access - Non-Admin User", () => {
  // Note: These tests require a logged-in non-admin user
  // In a real setup, you would authenticate as a regular user first

  test("non-admin user is denied access to admin dashboard", async ({ page, logger }) => {
    // Skip if we can't test non-admin users
    const canTestNonAdmin = false; // Would need auth setup
    test.skip(!canTestNonAdmin, "Non-admin user testing requires auth setup");

    await logger.step("login as regular user", async () => {
      // TODO: Implement login as non-admin user
    });

    await logger.step("attempt to access admin dashboard", async () => {
      await gotoAdminDashboard(page);
    });

    await logger.step("verify access is denied", async () => {
      await assertAdminAccessDenied(page);
    });
  });

  test("non-admin user cannot bypass via direct URL", async ({ page, logger }) => {
    const canTestNonAdmin = false;
    test.skip(!canTestNonAdmin, "Non-admin user testing requires auth setup");

    await logger.step("login as regular user", async () => {
      // TODO: Implement login as non-admin user
    });

    await logger.step("try accessing protected admin routes directly", async () => {
      const protectedRoutes = [
        "/admin",
        "/admin/users",
        "/admin/moderation",
        "/admin/settings",
        "/admin/featured",
        "/admin/dmca",
        "/admin/appeals",
        "/admin/tickets",
      ];

      for (const route of protectedRoutes) {
        await page.goto(route, { waitUntil: "networkidle" });
        const isDenied = await isAdminAccessDenied(page);
        const isLoginPage = page.url().includes("login");
        expect(isDenied || isLoginPage).toBeTruthy();
      }
    });
  });
});

test.describe("Admin Access - Admin User", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to admin dashboard", async () => {
      await gotoAdminDashboard(page);
      await page.waitForLoadState("networkidle");
    });

    // Check if admin features are available (dev bypass or authenticated)
    const isAvailable = await isAdminDashboardAvailable(page);
    test.skip(!isAvailable, "Admin dashboard not accessible - requires auth or dev bypass");
  });

  test("admin user can access dashboard", async ({ page, logger }) => {
    await logger.step("verify dashboard is visible", async () => {
      const dashboardTitle = getDashboardTitle(page);
      await expect(dashboardTitle).toBeVisible();
    });

    await logger.step("verify admin header is present", async () => {
      const adminLabel = page.locator("text=Admin");
      await expect(adminLabel.first()).toBeVisible();
    });
  });

  test("admin sidebar shows navigation options", async ({ page, logger }) => {
    await logger.step("verify sidebar is visible on desktop", async () => {
      // Sidebar is hidden on mobile
      const viewport = page.viewportSize();
      if (viewport && viewport.width >= 1024) {
        const sidebar = getAdminSidebar(page);
        await expect(sidebar).toBeVisible();
      }
    });

    await logger.step("verify navigation links are present", async () => {
      const navLinks = [
        { label: "Dashboard", href: "/admin" },
        { label: "Users", href: "/admin/users" },
        { label: "Moderation", href: "/admin/moderation" },
        { label: "Settings", href: "/admin/settings" },
      ];

      for (const { label } of navLinks) {
        const link = getAdminNavLink(page, label);
        const isVisible = await link.isVisible().catch(() => false);
        // Nav links should be visible on desktop or in mobile menu
        expect(isVisible || page.viewportSize()!.width < 1024).toBeTruthy();
      }
    });
  });

  test("admin can navigate between admin pages", async ({ page, logger }) => {
    await logger.step("navigate to users page", async () => {
      const usersLink = getAdminNavLink(page, "Users");
      if (await usersLink.isVisible()) {
        await usersLink.click();
        await page.waitForLoadState("networkidle");
        expect(page.url()).toContain("/admin/users");
      } else {
        await gotoAdminUsers(page);
        expect(page.url()).toContain("/admin/users");
      }
    });

    await logger.step("navigate to moderation page", async () => {
      const modLink = getAdminNavLink(page, "Moderation");
      if (await modLink.isVisible()) {
        await modLink.click();
        await page.waitForLoadState("networkidle");
        expect(page.url()).toContain("/admin/moderation");
      } else {
        await gotoAdminModeration(page);
        expect(page.url()).toContain("/admin/moderation");
      }
    });

    await logger.step("navigate back to dashboard", async () => {
      const dashLink = getAdminNavLink(page, "Dashboard");
      if (await dashLink.isVisible()) {
        await dashLink.click();
        await page.waitForLoadState("networkidle");
      } else {
        await gotoAdminDashboard(page);
      }
      // Should be on main admin page (not a subpage)
      const url = page.url();
      expect(url.endsWith("/admin") || url.endsWith("/admin/")).toBeTruthy();
    });
  });

  test("back to site link is visible", async ({ page, logger }) => {
    await logger.step("verify back to site link", async () => {
      const backLink = page.locator("a").filter({ hasText: /back to site/i });
      const isVisible = await backLink.isVisible().catch(() => false);

      if (isVisible) {
        await expect(backLink).toHaveAttribute("href", "/");
      } else {
        // May be in mobile menu
        const mobileBackLink = page.locator("a[href='/']");
        const hasMobileLink = await mobileBackLink.count().then((c) => c > 0);
        expect(hasMobileLink || page.viewportSize()!.width < 1024).toBeTruthy();
      }
    });
  });
});

test.describe("Admin Access - Role Display", () => {
  test("admin role is displayed in header", async ({ page, logger }) => {
    await logger.step("navigate to admin dashboard", async () => {
      await gotoAdminDashboard(page);
      await page.waitForLoadState("networkidle");
    });

    const isAvailable = await isAdminDashboardAvailable(page);
    test.skip(!isAvailable, "Admin dashboard not accessible");

    await logger.step("verify role label is shown", async () => {
      // Role labels could be: "Admin", "Super Admin", "Moderator", etc.
      const roleLabels = page.locator("text=/admin|moderator|super/i");
      const count = await roleLabels.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});

test.describe("Admin Access - API Protection", () => {
  test("admin API returns 401 for unauthenticated requests", async ({ page, logger }) => {
    await logger.step("clear cookies and make API request", async () => {
      await page.context().clearCookies();
    });

    await logger.step("verify API protection", async () => {
      const response = await page.request.get("/api/admin/stats");
      // Should be 401 Unauthorized or 403 Forbidden
      expect([401, 403]).toContain(response.status());
    });
  });

  test("admin reports API returns 401 for unauthenticated requests", async ({ page, logger }) => {
    await logger.step("clear cookies", async () => {
      await page.context().clearCookies();
    });

    await logger.step("verify reports API protection", async () => {
      const response = await page.request.get("/api/admin/reports");
      expect([401, 403]).toContain(response.status());
    });
  });

  test("admin users API returns 401 for unauthenticated requests", async ({ page, logger }) => {
    await logger.step("clear cookies", async () => {
      await page.context().clearCookies();
    });

    await logger.step("verify users API protection", async () => {
      const response = await page.request.get("/api/admin/users");
      expect([401, 403]).toContain(response.status());
    });
  });
});
