/**
 * Moderation Helpers - E2E test utilities for spam detection and content reporting
 *
 * Provides utilities for:
 * - Testing spam detection via support tickets API
 * - Testing content reporting flow
 * - Verifying rate limiting behavior
 */

import type { Page, APIRequestContext } from "@playwright/test";

/** Content report reasons matching the app */
export const REPORT_REASONS = [
  "spam",
  "offensive",
  "copyright",
  "harmful",
  "other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

/** Content types that can be reported */
export const REPORT_CONTENT_TYPES = [
  "prompt",
  "bundle",
  "workflow",
  "collection",
] as const;

export type ReportContentType = (typeof REPORT_CONTENT_TYPES)[number];

/** Spam detection thresholds (from app) */
export const SPAM_THRESHOLDS = {
  HARD_BLOCK: 0.7,
  REVIEW: 0.4,
} as const;

/** Known spam terms that trigger detection */
export const SPAM_TERMS = [
  "free money",
  "work from home",
  "guaranteed",
  "click here",
  "buy now",
  "limited offer",
  "winner",
  "promo code",
  "crypto",
  "bitcoin",
  "airdrop",
];

/** Report dialog locators */
export function getReportDialogLocators(page: Page) {
  return {
    reportButton: page.getByRole("button", { name: /report/i }),
    dialog: page.getByRole("dialog"),
    reasonSelect: page.locator("[data-testid='report-reason']"),
    detailsInput: page.getByPlaceholder(/details|additional/i),
    submitButton: page.getByRole("button", { name: /submit|send/i }),
    cancelButton: page.getByRole("button", { name: /cancel/i }),
    successMessage: page.getByText(/report.*submitted|thank you/i),
    errorMessage: page.locator("[role='alert'], .text-destructive"),
  };
}

/** Contact form spam test data generators */
export const spamTestData = {
  /** Content that should be hard blocked (score >= 0.7) */
  hardBlockContent: {
    name: "Spam Bot",
    email: "spam@test.com",
    subject: "FREE MONEY GUARANTEED",
    message: `
      Click here for FREE MONEY!
      GUARANTEED winner! Buy now!
      https://spam1.com https://spam2.com https://spam3.com
      This is a limited offer!
      AAAAAAAAAAAAAAAAAAAA
    `,
    category: "general" as const,
    priority: "low" as const,
  },

  /** Content that should trigger review (score 0.4-0.7) */
  reviewContent: {
    name: "Borderline User",
    email: "borderline@test.com",
    subject: "Check out this bitcoin opportunity",
    message: `
      I found this great crypto opportunity!
      Visit https://example.com for more info.
    `,
    category: "general" as const,
    priority: "low" as const,
  },

  /** Legitimate content that should pass */
  legitimateContent: {
    name: "Real User",
    email: "real@example.com",
    subject: "Question about prompts",
    message: "I have a question about how to use the idea wizard prompt. Can you help?",
    category: "general" as const,
    priority: "medium" as const,
  },

  /** Content with excessive caps */
  excessiveCaps: {
    name: "CAPS USER",
    email: "caps@test.com",
    subject: "THIS IS ALL CAPS",
    message: "THIS ENTIRE MESSAGE IS WRITTEN IN CAPITAL LETTERS AND IS QUITE LONG TO TRIGGER THE DETECTOR SINCE SHORT MESSAGES ARE EXEMPT",
    category: "general" as const,
    priority: "low" as const,
  },

  /** Content with repeated characters */
  repeatedChars: {
    name: "Repeat User",
    email: "repeat@test.com",
    subject: "Test with repeated chars",
    message: "Pleaseeeeeeee help me with this issueeeeeeee I'm having trooooooouble",
    category: "general" as const,
    priority: "low" as const,
  },

  /** Content with multiple URLs */
  multipleUrls: {
    name: "Link User",
    email: "links@test.com",
    subject: "Resources I found",
    message: `
      Check these links:
      https://example1.com
      https://example2.com
      https://example3.com
      https://example4.com
    `,
    category: "feedback" as const,
    priority: "low" as const,
  },
};

/** Report test data generators */
export const reportTestData = {
  validReport: {
    contentType: "prompt" as ReportContentType,
    contentId: "idea-wizard",
    contentTitle: "The Idea Wizard",
    reason: "spam" as ReportReason,
    details: "This prompt appears to be spam content.",
  },

  reportWithoutDetails: {
    contentType: "prompt" as ReportContentType,
    contentId: "readme-reviser",
    reason: "offensive" as ReportReason,
  },

  copyrightReport: {
    contentType: "bundle" as ReportContentType,
    contentId: "getting-started",
    reason: "copyright" as ReportReason,
    details: "This content infringes on my copyright.",
  },
};

/**
 * Submit a support ticket via API
 */
export async function submitSupportTicket(
  request: APIRequestContext,
  data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    category: string;
    priority: string;
  }
): Promise<{ status: number; body: unknown }> {
  const response = await request.post("/api/support/tickets", {
    data,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return {
    status: response.status(),
    body: await response.json().catch(() => null),
  };
}

/**
 * Submit a content report via API
 */
export async function submitContentReport(
  request: APIRequestContext,
  data: {
    contentType: ReportContentType;
    contentId: string;
    contentTitle?: string;
    reason: ReportReason;
    details?: string;
  }
): Promise<{ status: number; body: unknown }> {
  const response = await request.post("/api/reports", {
    data,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return {
    status: response.status(),
    body: await response.json().catch(() => null),
  };
}

/**
 * Navigate to a prompt detail page
 */
export async function navigateToPrompt(page: Page, promptId: string): Promise<void> {
  await page.goto(`/prompts/${promptId}`);
  await page.waitForLoadState("networkidle");
}

/**
 * Open report dialog on current page
 */
export async function openReportDialog(page: Page): Promise<void> {
  const { reportButton, dialog } = getReportDialogLocators(page);
  await reportButton.first().click();
  await dialog.waitFor({ state: "visible" });
}

/**
 * Fill report form
 */
export async function fillReportForm(
  page: Page,
  data: {
    reason: ReportReason;
    details?: string;
  }
): Promise<void> {
  const { reasonSelect, detailsInput } = getReportDialogLocators(page);

  // Select reason
  await reasonSelect.click();
  await page.getByRole("option", { name: new RegExp(data.reason, "i") }).click();

  // Fill details if provided
  if (data.details) {
    await detailsInput.fill(data.details);
  }
}

/**
 * Submit report form
 */
export async function submitReportForm(page: Page): Promise<void> {
  const { submitButton } = getReportDialogLocators(page);
  await submitButton.click();
}

/**
 * Generate content that exceeds a specific spam score
 */
export function generateSpamContent(targetScore: number): string {
  const parts: string[] = [];

  // Each spam term adds 0.15
  if (targetScore >= 0.15) {
    parts.push("This is free money!");
  }
  if (targetScore >= 0.30) {
    parts.push("Guaranteed to work!");
  }
  if (targetScore >= 0.45) {
    parts.push("Buy now for limited offer!");
  }
  if (targetScore >= 0.60) {
    parts.push("Click here to see the promo code!");
  }

  // 3+ URLs add 0.35
  if (targetScore >= 0.35) {
    parts.push("https://spam1.com https://spam2.com https://spam3.com");
  }

  return parts.join(" ");
}

/**
 * Wait for rate limit to reset (for testing rate limiting)
 * Note: In tests, we may need to mock time or use test-specific endpoints
 */
export async function waitForRateLimitReset(page: Page, seconds: number): Promise<void> {
  await page.waitForTimeout(seconds * 1000);
}

/**
 * Extract spam check result from API error response
 */
export function extractSpamCheckFromError(body: unknown): {
  isSpam: boolean;
  reasons: string[];
} | null {
  if (!body || typeof body !== "object") return null;
  const errorBody = body as { error?: string; reasons?: string[] };
  if (errorBody.error?.toLowerCase().includes("spam")) {
    return {
      isSpam: true,
      reasons: errorBody.reasons ?? [],
    };
  }
  return null;
}
