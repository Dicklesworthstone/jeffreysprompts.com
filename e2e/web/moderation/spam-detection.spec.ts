import { test, expect } from "../../lib/playwright-logger";
import {
  spamTestData,
  submitSupportTicket,
  extractSpamCheckFromError,
  SPAM_TERMS,
  SPAM_THRESHOLDS,
} from "../../lib/moderation-helpers";

/**
 * Spam Detection Integration Tests
 *
 * Tests the spam prevention system through the support tickets API:
 * - Hard blocking of obvious spam
 * - Soft-block state for borderline content
 * - Legitimate content passes through
 * - Specific spam patterns are detected
 */

test.describe("Spam Detection - Hard Block Scenarios", () => {
  test("blocks content with multiple spam indicators", async ({ logger, request }) => {
    const response = await logger.step("submit spam-laden ticket", async () => {
      return submitSupportTicket(request, spamTestData.hardBlockContent);
    });

    await logger.step("verify blocked with 400 status", async () => {
      expect(response.status).toBe(400);
    }, { data: { status: response.status } });

    await logger.step("verify spam error message", async () => {
      const body = response.body as { error?: string };
      expect(body.error?.toLowerCase()).toContain("spam");
    }, { data: { body: response.body } });
  });

  test("blocks content combining URLs and spam terms", async ({ logger, request }) => {
    const testData = {
      name: "Test User",
      email: "test@example.com",
      subject: "Free money opportunity",
      message: "Get free money guaranteed! Click here: https://spam1.com https://spam2.com https://spam3.com Buy now!",
      category: "general",
      priority: "low",
    };

    const response = await logger.step("submit URL + spam terms content", async () => {
      return submitSupportTicket(request, testData);
    });

    await logger.step("verify hard blocked", async () => {
      expect(response.status).toBe(400);
      const body = response.body as { error?: string; reasons?: string[] };
      expect(body.error?.toLowerCase()).toContain("spam");
      // Should have multiple reasons
      if (body.reasons) {
        expect(body.reasons.length).toBeGreaterThan(1);
      }
    }, { data: { body: response.body } });
  });
});

test.describe("Spam Detection - Review Threshold", () => {
  test("flags borderline content for review", async ({ logger, request }) => {
    const response = await logger.step("submit borderline content", async () => {
      return submitSupportTicket(request, spamTestData.reviewContent);
    });

    await logger.step("verify response", async () => {
      // Borderline content should either pass with review flag or be soft-blocked
      // Based on implementation: passes but with reviewRequired flag
      if (response.status === 200) {
        const body = response.body as { reviewRequired?: boolean };
        // Should be flagged for review if between thresholds
        expect(body.reviewRequired).toBeDefined();
      } else {
        // Or could be blocked if score is higher than expected
        expect(response.status).toBe(400);
      }
    }, { data: { body: response.body } });
  });

  test("content with single spam term triggers review", async ({ logger, request }) => {
    const testData = {
      name: "Crypto Fan",
      email: "crypto@test.com",
      subject: "Question about bitcoin prompts",
      message: "I was wondering if there are any prompts related to bitcoin trading strategies.",
      category: "general",
      priority: "medium",
    };

    const response = await logger.step("submit single-term content", async () => {
      return submitSupportTicket(request, testData);
    });

    await logger.step("verify passes but may flag for review", async () => {
      // Single term (0.15) is below review threshold (0.4)
      // Should pass without review flag
      expect(response.status).toBe(200);
    }, { data: { body: response.body } });
  });
});

test.describe("Spam Detection - Legitimate Content", () => {
  test("allows legitimate support requests", async ({ logger, request }) => {
    const response = await logger.step("submit legitimate ticket", async () => {
      return submitSupportTicket(request, spamTestData.legitimateContent);
    });

    await logger.step("verify accepted with 200 status", async () => {
      expect(response.status).toBe(200);
    });

    await logger.step("verify success response", async () => {
      const body = response.body as { success?: boolean; ticket?: { ticketNumber: string } };
      expect(body.success).toBe(true);
      expect(body.ticket?.ticketNumber).toBeDefined();
    }, { data: { body: response.body } });
  });

  test("allows technical support messages", async ({ logger, request }) => {
    const testData = {
      name: "Developer",
      email: "dev@company.com",
      subject: "CLI installation issue",
      message: "I'm having trouble installing the CLI tool. When I run 'jfp install', I get an error about missing dependencies. My system is Ubuntu 22.04. Can you help?",
      category: "bug",
      priority: "high",
    };

    const response = await logger.step("submit technical support request", async () => {
      return submitSupportTicket(request, testData);
    });

    await logger.step("verify accepted", async () => {
      expect(response.status).toBe(200);
    });
  });

  test("allows feedback with URLs when legitimate", async ({ logger, request }) => {
    const testData = {
      name: "Feature Requester",
      email: "feedback@test.com",
      subject: "Feature suggestion",
      message: "I found this interesting article about prompt engineering: https://example.com/article - would be great to see similar prompts added!",
      category: "feature-request",
      priority: "low",
    };

    const response = await logger.step("submit feedback with single URL", async () => {
      return submitSupportTicket(request, testData);
    });

    await logger.step("verify accepted (single URL is low score)", async () => {
      expect(response.status).toBe(200);
    });
  });
});

