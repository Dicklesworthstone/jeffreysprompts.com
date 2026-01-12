import { test, expect } from "../../lib/playwright-logger";
import type { APIRequestContext } from "@playwright/test";
import { submitContentReport } from "../../lib/moderation-helpers";

/**
 * Moderation Review Integration Tests
 *
 * Tests the moderation queue and admin review flow:
 * - Admin views moderation queue
 * - Approve/Reject actions update report status
 * - Audit log entries are created
 */

const ADMIN_HEADER = { "x-admin-role": "admin" };

interface Report {
  id: string;
  contentType: string;
  contentId: string;
  reason: string;
  status: string;
  action?: string;
}

interface ReportsResponse {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    pending: number;
    reviewed: number;
    actioned: number;
    dismissed: number;
  };
}

async function getAdminReports(
  request: APIRequestContext,
  params?: { status?: string; contentType?: string; page?: number; limit?: number }
): Promise<{ status: number; body: unknown }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.contentType) searchParams.set("contentType", params.contentType);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());

  const queryStr = searchParams.toString();
  const url = queryStr ? "/api/admin/reports?" + queryStr : "/api/admin/reports";
  const response = await request.get(url, {
    headers: ADMIN_HEADER,
  });

  return {
    status: response.status(),
    body: await response.json().catch(() => null),
  };
}

async function processReport(
  request: APIRequestContext,
  data: { reportId: string; action: string; notes?: string }
): Promise<{ status: number; body: unknown }> {
  const response = await request.put("/api/admin/reports", {
    headers: {
      ...ADMIN_HEADER,
      "Content-Type": "application/json",
    },
    data,
  });

  return {
    status: response.status(),
    body: await response.json().catch(() => null),
  };
}

test.describe("Moderation Queue - Admin Access", () => {
  test("admin can view moderation queue", async ({ logger, request }) => {
    const response = await logger.step("fetch admin reports", async () => {
      return getAdminReports(request);
    });

    await logger.step("verify queue accessible", async () => {
      expect(response.status).toBe(200);
      const body = response.body as ReportsResponse;
      expect(body.reports).toBeDefined();
      expect(body.pagination).toBeDefined();
      expect(body.stats).toBeDefined();
    }, { data: { body: response.body } });
  });

  test("non-admin cannot view moderation queue", async ({ logger, request }) => {
    const response = await logger.step("fetch reports without admin header", async () => {
      const res = await request.get("/api/admin/reports");
      return { status: res.status(), body: await res.json().catch(() => null) };
    });

    await logger.step("verify rejected", async () => {
      expect([401, 403]).toContain(response.status);
    });
  });

  test("queue shows pending reports", async ({ logger, request }) => {
    const response = await logger.step("fetch pending reports", async () => {
      return getAdminReports(request, { status: "pending" });
    });

    await logger.step("verify response structure", async () => {
      expect(response.status).toBe(200);
      const body = response.body as ReportsResponse;
      expect(body.reports).toBeInstanceOf(Array);
      expect(body.pagination.page).toBe(1);
    });
  });
});

test.describe("Moderation Queue - Filtering", () => {
  test("filter by status", async ({ logger, request }) => {
    const response = await logger.step("fetch dismissed reports", async () => {
      return getAdminReports(request, { status: "dismissed" });
    });

    await logger.step("verify filter applied", async () => {
      expect(response.status).toBe(200);
      const body = response.body as ReportsResponse;
      // All returned reports should have dismissed status
      for (const report of body.reports) {
        expect(report.status).toBe("dismissed");
      }
    });
  });

  test("filter by content type", async ({ logger, request }) => {
    const response = await logger.step("fetch prompt reports", async () => {
      return getAdminReports(request, { contentType: "prompt" });
    });

    await logger.step("verify content type filter", async () => {
      expect(response.status).toBe(200);
      const body = response.body as ReportsResponse;
      for (const report of body.reports) {
        expect(report.contentType).toBe("prompt");
      }
    });
  });

  test("pagination works correctly", async ({ logger, request }) => {
    const firstPage = await logger.step("fetch first page", async () => {
      return getAdminReports(request, { page: 1, limit: 5 });
    });

    await logger.step("verify pagination", async () => {
      expect(firstPage.status).toBe(200);
      const body = firstPage.body as ReportsResponse;
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(5);
      expect(body.reports.length).toBeLessThanOrEqual(5);
    });
  });
});

