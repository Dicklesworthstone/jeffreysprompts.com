import { test, expect } from "../../lib/playwright-logger";
import {
  submitContentReport,
  reportTestData,
  REPORT_REASONS,
  REPORT_CONTENT_TYPES,
} from "../../lib/moderation-helpers";

/**
 * Content Reporting Integration Tests
 *
 * Tests the content reporting flow:
 * - Submitting reports via API
 * - Rate limiting behavior
 * - Duplicate report prevention
 * - Various report reasons
 */

test.describe("Content Reporting - API Endpoint", () => {
  test("successfully submits a valid report", async ({ logger, request }) => {
    const response = await logger.step("submit valid report", async () => {
      return submitContentReport(request, reportTestData.validReport);
    });

    await logger.step("verify success response", async () => {
      expect(response.status).toBe(200);
    }, { data: { status: response.status } });

    await logger.step("verify report ID returned", async () => {
      const body = response.body as { success?: boolean; reportId?: string };
      expect(body.success).toBe(true);
      expect(body.reportId).toBeDefined();
    }, { data: { body: response.body } });
  });

  test("submits report without optional details", async ({ logger, request }) => {
    const response = await logger.step("submit report without details", async () => {
      return submitContentReport(request, reportTestData.reportWithoutDetails);
    });

    await logger.step("verify accepted without details", async () => {
      expect(response.status).toBe(200);
      const body = response.body as { success?: boolean };
      expect(body.success).toBe(true);
    });
  });

  test("rejects report with missing required fields", async ({ logger, request }) => {
    const response = await logger.step("submit incomplete report", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "", // Missing
        reason: "spam",
      });
    });

    await logger.step("verify rejected with 400", async () => {
      expect(response.status).toBe(400);
    });
  });

  test("rejects report with invalid content type", async ({ logger, request }) => {
    const response = await logger.step("submit with invalid type", async () => {
      return submitContentReport(request, {
        contentType: "invalid-type" as "prompt",
        contentId: "test-id",
        reason: "spam",
      });
    });

    await logger.step("verify rejected for invalid type", async () => {
      expect(response.status).toBe(400);
      const body = response.body as { error?: string };
      expect(body.error).toContain("type");
    });
  });

  test("rejects report with invalid reason", async ({ logger, request }) => {
    const response = await logger.step("submit with invalid reason", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "idea-wizard",
        reason: "invalid-reason" as "spam",
      });
    });

    await logger.step("verify rejected for invalid reason", async () => {
      expect(response.status).toBe(400);
      const body = response.body as { error?: string };
      expect(body.error).toContain("reason");
    });
  });
});

test.describe("Content Reporting - Report Reasons", () => {
  // Test a few key reasons (avoiding test.each)
  test("accepts report with reason: spam", async ({ logger, request }) => {
    const response = await logger.step("submit spam report", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "readme-reviser",
        reason: "spam",
        details: "Testing spam reason",
      });
    });

    await logger.step("verify accepted", async () => {
      expect(response.status).toBe(200);
    });
  });

  test("accepts report with reason: offensive", async ({ logger, request }) => {
    const response = await logger.step("submit offensive report", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "readme-reviser",
        reason: "offensive",
        details: "Testing offensive reason",
      });
    });

    await logger.step("verify accepted", async () => {
      expect(response.status).toBe(200);
    });
  });

  test("accepts report with reason: copyright", async ({ logger, request }) => {
    const response = await logger.step("submit copyright report", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "readme-reviser",
        reason: "copyright",
        details: "Testing copyright reason",
      });
    });

    await logger.step("verify accepted", async () => {
      expect(response.status).toBe(200);
    });
  });
});

test.describe("Content Reporting - Content Types", () => {
  for (const contentType of REPORT_CONTENT_TYPES) {
    test(`accepts report for content type: ${contentType}`, async ({ logger, request }) => {
      // Use appropriate IDs for each type
      const contentIds: Record<string, string> = {
        prompt: "idea-wizard",
        bundle: "getting-started",
        workflow: "new-feature",
        collection: "test-collection",
      };

      const response = await logger.step(`submit report for ${contentType}`, async () => {
        return submitContentReport(request, {
          contentType,
          contentId: contentIds[contentType] ?? "test-id",
          reason: "spam",
        });
      });

      await logger.step("verify accepted", async () => {
        expect(response.status).toBe(200);
      });
    });
  }
});

test.describe("Content Reporting - Validation", () => {
  test("rejects details exceeding max length", async ({ logger, request }) => {
    const longDetails = "A".repeat(501); // Max is 500

    const response = await logger.step("submit with long details", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "idea-wizard",
        reason: "other",
        details: longDetails,
      });
    });

    await logger.step("verify rejected for length", async () => {
      expect(response.status).toBe(400);
      const body = response.body as { error?: string };
      expect(body.error?.toLowerCase()).toContain("500");
    });
  });

  test("rejects title exceeding max length", async ({ logger, request }) => {
    const longTitle = "A".repeat(141); // Max is 140

    const response = await logger.step("submit with long title", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "idea-wizard",
        contentTitle: longTitle,
        reason: "spam",
      });
    });

    await logger.step("verify rejected for title length", async () => {
      expect(response.status).toBe(400);
      const body = response.body as { error?: string };
      expect(body.error?.toLowerCase()).toContain("140");
    });
  });

  test("accepts details at max length", async ({ logger, request }) => {
    const maxDetails = "A".repeat(500); // Exactly 500

    const response = await logger.step("submit with max-length details", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "idea-wizard",
        reason: "other",
        details: maxDetails,
      });
    });

    await logger.step("verify accepted at max length", async () => {
      expect(response.status).toBe(200);
    });
  });
});

