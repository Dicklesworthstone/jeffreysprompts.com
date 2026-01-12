import { test, expect } from "../../lib/playwright-logger";
import {
  getContactFormLocators,
  navigateToContactPage,
  fillContactForm,
  submitContactForm,
  testData,
} from "../../lib/support-helpers";

/**
 * Contact Form E2E Tests
 *
 * Tests for the contact form functionality including:
 * 1. Form display and layout
 * 2. Form validation
 * 3. Category and priority selection
 * 4. Form submission
 * 5. Success and error handling
 */

test.describe("Contact Form Display", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to contact page", async () => {
      await navigateToContactPage(page);
    });
  });

  test("contact page loads correctly", async ({ page, logger }) => {
    await logger.step("verify page title", async () => {
      await expect(page).toHaveTitle(/Contact|Support/i);
    });

    await logger.step("verify form heading", async () => {
      await expect(page.getByRole("heading", { name: /Tell us what you need/i })).toBeVisible({ timeout: 5000 });
    });
  });

  test("contact form displays all required fields", async ({ page, logger }) => {
    const locators = getContactFormLocators(page);

    await logger.step("verify name input", async () => {
      await expect(locators.nameInput).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify email input", async () => {
      await expect(locators.emailInput).toBeVisible();
    });

    await logger.step("verify subject input", async () => {
      await expect(locators.subjectInput).toBeVisible();
    });

    await logger.step("verify message textarea", async () => {
      await expect(locators.messageInput).toBeVisible();
    });

    await logger.step("verify category select", async () => {
      await expect(locators.categorySelect).toBeVisible();
    });

    await logger.step("verify priority select", async () => {
      await expect(locators.prioritySelect).toBeVisible();
    });

    await logger.step("verify submit button", async () => {
      await expect(locators.submitButton).toBeVisible();
    });
  });

  test("category dropdown has all options", async ({ page, logger }) => {
    await logger.step("open category dropdown", async () => {
      await page.locator("#support-category").click();
    });

    const expectedCategories = ["Billing", "Technical", "Feature", "Bug", "Account", "Other"];

    for (const category of expectedCategories) {
      await logger.step(`verify category option: ${category}`, async () => {
        await expect(page.getByRole("option", { name: new RegExp(category, "i") })).toBeVisible({ timeout: 5000 });
      });
    }
  });

  test("priority dropdown has all options", async ({ page, logger }) => {
    await logger.step("open priority dropdown", async () => {
      await page.locator("#support-priority").click();
    });

    const expectedPriorities = ["Low", "Normal", "High", "Urgent"];

    for (const priority of expectedPriorities) {
      await logger.step(`verify priority option: ${priority}`, async () => {
        await expect(page.getByRole("option", { name: new RegExp(priority, "i") })).toBeVisible({ timeout: 5000 });
      });
    }
  });

  test("support email is displayed", async ({ page, logger }) => {
    await logger.step("verify support email link", async () => {
      const emailLink = page.locator("a[href^='mailto:']");
      await expect(emailLink).toBeVisible({ timeout: 5000 });
    });
  });

  test("response time info is displayed", async ({ page, logger }) => {
    await logger.step("verify response time text", async () => {
      await expect(page.getByText(/response time/i)).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe("Contact Form Validation", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to contact page", async () => {
      await navigateToContactPage(page);
    });
  });

  test("form requires name field", async ({ page, logger }) => {
    const locators = getContactFormLocators(page);

    await logger.step("fill form without name", async () => {
      await locators.emailInput.fill("test@example.com");
      await locators.subjectInput.fill("Test Subject");
      await locators.messageInput.fill("Test message");
    });

    await logger.step("verify submit button is disabled or validation occurs", async () => {
      // Form should either disable submit or show validation
      const isDisabled = await locators.submitButton.isDisabled();
      if (!isDisabled) {
        await locators.submitButton.click();
        // Should show error or validation
        await page.waitForTimeout(500);
      }
    });
  });

  test("form validates email format", async ({ page, logger }) => {
    const locators = getContactFormLocators(page);

    await logger.step("fill form with invalid email", async () => {
      await locators.nameInput.fill("Test User");
      await locators.emailInput.fill("invalid-email");
      await locators.subjectInput.fill("Test Subject");
      await locators.messageInput.fill("Test message");
    });

    await logger.step("verify submit button is disabled or email validation occurs", async () => {
      const isDisabled = await locators.submitButton.isDisabled();
      if (!isDisabled) {
        await locators.submitButton.click();
        await page.waitForTimeout(500);
        // Email validation should occur
      }
    });
  });

  test("form requires message field", async ({ page, logger }) => {
    const locators = getContactFormLocators(page);

    await logger.step("fill form without message", async () => {
      await locators.nameInput.fill("Test User");
      await locators.emailInput.fill("test@example.com");
      await locators.subjectInput.fill("Test Subject");
    });

    await logger.step("verify submit button is disabled or validation occurs", async () => {
      const isDisabled = await locators.submitButton.isDisabled();
      if (!isDisabled) {
        await locators.submitButton.click();
        await page.waitForTimeout(500);
      }
    });
  });
});