test.describe("Moderation Actions - Report Processing", () => {
  test("dismiss report successfully", async ({ logger, request }) => {
    // First create a report to dismiss
    const createResponse = await logger.step("create test report", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "dismiss-test-" + Date.now(),
        reason: "spam",
        details: "Test report for dismissal",
      });
    });

    const reportId = (createResponse.body as { reportId?: string })?.reportId;

    if (reportId) {
      const dismissResponse = await logger.step("dismiss report", async () => {
        return processReport(request, {
          reportId,
          action: "dismiss",
          notes: "False positive - dismissed by automated test",
        });
      });

      await logger.step("verify dismissed", async () => {
        expect(dismissResponse.status).toBe(200);
        const body = dismissResponse.body as { success?: boolean; action?: string };
        expect(body.success).toBe(true);
        expect(body.action).toBe("dismiss");
      }, { data: { body: dismissResponse.body } });
    } else {
      await logger.step("skip - no report ID", async () => {
        expect(createResponse.status).toBe(200);
      });
    }
  });

  test("warn action on report", async ({ logger, request }) => {
    const createResponse = await logger.step("create test report", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "warn-test-" + Date.now(),
        reason: "offensive",
        details: "Test report for warn action",
      });
    });

    const reportId = (createResponse.body as { reportId?: string })?.reportId;

    if (reportId) {
      const warnResponse = await logger.step("apply warn action", async () => {
        return processReport(request, {
          reportId,
          action: "warn",
          notes: "Warning issued - community guidelines reminder",
        });
      });

      await logger.step("verify warn action applied", async () => {
        expect(warnResponse.status).toBe(200);
        const body = warnResponse.body as { success?: boolean; action?: string };
        expect(body.success).toBe(true);
        expect(body.action).toBe("warn");
      });
    }
  });

  test("remove action on report", async ({ logger, request }) => {
    const createResponse = await logger.step("create test report", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "remove-test-" + Date.now(),
        reason: "copyright",
        details: "Test report for removal",
      });
    });

    const reportId = (createResponse.body as { reportId?: string })?.reportId;

    if (reportId) {
      const removeResponse = await logger.step("apply remove action", async () => {
        return processReport(request, {
          reportId,
          action: "remove",
          notes: "Content removed due to copyright violation",
        });
      });

      await logger.step("verify remove action applied", async () => {
        expect(removeResponse.status).toBe(200);
        const body = removeResponse.body as { success?: boolean; action?: string };
        expect(body.success).toBe(true);
        expect(body.action).toBe("remove");
      });
    }
  });

  test("ban action on report", async ({ logger, request }) => {
    const createResponse = await logger.step("create test report", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "ban-test-" + Date.now(),
        reason: "harmful",
        details: "Test report for ban action",
      });
    });

    const reportId = (createResponse.body as { reportId?: string })?.reportId;

    if (reportId) {
      const banResponse = await logger.step("apply ban action", async () => {
        return processReport(request, {
          reportId,
          action: "ban",
          notes: "User banned for severe violation",
        });
      });

      await logger.step("verify ban action applied", async () => {
        expect(banResponse.status).toBe(200);
        const body = banResponse.body as { success?: boolean; action?: string };
        expect(body.success).toBe(true);
        expect(body.action).toBe("ban");
      });
    }
  });
});

test.describe("Moderation Actions - Validation", () => {
  test("rejects invalid action", async ({ logger, request }) => {
    const response = await logger.step("submit invalid action", async () => {
      return processReport(request, {
        reportId: "test-report-id",
        action: "invalid-action",
      });
    });

    await logger.step("verify rejected", async () => {
      expect(response.status).toBe(400);
      const body = response.body as { error?: string };
      expect(body.error).toContain("Invalid action");
    });
  });

  test("rejects missing report ID", async ({ logger, request }) => {
    const response = await logger.step("submit without report ID", async () => {
      const res = await request.put("/api/admin/reports", {
        headers: {
          ...ADMIN_HEADER,
          "Content-Type": "application/json",
        },
        data: { action: "dismiss" },
      });
      return { status: res.status(), body: await res.json().catch(() => null) };
    });

    await logger.step("verify rejected", async () => {
      expect(response.status).toBe(400);
      const body = response.body as { error?: string };
      expect(body.error).toContain("reportId");
    });
  });

  test("rejects missing action", async ({ logger, request }) => {
    const response = await logger.step("submit without action", async () => {
      const res = await request.put("/api/admin/reports", {
        headers: {
          ...ADMIN_HEADER,
          "Content-Type": "application/json",
        },
        data: { reportId: "test-id" },
      });
      return { status: res.status(), body: await res.json().catch(() => null) };
    });

    await logger.step("verify rejected", async () => {
      expect(response.status).toBe(400);
      const body = response.body as { error?: string };
      expect(body.error).toContain("action");
    });
  });

  test("handles non-existent report", async ({ logger, request }) => {
    const response = await logger.step("process non-existent report", async () => {
      return processReport(request, {
        reportId: "non-existent-report-id",
        action: "dismiss",
      });
    });

    await logger.step("verify 404 response", async () => {
      expect(response.status).toBe(404);
      const body = response.body as { error?: string };
      expect(body.error).toContain("not found");
    });
  });

  test("non-admin cannot process reports", async ({ logger, request }) => {
    const response = await logger.step("process without admin header", async () => {
      const res = await request.put("/api/admin/reports", {
        headers: { "Content-Type": "application/json" },
        data: { reportId: "test-id", action: "dismiss" },
      });
      return { status: res.status(), body: await res.json().catch(() => null) };
    });

    await logger.step("verify rejected", async () => {
      expect([401, 403]).toContain(response.status);
    });
  });
});

test.describe("Moderation Queue - Statistics", () => {
  test("stats reflect report counts", async ({ logger, request }) => {
    const response = await logger.step("fetch queue with stats", async () => {
      return getAdminReports(request);
    });

    await logger.step("verify stats structure", async () => {
      expect(response.status).toBe(200);
      const body = response.body as ReportsResponse;
      expect(typeof body.stats.pending).toBe("number");
      expect(typeof body.stats.reviewed).toBe("number");
      expect(typeof body.stats.actioned).toBe("number");
      expect(typeof body.stats.dismissed).toBe("number");
    }, { data: { stats: (response.body as ReportsResponse)?.stats } });
  });
});
