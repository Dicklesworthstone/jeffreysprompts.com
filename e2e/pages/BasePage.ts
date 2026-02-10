/**
 * BasePage - Foundation class for Page Object Model
 *
 * Provides common utilities for all page objects:
 * - Navigation with configurable wait states
 * - Console error monitoring
 * - Screenshot capture
 * - Locator helpers (role, label, testId)
 * - Mobile detection
 * - Spinner/loading wait utilities
 */

import { type Page, type Locator, expect, type TestInfo } from "@playwright/test";
import { ConsoleMonitor, type ConsoleMessage, type ConsoleCategory } from "../utils/console-monitor";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface NavigationOptions {
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
  timeout?: number;
  screenshot?: boolean;
}

export class BasePage {
  readonly page: Page;
  readonly testInfo?: TestInfo;
  protected consoleMonitor: ConsoleMonitor;
  private screenshotDir: string;

  /**
   * @param page - Playwright page instance
   * @param testInfo - Optional test info for attaching artifacts
   * @param sharedConsoleMonitor - Optional shared ConsoleMonitor instance.
   *   If not provided, a new one is created. When using fixtures, pass the
   *   shared monitor to ensure all Page Objects see the same console messages.
   */
  constructor(page: Page, testInfo?: TestInfo, sharedConsoleMonitor?: ConsoleMonitor) {
    this.page = page;
    this.testInfo = testInfo;
    // Use shared monitor if provided, otherwise create a new one
    this.consoleMonitor = sharedConsoleMonitor ?? new ConsoleMonitor(page);
    this.screenshotDir = testInfo ? join(testInfo.outputDir, "screenshots") : "/tmp/e2e-screenshots";
  }

  // --- Navigation ---

  async goto(path: string, options: NavigationOptions = {}): Promise<void> {
    const { waitUntil = "load", timeout = 30000, screenshot = false } = options;

    await this.page.goto(path, { waitUntil, timeout });

    if (screenshot) {
      await this.screenshot("after-navigation");
    }
  }

  async waitForNavigation(options: { waitUntil?: "load" | "networkidle" } = {}) {
    await this.page.waitForLoadState(options.waitUntil ?? "load");
  }

  async waitForNetworkIdle(timeout = 30000) {
    await this.page.waitForLoadState("networkidle", { timeout });
  }

  // --- Locators ---

  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  getByRole(role: Parameters<Page["getByRole"]>[0], options?: Parameters<Page["getByRole"]>[1]): Locator {
    return this.page.getByRole(role, options);
  }

  getByLabel(text: string | RegExp): Locator {
    return this.page.getByLabel(text);
  }

  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  getByPlaceholder(text: string | RegExp): Locator {
    return this.page.getByPlaceholder(text);
  }

  locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  // --- Assertions ---

  async assertVisible(locator: Locator, options?: { timeout?: number }) {
    await expect(locator).toBeVisible({ timeout: options?.timeout });
  }

  async assertHidden(locator: Locator, options?: { timeout?: number }) {
    await expect(locator).toBeHidden({ timeout: options?.timeout });
  }

  async assertText(locator: Locator, text: string | RegExp) {
    await expect(locator).toContainText(text);
  }

  async assertURL(pattern: string | RegExp) {
    await expect(this.page).toHaveURL(pattern);
  }

  async assertTitle(pattern: string | RegExp) {
    await expect(this.page).toHaveTitle(pattern);
  }

  // --- Screenshots ---

  async screenshot(stepName: string, options?: { fullPage?: boolean }): Promise<string | null> {
    try {
      if (!existsSync(this.screenshotDir)) {
        mkdirSync(this.screenshotDir, { recursive: true });
      }

      const timestamp = Date.now();
      const device = this.isMobile() ? "mobile" : "desktop";
      const sanitizedName = stepName.replace(/[^a-zA-Z0-9-_]/g, "-");
      const filename = `${sanitizedName}_${device}_${timestamp}.png`;
      const filepath = join(this.screenshotDir, filename);

      await this.page.screenshot({
        path: filepath,
        fullPage: options?.fullPage ?? false,
      });

      // Attach to Playwright report if testInfo available
      if (this.testInfo) {
        await this.testInfo.attach(stepName, {
          path: filepath,
          contentType: "image/png",
        });
      }

      return filepath;
    } catch (error) {
      console.error("Screenshot failed:", error);
      return null;
    }
  }

