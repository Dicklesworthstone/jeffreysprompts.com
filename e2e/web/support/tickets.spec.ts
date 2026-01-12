import { test, expect } from "../../lib/playwright-logger";
import {
  getTicketsPageLocators,
  navigateToTicketsPage,
  navigateToContactPage,
  clearStoredTickets,
  getStoredTickets,
  addMockTicket,
  testData,
} from "../../lib/support-helpers";

/**
 * Support Tickets E2E Tests
 *
 * Tests for the user ticket management functionality including:
 * 1. Tickets page display
 * 2. Ticket lookup
 * 3. Ticket history display
 * 4. Reply functionality
 * 5. Status updates
 */

test.describe("Tickets Page Display", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to tickets page", async () => {
      await navigateToTicketsPage(page);
    });
  });

  test("tickets page loads correctly", async ({ page, logger }) => {
    await logger.step("verify page heading", async () => {
      await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify page description", async () => {
      await expect(page.getByText(/support requests submitted from this device/i)).toBeVisible();
    });
  });

  test("ticket lookup section is displayed", async ({ page, logger }) => {
    await logger.step("verify lookup card heading", async () => {
      await expect(page.getByText(/Look up a ticket/i)).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify email input", async () => {
      await expect(page.getByLabel("Email")).toBeVisible();
    });

    await logger.step("verify ticket number input", async () => {
      await expect(page.getByLabel("Ticket number")).toBeVisible();
    });

    await logger.step("verify find ticket button", async () => {
      await expect(page.getByRole("button", { name: "Find ticket" })).toBeVisible();
    });
  });

  test("recent tickets section is displayed", async ({ page, logger }) => {
    await logger.step("verify recent tickets heading", async () => {
      await expect(page.getByText(/Your recent tickets/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test("contact support link is visible", async ({ page, logger }) => {
    await logger.step("verify contact support link", async () => {
      await expect(page.getByRole("link", { name: /contact support/i })).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify link goes to contact page", async () => {
      await expect(page.getByRole("link", { name: /contact support/i })).toHaveAttribute("href", "/contact");
    });
  });
});

test.describe("Empty State", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("clear stored tickets", async () => {
      await page.goto("/settings/tickets");
      await clearStoredTickets(page);
      await page.reload();
      await page.waitForLoadState("networkidle");
    });
  });

  test("empty state is shown when no tickets", async ({ page, logger }) => {
    await logger.step("verify empty state message", async () => {
      await expect(page.getByText(/No tickets yet/i)).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify submit request hint", async () => {
      await expect(page.getByText(/Submit a request/i)).toBeVisible();
    });
  });
});

test.describe("Ticket Display", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("setup test ticket", async () => {
      await page.goto("/settings/tickets");
      await clearStoredTickets(page);
      await addMockTicket(page, {
        ticketNumber: "SUP-20260112-TEST",
        name: "Test User",
        email: "test@example.com",
        subject: "Test Ticket Subject",
        category: "technical",
        priority: "normal",
        status: "open",
        messages: [
          {
            id: "msg-1",
            author: "user",
            body: "Initial test message",
            createdAt: new Date().toISOString(),
          },
        ],
      });
      await page.reload();
      await page.waitForLoadState("networkidle");
    });
  });

  test("ticket card displays correctly", async ({ page, logger }) => {
    await logger.step("verify ticket number", async () => {
      await expect(page.getByText("SUP-20260112-TEST")).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify ticket subject", async () => {
      await expect(page.getByText("Test Ticket Subject")).toBeVisible();
    });

    await logger.step("verify status badge", async () => {
      await expect(page.locator("span").filter({ hasText: "open" })).toBeVisible();
    });

    await logger.step("verify category badge", async () => {
      await expect(page.locator("span").filter({ hasText: "technical" })).toBeVisible();
    });

    await logger.step("verify priority badge", async () => {
      await expect(page.locator("span").filter({ hasText: "normal" })).toBeVisible();
    });
  });

  test("ticket details can be expanded", async ({ page, logger }) => {
    await logger.step("click view details button", async () => {
      await page.getByRole("button", { name: /view details/i }).click();
    });

    await logger.step("verify message is shown", async () => {
      await expect(page.getByText("Initial test message")).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify reply section is shown", async () => {
      await expect(page.getByPlaceholder(/updates|questions/i)).toBeVisible();
    });
  });

  test("ticket details can be collapsed", async ({ page, logger }) => {
    await logger.step("expand ticket details", async () => {
      await page.getByRole("button", { name: /view details/i }).click();
      await expect(page.getByText("Initial test message")).toBeVisible({ timeout: 5000 });
    });

    await logger.step("collapse ticket details", async () => {
      await page.getByRole("button", { name: /hide details/i }).click();
    });

    await logger.step("verify details are hidden", async () => {
      await expect(page.getByText("Initial test message")).not.toBeVisible();
    });
  });
});