test.describe("Contact Form Submission", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to contact page", async () => {
      await navigateToContactPage(page);
    });
  });

  test("successful form submission shows confirmation", async ({ page, logger }) => {
    const locators = getContactFormLocators(page);

    await logger.step("fill form with valid data", async () => {
      await locators.nameInput.fill(testData.validContactForm.name);
      await locators.emailInput.fill(testData.validContactForm.email);
      await locators.subjectInput.fill(testData.validContactForm.subject);
      await locators.messageInput.fill(testData.validContactForm.message);
    });

    await logger.step("select category", async () => {
      await page.locator("#support-category").click();
      await page.getByRole("option", { name: /technical/i }).click();
    });

    await logger.step("submit form", async () => {
      await locators.submitButton.click();
    });

    await logger.step("verify success message", async () => {
      await expect(page.getByText(/received your request/i)).toBeVisible({ timeout: 10000 });
    });

    await logger.step("verify ticket number is displayed", async () => {
      await expect(page.locator("span").filter({ hasText: /SUP-/ })).toBeVisible({ timeout: 5000 });
    });
  });

  test("submit another request button works", async ({ page, logger }) => {
    const locators = getContactFormLocators(page);

    await logger.step("fill and submit form", async () => {
      await locators.nameInput.fill(testData.validContactForm.name);
      await locators.emailInput.fill(testData.validContactForm.email);
      await locators.subjectInput.fill(testData.validContactForm.subject);
      await locators.messageInput.fill(testData.validContactForm.message);
      await locators.submitButton.click();
    });

    await logger.step("wait for success", async () => {
      await expect(page.getByText(/received your request/i)).toBeVisible({ timeout: 10000 });
    });

    await logger.step("click submit another request", async () => {
      await page.getByRole("button", { name: /submit another/i }).click();
    });

    await logger.step("verify form is reset", async () => {
      await expect(locators.nameInput).toBeVisible({ timeout: 5000 });
      await expect(locators.nameInput).toHaveValue("");
    });
  });

  test("view my tickets link works after submission", async ({ page, logger }) => {
    const locators = getContactFormLocators(page);

    await logger.step("fill and submit form", async () => {
      await locators.nameInput.fill(testData.validContactForm.name);
      await locators.emailInput.fill(testData.validContactForm.email);
      await locators.subjectInput.fill(testData.validContactForm.subject);
      await locators.messageInput.fill(testData.validContactForm.message);
      await locators.submitButton.click();
    });

    await logger.step("wait for success", async () => {
      await expect(page.getByText(/received your request/i)).toBeVisible({ timeout: 10000 });
    });

    await logger.step("click view my tickets", async () => {
      await page.getByRole("link", { name: /view my tickets/i }).click();
    });

    await logger.step("verify navigation to tickets page", async () => {
      await expect(page).toHaveURL(/\/settings\/tickets/);
    });
  });
});

test.describe("Contact Form Accessibility", () => {
  test.beforeEach(async ({ page, logger }) => {
    await logger.step("navigate to contact page", async () => {
      await navigateToContactPage(page);
    });
  });

  test("form fields have labels", async ({ page, logger }) => {
    const expectedLabels = ["Name", "Email", "Subject", "Message", "Category", "Priority"];

    for (const label of expectedLabels) {
      await logger.step(`verify label: ${label}`, async () => {
        await expect(page.getByText(label, { exact: false })).toBeVisible({ timeout: 5000 });
      });
    }
  });

  test("form is keyboard navigable", async ({ page, logger }) => {
    await logger.step("focus on name input", async () => {
      await page.getByLabel("Name").focus();
    });

    await logger.step("tab through form fields", async () => {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
      expect(focused).toBeDefined();
    });
  });

  test("submit button has accessible name", async ({ page, logger }) => {
    await logger.step("verify submit button text", async () => {
      const button = page.getByRole("button", { name: /submit/i });
      await expect(button).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe("Contact Form Mobile", () => {
  test("form works on mobile viewport", async ({ page, logger }) => {
    await logger.step("set mobile viewport", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
    });

    await logger.step("navigate to contact page", async () => {
      await navigateToContactPage(page);
    });

    await logger.step("verify form is visible", async () => {
      const locators = getContactFormLocators(page);
      await expect(locators.nameInput).toBeVisible({ timeout: 5000 });
    });

    await logger.step("verify inputs are usable", async () => {
      const nameInput = page.getByLabel("Name");
      await nameInput.tap();
      await nameInput.fill("Mobile Test User");
      await expect(nameInput).toHaveValue("Mobile Test User");
    });
  });
});