  // --- Console Monitoring ---

  getConsoleErrors(category?: ConsoleCategory): ConsoleMessage[] {
    return this.consoleMonitor.getErrors(category);
  }

  getConsoleWarnings(category?: ConsoleCategory): ConsoleMessage[] {
    return this.consoleMonitor.getWarnings(category);
  }

  getUnexpectedErrors(): ConsoleMessage[] {
    return this.consoleMonitor.getUnexpectedErrors();
  }

  hasHydrationErrors(): boolean {
    return this.consoleMonitor.hasHydrationErrors();
  }

  hasNetworkErrors(): boolean {
    return this.consoleMonitor.hasNetworkErrors();
  }

  getConsoleSummary() {
    return this.consoleMonitor.getSummary();
  }

  printConsoleErrors(): void {
    this.consoleMonitor.printErrors();
  }

  clearConsoleMessages(): void {
    this.consoleMonitor.clear();
  }

  /**
   * Assert no unexpected console errors occurred.
   * Useful as afterEach check or explicit assertion.
   */
  async assertNoConsoleErrors(options?: { ignoreCategories?: ConsoleCategory[] }) {
    const errors = this.getUnexpectedErrors().filter((error) => {
      if (options?.ignoreCategories?.includes(error.category)) {
        return false;
      }
      return true;
    });

    if (errors.length > 0) {
      console.error("Unexpected console errors found:");
      this.consoleMonitor.printErrors();

      // Take screenshot for debugging
      await this.screenshot("console-errors");
    }

    expect(errors, `Expected no console errors, found ${errors.length}`).toHaveLength(0);
  }

  // --- Utilities ---

  isMobile(): boolean {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width < 768 : false;
  }

  isTablet(): boolean {
    const viewport = this.page.viewportSize();
    if (!viewport) return false;
    return viewport.width >= 768 && viewport.width < 1024;
  }

  isDesktop(): boolean {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width >= 1024 : true;
  }

  async waitForSpinnersToDisappear(timeout = 15000) {
    await this.page.waitForFunction(
      () => {
        const spinners = document.querySelectorAll(
          '[class*="spinner"], [class*="loading"], [class*="skeleton"], [data-loading="true"]'
        );
        return spinners.length === 0;
      },
      { timeout }
    );
  }

  async waitForHydration(timeout = 10000) {
    // Wait for Next.js hydration to complete
    await this.page.waitForFunction(
      () => {
        return document.readyState === "complete" && !document.querySelector('[data-hydrating="true"]');
      },
      { timeout }
    );
  }

  /**
   * Wait for a specific element to stabilize (no position changes).
   * Useful for detecting layout shift.
   */
  async waitForStablePosition(locator: Locator, options?: { timeout?: number; stabilityMs?: number }) {
    const timeout = options?.timeout ?? 5000;
    const stabilityMs = options?.stabilityMs ?? 300;

    const startTime = Date.now();
    let lastBox = await locator.boundingBox();

    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(100);
      const currentBox = await locator.boundingBox();

      if (lastBox && currentBox) {
        const xDiff = Math.abs(currentBox.x - lastBox.x);
        const yDiff = Math.abs(currentBox.y - lastBox.y);

        if (xDiff < 1 && yDiff < 1) {
          // Position stable, wait for stability period
          await this.page.waitForTimeout(stabilityMs);
          const finalBox = await locator.boundingBox();

          if (finalBox) {
            const finalXDiff = Math.abs(finalBox.x - currentBox.x);
            const finalYDiff = Math.abs(finalBox.y - currentBox.y);

            if (finalXDiff < 1 && finalYDiff < 1) {
              return; // Stable!
            }
          }
        }
      }

      lastBox = currentBox;
    }

    throw new Error(`Element position did not stabilize within ${timeout}ms`);
  }

  /**
   * Get current page URL.
   */
  getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Get current page title.
   */
  async getTitle(): Promise<string> {
    return this.page.title();
  }
}

export default BasePage;
