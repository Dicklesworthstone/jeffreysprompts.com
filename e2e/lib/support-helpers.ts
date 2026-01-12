/**
 * Support Helpers - E2E test utilities for help center and support functionality
 *
 * Provides utilities for:
 * - Interacting with help center pages
 * - Testing contact form functionality
 * - Managing support ticket state
 */

import type { Page, Locator } from "@playwright/test";

/** Storage key for support tickets (matches app) */
export const TICKETS_STORAGE_KEY = "jfpSupportTickets";

/** Help categories from the app */
export const HELP_CATEGORIES = [
  {
    slug: "getting-started",
    title: "Getting Started",
    articles: [
      { slug: "introduction", title: "Introduction to JeffreysPrompts" },
      { slug: "browsing-prompts", title: "Browsing and Finding Prompts" },
      { slug: "using-prompts", title: "Using Prompts with AI Models" },
    ],
  },
  {
    slug: "prompts",
    title: "Prompts & Collections",
    articles: [
      { slug: "copying-prompts", title: "Copying Prompts" },
      { slug: "saving-to-basket", title: "Saving to Your Basket" },
      { slug: "exporting", title: "Exporting as Markdown or Skills" },
    ],
  },
  {
    slug: "cli",
    title: "CLI Tool",
    articles: [
      { slug: "installation", title: "Installing the CLI" },
      { slug: "basic-usage", title: "Basic Usage" },
      { slug: "search-commands", title: "Search Commands" },
    ],
  },
] as const;

/** Support ticket categories */
export const SUPPORT_CATEGORIES = [
  "billing",
  "technical",
  "feedback",
  "feature",
  "bug",
  "account",
  "other",
] as const;

/** Support ticket priorities */
export const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

/** Stored ticket structure */
export interface StoredTicket {
  ticketNumber: string;
  name: string;
  email: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    author: "user" | "support";
    body: string;
    createdAt: string;
  }>;
}

/**
 * Help page locators
 */
export function getHelpPageLocators(page: Page) {
  return {
    header: page.locator("h1"),
    searchInput: page.getByPlaceholder("Search help..."),
    categoryLinks: page.locator("nav a[href^='/help/']"),
    articleCards: page.locator("a[href*='/help/']").filter({ has: page.locator("h3") }),
    breadcrumb: page.locator("nav").filter({ hasText: "Help Center" }).first(),
    contactSupportLink: page.getByRole("link", { name: "Contact support" }),
    githubIssueLink: page.getByRole("link", { name: "Open a GitHub issue" }),
    popularTopicsSection: page.getByRole("heading", { name: "Popular Topics" }),
  };
}

/**
 * Help article page locators
 */
export function getArticlePageLocators(page: Page) {
  return {
    title: page.locator("h1"),
    content: page.locator("article"),
    headings: page.locator("article h2, article h3"),
    links: page.locator("article a"),
    lists: page.locator("article ul, article ol"),
    codeBlocks: page.locator("article code"),
  };
}

/**
 * Contact form locators
 */
export function getContactFormLocators(page: Page) {
  return {
    form: page.locator("form"),
    nameInput: page.getByLabel("Name", { exact: false }),
    emailInput: page.getByLabel("Email", { exact: false }),
    subjectInput: page.getByLabel("Subject", { exact: false }),
    messageInput: page.getByLabel("Message", { exact: false }),
    categorySelect: page.getByLabel("Category", { exact: false }),
    prioritySelect: page.getByLabel("Priority", { exact: false }),
    submitButton: page.getByRole("button", { name: /submit|send/i }),
    successMessage: page.getByText(/received|submitted|thank you/i),
    errorMessage: page.locator("[role='alert'], .text-destructive, .text-red"),
  };
}

/**
 * Tickets page locators
 */
export function getTicketsPageLocators(page: Page) {
  return {
    header: page.getByRole("heading", { name: "My Tickets" }),
    ticketList: page.locator("[class*='ticket'], [data-testid='ticket-list']"),
    ticketCard: page.locator("[class*='rounded-xl border']").filter({ hasText: "SUP-" }),
    lookupEmailInput: page.getByLabel("Email", { exact: false }).first(),
    lookupTicketInput: page.getByLabel("Ticket number", { exact: false }),
    lookupButton: page.getByRole("button", { name: "Find ticket" }),
    emptyState: page.getByText(/no tickets|submit a request/i),
    replyButton: page.getByRole("button", { name: "Reply" }),
    replyInput: page.getByPlaceholder(/reply|updates|questions/i),
    sendReplyButton: page.getByRole("button", { name: /send reply/i }),
  };
}

/**
 * Navigate to help center
 */
export async function navigateToHelpCenter(page: Page): Promise<void> {
  await page.goto("/help");
  await page.waitForLoadState("networkidle");
}

/**
 * Navigate to a help category
 */
export async function navigateToHelpCategory(
  page: Page,
  category: string
): Promise<void> {
  await page.goto(`/help/${category}`);
  await page.waitForLoadState("networkidle");
}