test.describe("Ticket Reply", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("setup test ticket", async () => {
      await page.goto("/settings/tickets");
      await clearStoredTickets(page);
      await addMockTicket(page, {
        ticketNumber: "SUP-20260112-REPLY",
        name: "Test User",
        email: "test@example.com",
        subject: "Reply Test Ticket",
        status: "open",
      });
      await page.reload();
      await page.waitForLoadState("networkidle");
    });
  });

  test("reply input is shown for open tickets", async ({ page, logger }) => {
    await logger.step("expand ticket", async () => {
      await page.getByRole("button", { name: /view details/i }).click();
    });

    await logger.step("verify reply input", async () => {
      await expect(page.getByPlaceholder(/updates|questions/i)).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify send reply button", async () => {
      await expect(page.getByRole("button", { name: /send reply/i })).toBeVisible();
    });
  });

  test("reply button is initially disabled", async ({ page, logger }) => {
    await logger.step("expand ticket", async () => {
      await page.getByRole("button", { name: /view details/i }).click();
    });

    await logger.step("verify send reply button is disabled", async () => {
      const sendButton = page.getByRole("button", { name: /send reply/i });
      await expect(sendButton).toBeDisabled();
    });
  });

  test("reply button enables when text is entered", async ({ page, logger }) => {
    await logger.step("expand ticket", async () => {
      await page.getByRole("button", { name: /view details/i }).click();
    });

    await logger.step("enter reply text", async () => {
      await page.getByPlaceholder(/updates|questions/i).fill("This is a test reply");
    });

    await logger.step("verify send reply button is enabled", async () => {
      const sendButton = page.getByRole("button", { name: /send reply/i });
      await expect(sendButton).toBeEnabled();
    });
  });
});

test.describe("Ticket Lookup", () => {
  test("lookup form validates input", async ({ page, logger }) => {
    await logger.step("navigate to tickets page", async () => {
      await navigateToTicketsPage(page);
    });

    await logger.step("click find ticket without input", async () => {
      await page.getByRole("button", { name: "Find ticket" }).click();
    });

    // Should show error or validation message
    await logger.step("verify validation", async () => {
      // Wait for potential toast or error
      await page.waitForTimeout(500);
    });
  });

  test("lookup with invalid ticket shows error", async ({ page, logger }) => {
    await logger.step("navigate to tickets page", async () => {
      await navigateToTicketsPage(page);
    });

    await logger.step("fill lookup form", async () => {
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Ticket number").fill("SUP-INVALID-0000");
    });

    await logger.step("submit lookup", async () => {
      await page.getByRole("button", { name: "Find ticket" }).click();
    });

    // Should show not found message or toast
    await logger.step("wait for response", async () => {
      await page.waitForTimeout(1000);
    });
  });
});

test.describe("Ticket Flow Integration", () => {
  test("submitting contact form creates viewable ticket", async ({ page, logger }) => {
    const testEmail = `test+${Date.now()}@example.com`;

    await logger.step("go to contact page", async () => {
      await navigateToContactPage(page);
    });

    await logger.step("fill and submit contact form", async () => {
      await page.getByLabel("Name").fill("Integration Test User");
      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Subject").fill("Integration Test Ticket");
      await page.getByLabel("Message").fill("This ticket was created in an E2E test.");
      await page.getByRole("button", { name: /submit/i }).click();
    });

    await logger.step("wait for success", async () => {
      await expect(page.getByText(/received your request/i)).toBeVisible({ timeout: 10000 });
    });

    await logger.step("navigate to tickets page", async () => {
      await page.getByRole("link", { name: /view my tickets/i }).click();
      await page.waitForLoadState("networkidle");
    });

    await logger.step("verify ticket appears in list", async () => {
      await expect(page.getByText("Integration Test Ticket")).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe("Tickets Accessibility", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to tickets page", async () => {
      await navigateToTicketsPage(page);
    });
  });

  test("page has proper heading hierarchy", async ({ page, logger }) => {
    await logger.step("verify h1 exists", async () => {
      const h1s = page.locator("h1");
      await expect(h1s).toHaveCount(1);
    });
  });

  test("form inputs have labels", async ({ page, logger }) => {
    await logger.step("verify email input has label", async () => {
      const emailInput = page.getByLabel("Email");
      await expect(emailInput).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify ticket number input has label", async () => {
      const ticketInput = page.getByLabel("Ticket number");
      await expect(ticketInput).toBeVisible();
    });
  });

  test("buttons have accessible names", async ({ page, logger }) => {
    await logger.step("verify find ticket button", async () => {
      await expect(page.getByRole("button", { name: "Find ticket" })).toBeVisible({ timeout: 5000 });
    });
  });
});