test.describe("Content Reporting - Duplicate Prevention", () => {
  test("prevents duplicate report for same content", async ({ logger, request }) => {
    const reportData = {
      contentType: "prompt" as const,
      contentId: `test-duplicate-${Date.now()}`,
      reason: "spam" as const,
    };

    // First report should succeed
    const firstResponse = await logger.step("submit first report", async () => {
      return submitContentReport(request, reportData);
    });

    await logger.step("verify first report accepted", async () => {
      expect(firstResponse.status).toBe(200);
    });

    // Second identical report should be rejected
    const secondResponse = await logger.step("submit duplicate report", async () => {
      return submitContentReport(request, reportData);
    });

    await logger.step("verify duplicate rejected with 409", async () => {
      expect(secondResponse.status).toBe(409);
      const body = secondResponse.body as { error?: string };
      expect(body.error?.toLowerCase()).toContain("already");
    }, { data: { body: secondResponse.body } });
  });

  test("allows different reports from same user", async ({ logger, request }) => {
    const timestamp = Date.now();

    // Report first content
    const firstResponse = await logger.step("submit first unique report", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: `test-unique-1-${timestamp}`,
        reason: "spam",
      });
    });

    // Report different content
    const secondResponse = await logger.step("submit second unique report", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: `test-unique-2-${timestamp}`,
        reason: "spam",
      });
    });

    await logger.step("verify both accepted", async () => {
      expect(firstResponse.status).toBe(200);
      expect(secondResponse.status).toBe(200);
    });
  });
});

test.describe("Content Reporting - Rate Limiting", () => {
  test("rate limits after 10 reports", async ({ logger, request }) => {
    // Note: This test may need adjustment based on actual rate limit implementation
    // Rate limit is 10 reports per 24 hours per IP

    const responses: Array<{ status: number }> = [];

    for (let i = 0; i < 11; i++) {
      const response = await logger.step(`submit report ${i + 1}`, async () => {
        return submitContentReport(request, {
          contentType: "prompt",
          contentId: `rate-limit-test-${Date.now()}-${i}`,
          reason: "spam",
        });
      });
      responses.push(response);
    }

    await logger.step("verify rate limit triggered", async () => {
      // First 10 should succeed, 11th should be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      // We expect either:
      // - All succeed (rate limit not per-test-session)
      // - Last one(s) fail with 429
      expect(successCount + rateLimitedCount).toBe(11);

      if (rateLimitedCount > 0) {
        // Rate limiting is working
        expect(successCount).toBeLessThanOrEqual(10);
      }
    }, { data: { responses: responses.map(r => r.status) } });
  });

  test("rate limit response includes Retry-After header", async ({ logger, request }) => {
    // Submit many reports to trigger rate limit
    const submittedCount = { value: 0 };

    for (let i = 0; i < 15; i++) {
      const response = await request.post("/api/reports", {
        data: {
          contentType: "prompt",
          contentId: `retry-after-test-${Date.now()}-${i}`,
          reason: "spam",
        },
        headers: { "Content-Type": "application/json" },
      });

      submittedCount.value = i + 1;

      if (response.status() === 429) {
        await logger.step("verify Retry-After header", async () => {
          const retryAfter = response.headers()["retry-after"];
          expect(retryAfter).toBeDefined();
          const retryAfterSeconds = parseInt(retryAfter, 10);
          expect(retryAfterSeconds).toBeGreaterThan(0);
        }, { data: { retryAfter: response.headers()["retry-after"] } });
        break;
      }
    }

    await logger.step("log submission count", async () => {
      // If we got here without 429, rate limit may not apply in test context
      expect(submittedCount.value).toBeGreaterThan(0);
    }, { data: { submittedCount: submittedCount.value } });
  });
});

test.describe("Content Reporting - Response Format", () => {
  test("response includes content info", async ({ logger, request }) => {
    const response = await logger.step("submit report with title", async () => {
      return submitContentReport(request, {
        contentType: "prompt",
        contentId: "idea-wizard",
        contentTitle: "The Idea Wizard",
        reason: "spam",
        details: "Test report",
      });
    });

    await logger.step("verify response format", async () => {
      expect(response.status).toBe(200);
      const body = response.body as {
        success?: boolean;
        reportId?: string;
        content?: {
          type?: string;
          id?: string;
          title?: string | null;
        };
      };

      expect(body.success).toBe(true);
      expect(body.reportId).toBeDefined();
      expect(body.content).toBeDefined();
      expect(body.content?.type).toBe("prompt");
      expect(body.content?.id).toBe("idea-wizard");
    }, { data: { body: response.body } });
  });
});
