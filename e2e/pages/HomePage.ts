/**
 * HomePage Page Object
 *
 * Encapsulates interactions with the JeffreysPrompts homepage:
 * - Hero section with search and category filter
 * - Prompt grid with cards
 * - Footer with social links
 *
 * Design notes:
 * - Uses `waitForLoadState("load")` instead of `networkidle` (HMR WebSocket keeps connections open)
 * - Includes streaming stall recovery (Turbopack SSR may fail to resolve streaming boundaries)
 * - Uses DOM presence checks for prompt cards (framer-motion GridTransition renders at opacity:0)
 */

import { type Page, type Locator, type TestInfo } from "@playwright/test";
import { BasePage } from "./BasePage";
import { type ConsoleMonitor } from "../utils/console-monitor";

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class HomePage extends BasePage {
  static readonly PATH = "/";

  // --- Hero Section Locators ---
  readonly heroSection: Locator;
  readonly headline: Locator;
  readonly tagline: Locator;
  readonly searchInput: Locator;

  // --- Category Filter Locators ---
  readonly categoryFilterGroup: Locator;
  readonly allCategoryButton: Locator;

  // --- Prompt Grid Locators ---
  readonly promptGrid: Locator;
  readonly promptCards: Locator;
  readonly browseSection: Locator;
  readonly allPromptsHeading: Locator;
  readonly promptCountText: Locator;

  // --- Footer Locators ---
  readonly footer: Locator;
  readonly footerSiteName: Locator;
  readonly githubLink: Locator;
  readonly twitterLink: Locator;
  readonly installCommand: Locator;

  constructor(page: Page, testInfo?: TestInfo, sharedConsoleMonitor?: ConsoleMonitor) {
    super(page, testInfo, sharedConsoleMonitor);

    // Hero section
    this.heroSection = page.locator("section").first();
    this.headline = page.getByRole("heading", { level: 1 });
    this.tagline = page.getByText(/Battle-tested patterns/i).first();
    this.searchInput = page.getByPlaceholder("Find your next favorite prompt...");

    // Category filter
    this.categoryFilterGroup = page.locator("[aria-label='Filter by category']").first();
    this.allCategoryButton = this.categoryFilterGroup.locator("button").first();

    // Prompt grid — use #prompts-section to avoid lg:hidden Featured section cards
    this.browseSection = page.locator("#prompts-section");
    this.promptGrid = page.locator(".grid.gap-6");
    this.promptCards = page.locator("[data-testid='prompt-card']");
    this.allPromptsHeading = page.getByRole("heading", { name: "Browse All Prompts" });
    this.promptCountText = page.getByText(/\d+ prompt/).first();

    // Footer (layout Footer uses "hidden md:block" — only visible on ≥768px)
    this.footer = page.locator("footer");
    this.footerSiteName = this.footer.getByText("JeffreysPrompts").first();
    this.githubLink = this.footer.getByRole("link", { name: /github/i }).first();
    this.twitterLink = this.footer.getByRole("link", { name: /twitter/i }).first();
    this.installCommand = this.footer.locator("code").first();
  }

  // --- Navigation ---

  /**
   * Navigate to the homepage with resilience against Turbopack streaming stalls.
   *
   * The Next.js Turbopack dev server uses React streaming SSR, which
   * intermittently fails to resolve streaming boundaries. When this happens,
   * the page renders blank. We detect this and reload once.
   */
  async goto() {
    await this.page.goto(HomePage.PATH, { waitUntil: "load", timeout: 30000 });

    // Give streaming a moment to resolve, then check for content
    try {
      await this.page.waitForFunction(
        () => {
          const main = document.getElementById("main-content");
          if (!main) return false;
          return main.querySelector("h1, section, [data-testid='prompt-card']") !== null;
        },
        { timeout: 10000 },
      );
    } catch {
      // Streaming stalled — reload once
      await this.page.reload();
      await this.page.waitForLoadState("load");
    }
  }

  async waitForPageLoad(timeout = 15000) {
    await this.assertVisible(this.headline, { timeout });
  }

  /**
   * Wait for prompt cards to be present in the DOM.
   * Uses DOM existence instead of Playwright visibility because framer-motion
   * GridTransition renders desktop cards at opacity:0 during animation.
   */
  async waitForPromptCards(minCount = 3, timeout = 15000) {
    await this.page.waitForFunction(
      (min) => document.querySelectorAll("[data-testid='prompt-card']").length >= min,
      minCount,
      { timeout },
    );
  }

  // --- Hero Section ---

  async getHeadlineText(): Promise<string> {
    return (await this.headline.textContent()) ?? "";
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounce
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  async getStatValue(statName: string): Promise<string | null> {
    const stat = this.page.getByText(statName).first();
    if (!(await stat.isVisible())) return null;

    // Find the numeric value near this stat
    const parent = stat.locator("xpath=..");
    const text = await parent.textContent();
    const match = text?.match(/(\d+)/);
    return match ? match[1] : null;
  }

  // --- Category Filter ---

  async getCategoryButtons(): Promise<string[]> {
    const buttons = await this.categoryFilterGroup.locator("button").all();
    const names: string[] = [];
    for (const button of buttons) {
      const text = await button.textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }

  async selectCategory(category: string) {
    const button = this.page.getByRole("button", { name: new RegExp(`^${escapeRegex(category)}$`, "i") });
    await button.click();
    await this.page.waitForTimeout(300); // Wait for filter animation
  }

  async selectAllCategories() {
    await this.allCategoryButton.click();
    await this.page.waitForTimeout(300);
  }

  // --- Prompt Grid ---

  /**
   * Get count of prompt cards in the DOM (not necessarily visible due to framer-motion).
   */
  async getPromptCardCount(): Promise<number> {
    return this.promptCards.count();
  }

  /**
   * Get prompt titles from the Browse All section (avoids lg:hidden Featured cards).
   */
  async getPromptTitles(): Promise<string[]> {
    const cards = await this.browseSection.locator("[data-testid='prompt-card']").all();
    const titles: string[] = [];

    for (const card of cards) {
      const title = card.locator("h3");
      const text = await title.textContent();
      if (text) titles.push(text.trim());
    }

    return titles;
  }

  async getDisplayedPromptCount(): Promise<number | null> {
    const countText = await this.promptCountText.textContent();
    const match = countText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  async clickPromptCard(title: string) {
    const card = this.page.locator("h3").filter({ hasText: title }).locator("../..");
    await card.click();
    await this.waitForNavigation();
  }

  async copyPrompt(title: string) {
    const card = this.page.locator("h3").filter({ hasText: title }).locator("../..");
    const copyButton = card.getByRole("button", { name: /copy/i });
    await copyButton.click();
  }

  // --- Tag Filters ---

  async getVisibleTags(): Promise<string[]> {
    const tagButtons = this.page.locator("button").filter({ hasText: /^[a-z-]+$/i });
    const tags: string[] = [];

    const buttons = await tagButtons.all();
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.length < 30) {
        tags.push(text.trim());
      }
    }

    return tags;
  }

  async selectTag(tag: string) {
    const button = this.page.getByRole("button", { name: new RegExp(`^${escapeRegex(tag)}$`, "i") });
    await button.click();
    await this.page.waitForTimeout(300);
  }

  async clearFilters() {
    const clearButton = this.page.getByText("Clear all filters");
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  // --- Footer ---

  async scrollToFooter() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(500);
  }

  async getFooterSiteName(): Promise<string | null> {
    await this.scrollToFooter();
    return this.footerSiteName.textContent();
  }

  async clickGitHubLink() {
    await this.scrollToFooter();
    await this.githubLink.click();
  }

  async getInstallCommand(): Promise<string | null> {
    await this.scrollToFooter();
    return this.installCommand.textContent();
  }

  // --- Responsive Checks ---

  async assertMobileLayout() {
    // On mobile, search should be visible and touch-friendly
    await this.assertVisible(this.searchInput);
    const searchHeight = await this.searchInput.evaluate((el) => el.offsetHeight);
    if (searchHeight < 44) {
      throw new Error(`Search input height (${searchHeight}px) is not touch-friendly (min 44px)`);
    }
  }

  async assertDesktopLayout() {
    // On desktop, verify grid container exists in DOM (framer-motion may keep cards at opacity:0)
    const gridCount = await this.promptGrid.count();
    if (gridCount === 0) {
      throw new Error("No grid container found on desktop layout");
    }
  }
}

export default HomePage;