/**
 * Navigate to a help article
 */
export async function navigateToHelpArticle(
  page: Page,
  category: string,
  article: string
): Promise<void> {
  await page.goto(`/help/${category}/${article}`);
  await page.waitForLoadState("networkidle");
}

/**
 * Navigate to contact page
 */
export async function navigateToContactPage(page: Page): Promise<void> {
  await page.goto("/contact");
  await page.waitForLoadState("networkidle");
}

/**
 * Navigate to tickets page
 */
export async function navigateToTicketsPage(page: Page): Promise<void> {
  await page.goto("/settings/tickets");
  await page.waitForLoadState("networkidle");
}

/**
 * Fill contact form with test data
 * Note: Category and priority use custom Select components (shadcn/ui),
 * not native HTML select elements, so we need click-based interaction.
 */
export async function fillContactForm(
  page: Page,
  data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    category?: SupportCategory;
    priority?: SupportPriority;
  }
): Promise<void> {
  const { nameInput, emailInput, subjectInput, messageInput } =
    getContactFormLocators(page);

  await nameInput.fill(data.name);
  await emailInput.fill(data.email);
  await subjectInput.fill(data.subject);
  await messageInput.fill(data.message);

  // Custom Select components require click-based interaction
  if (data.category) {
    await page.locator("#support-category").click();
    await page.getByRole("option", { name: new RegExp(data.category, "i") }).click();
  }

  if (data.priority) {
    await page.locator("#support-priority").click();
    await page.getByRole("option", { name: new RegExp(data.priority, "i") }).click();
  }
}

/**
 * Submit contact form
 */
export async function submitContactForm(page: Page): Promise<void> {
  const { submitButton } = getContactFormLocators(page);
  await submitButton.click();
}

/**
 * Clear stored tickets from localStorage
 */
export async function clearStoredTickets(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, TICKETS_STORAGE_KEY);
}

/**
 * Get stored tickets from localStorage
 */
export async function getStoredTickets(page: Page): Promise<StoredTicket[]> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as StoredTicket[];
    } catch {
      return [];
    }
  }, TICKETS_STORAGE_KEY);
}

/**
 * Add a mock ticket to localStorage
 */
export async function addMockTicket(
  page: Page,
  ticket: Partial<StoredTicket>
): Promise<StoredTicket> {
  const now = new Date().toISOString();
  const ticketNumber = `SUP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const fullTicket: StoredTicket = {
    ticketNumber: ticket.ticketNumber ?? ticketNumber,
    name: ticket.name ?? "Test User",
    email: ticket.email ?? "test@example.com",
    subject: ticket.subject ?? "Test Ticket",
    category: ticket.category ?? "technical",
    priority: ticket.priority ?? "normal",
    status: ticket.status ?? "open",
    createdAt: ticket.createdAt ?? now,
    updatedAt: ticket.updatedAt ?? now,
    messages: ticket.messages ?? [
      {
        id: crypto.randomUUID(),
        author: "user",
        body: "Initial test message",
        createdAt: now,
      },
    ],
  };

  await page.evaluate(
    ({ key, newTicket }) => {
      const raw = localStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];
      existing.unshift(newTicket);
      localStorage.setItem(key, JSON.stringify(existing));
    },
    { key: TICKETS_STORAGE_KEY, newTicket: fullTicket }
  );

  return fullTicket;
}

/**
 * Search help center
 */
export async function searchHelpCenter(page: Page, query: string): Promise<void> {
  const { searchInput } = getHelpPageLocators(page);
  await searchInput.fill(query);
  // Allow time for search to process
  await page.waitForTimeout(300);
}

/**
 * Count visible article cards
 */
export async function countVisibleArticles(page: Page): Promise<number> {
  const { articleCards } = getHelpPageLocators(page);
  return articleCards.count();
}

/**
 * Wait for contact form submission response
 */
export async function waitForFormResponse(
  page: Page,
  expectedStatus: "success" | "error"
): Promise<void> {
  const { successMessage, errorMessage } = getContactFormLocators(page);

  if (expectedStatus === "success") {
    await successMessage.waitFor({ state: "visible", timeout: 10000 });
  } else {
    await errorMessage.waitFor({ state: "visible", timeout: 10000 });
  }
}

/**
 * Test data generators
 */
export const testData = {
  validContactForm: {
    name: "Test User",
    email: "test@example.com",
    subject: "Test Support Request",
    message: "This is a test message for E2E testing purposes.",
    category: "technical" as SupportCategory,
    priority: "normal" as SupportPriority,
  },

  invalidEmail: {
    name: "Test User",
    email: "invalid-email",
    subject: "Test",
    message: "Test message",
  },

  emptyFields: {
    name: "",
    email: "",
    subject: "",
    message: "",
  },

  longMessage: {
    name: "Test User",
    email: "test@example.com",
    subject: "Long Message Test",
    message: "A".repeat(2001), // Exceeds 2000 char limit
  },
};