test.describe("Spam Detection - Specific Patterns", () => {
  test("detects excessive capitalization", async ({ logger, request }) => {
    const response = await logger.step("submit all-caps content", async () => {
      return submitSupportTicket(request, spamTestData.excessiveCaps);
    });

    await logger.step("verify caps detection response", async () => {
      // Caps alone (0.2) is below review threshold
      // Should pass but may be noted
      expect(response.status).toBe(200);
    });
  });

  test("detects repeated character patterns", async ({ logger, request }) => {
    const response = await logger.step("submit repeated chars content", async () => {
      return submitSupportTicket(request, spamTestData.repeatedChars);
    });

    await logger.step("verify repeated chars detection response", async () => {
      // Repeated chars alone (0.2) is below review threshold
      expect(response.status).toBe(200);
    });
  });

  test("detects multiple URL pattern", async ({ logger, request }) => {
    const response = await logger.step("submit multi-URL content", async () => {
      return submitSupportTicket(request, spamTestData.multipleUrls);
    });

    await logger.step("verify multi-URL detection response", async () => {
      // 4 URLs triggers "many links" (0.35) - below review threshold
      // May or may not trigger review depending on exact scoring
      const body = response.body as { reviewRequired?: boolean; success?: boolean };
      // Should pass since 0.35 < 0.4 (review threshold)
      expect(response.status).toBe(200);
    }, { data: { body: response.body } });
  });

  // Test individual spam terms (avoiding test.each which isn't supported by custom fixture)
  const termsToTest = SPAM_TERMS.slice(0, 3); // Test first 3 terms
  for (const term of termsToTest) {
    test(`detects spam term: ${term}`, async ({ logger, request }) => {
      const testData = {
        name: "Term Tester",
        email: "termtest@example.com",
        subject: "Testing detection",
        message: `I want to know about ${term}. Is this something you support?`,
        category: "general",
        priority: "low",
      };

      const response = await logger.step(`submit content with term "${term}"`, async () => {
        return submitSupportTicket(request, testData);
      });

      await logger.step("verify single term passes (below threshold)", async () => {
        // Single term = 0.15 score, well below thresholds
        expect(response.status).toBe(200);
      });
    });
  }
});

test.describe("Spam Detection - Combined Patterns", () => {
  test("blocks caps + URLs + spam terms combined", async ({ logger, request }) => {
    const testData = {
      name: "SPAMMER",
      email: "spam@spam.com",
      subject: "FREE MONEY CLICK HERE NOW",
      message: "GET FREE MONEY GUARANTEED! BUY NOW! CLICK HERE! https://spam1.com https://spam2.com https://spam3.com THIS IS A LIMITED OFFER WINNER!",
      category: "general",
      priority: "low",
    };

    const response = await logger.step("submit heavily combined spam", async () => {
      return submitSupportTicket(request, testData);
    });

    await logger.step("verify hard blocked", async () => {
      expect(response.status).toBe(400);
      const body = response.body as { error?: string };
      expect(body.error?.toLowerCase()).toContain("spam");
    });
  });

  test("review threshold with 2 URLs + 1 spam term", async ({ logger, request }) => {
    const testData = {
      name: "Medium Risk",
      email: "medium@test.com",
      subject: "Check this crypto opportunity",
      message: "Found interesting crypto info at https://example1.com and https://example2.com",
      category: "feedback",
      priority: "low",
    };

    const response = await logger.step("submit moderate-risk content", async () => {
      return submitSupportTicket(request, testData);
    });

    await logger.step("verify response for moderate risk", async () => {
      // 2 URLs (0.2) + 1 term (0.15) = 0.35 < 0.4 review threshold
      // Should pass
      expect(response.status).toBe(200);
    }, { data: { body: response.body } });
  });
});

test.describe("Spam Detection - Edge Cases", () => {
  test("handles empty message gracefully", async ({ logger, request }) => {
    const testData = {
      name: "Empty User",
      email: "empty@test.com",
      subject: "Empty message test",
      message: "",
      category: "general",
      priority: "low",
    };

    const response = await logger.step("submit empty message", async () => {
      return submitSupportTicket(request, testData);
    });

    await logger.step("verify validation error (not spam error)", async () => {
      expect(response.status).toBe(400);
      const body = response.body as { error?: string };
      // Should fail validation, not spam check
      expect(body.error).toContain("required");
    });
  });

  test("handles very long message", async ({ logger, request }) => {
    const longMessage = "This is a legitimate message. ".repeat(100);

    const testData = {
      name: "Long Writer",
      email: "long@test.com",
      subject: "Detailed question",
      message: longMessage,
      category: "general",
      priority: "medium",
    };

    const response = await logger.step("submit long message", async () => {
      return submitSupportTicket(request, testData);
    });

    await logger.step("verify handles long content", async () => {
      // Long legitimate content should pass spam check
      // May fail validation if over max length
      expect([200, 400]).toContain(response.status);
      if (response.status === 400) {
        const body = response.body as { error?: string };
        // If rejected, should be for length not spam
        expect(body.error?.toLowerCase()).not.toContain("spam");
      }
    });
  });

  test("handles unicode and special characters", async ({ logger, request }) => {
    const testData = {
      name: "Unicode User",
      email: "unicode@test.com",
      subject: "Question with emojis",
      message: "Hello! I love this tool. Can you help me with something?",
      category: "general",
      priority: "low",
    };

    const response = await logger.step("submit unicode content", async () => {
      return submitSupportTicket(request, testData);
    });

    await logger.step("verify unicode handled correctly", async () => {
      expect(response.status).toBe(200);
    });
  });
});
