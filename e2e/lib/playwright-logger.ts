/**
 * Playwright Step Logger - Detailed logging for web E2E tests
 *
 * Provides:
 * - Step-by-step logging with timing
 * - Screenshot capture on each step (optional)
 * - Integration with TestLogger for consistent output
 * - Test fixture for easy integration
 *
 * Usage in tests:
 *   import { test } from "../lib/playwright-logger";
 *
 *   test("my test", async ({ page, logger }) => {
 *     await logger.step("navigate to homepage", async () => {
 *       await page.goto("/");
 *     });
 *   });
 */

import { test as base, Page, TestInfo } from "@playwright/test";
import { TestLogger, type LogEntry } from "./test-logger";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface StepOptions {
  /** Take a screenshot after this step */
  screenshot?: boolean;
  /** Additional data to log with this step */
  data?: Record<string, unknown>;
}

export class PlaywrightLogger {
  private logger: TestLogger;
  private page: Page;
  private testInfo: TestInfo;
  private screenshotDir: string;
  private screenshotOnStep: boolean;
  private stepCount = 0;

  constructor(page: Page, testInfo: TestInfo, options?: { screenshotOnStep?: boolean }) {
    const testName = testInfo.title.replace(/\s+/g, "-").toLowerCase();
    this.logger = new TestLogger(`web:${testName}`, {
      logFile: process.env.E2E_LOG_FILE ?? `/tmp/e2e-logs/web-${testName}.jsonl`,
    });
    this.page = page;
    this.testInfo = testInfo;
    this.screenshotDir = join(testInfo.outputDir, "screenshots");
    this.screenshotOnStep = options?.screenshotOnStep ?? process.env.E2E_SCREENSHOT_STEPS === "1";
  }

  /**
   * Execute a test step with logging and optional screenshot
   */
  async step<T>(name: string, fn: () => Promise<T>, options?: StepOptions): Promise<T> {
    this.stepCount++;
    const stepNum = String(this.stepCount).padStart(2, "0");
    const stepName = `[${stepNum}] ${name}`;

    this.logger.stepStart(stepName);

    try {
      const result = await fn();

      // Take screenshot if requested
      if (options?.screenshot || this.screenshotOnStep) {
        await this.takeScreenshot(`step-${stepNum}-${name.replace(/\s+/g, "-")}`);
      }

      this.logger.stepEnd(stepName, true, options?.data);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Step failed: ${errorMessage}`, { step: stepName });

      // Always screenshot on failure
      await this.takeScreenshot(`fail-${stepNum}-${name.replace(/\s+/g, "-")}`);

      this.logger.stepEnd(stepName, false, { error: errorMessage, ...options?.data });
      throw error;
    }
  }

  /**
   * Log debug information
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(message, data);
  }

  /**
   * Log general information
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(message, data);
  }

  /**
   * Log an error
   */
  error(message: string, data?: Record<string, unknown>): void {
    this.logger.error(message, data);
  }

  /**
   * Take a screenshot and save to test artifacts
   */
  async takeScreenshot(name: string): Promise<string | null> {
    try {
      if (!existsSync(this.screenshotDir)) {
        mkdirSync(this.screenshotDir, { recursive: true });
      }

      const filename = `${name}.png`;
      const filepath = join(this.screenshotDir, filename);

      await this.page.screenshot({ path: filepath, fullPage: true });
      this.logger.debug(`Screenshot saved: ${filename}`);

      // Attach to Playwright report
      await this.testInfo.attach(name, { path: filepath, contentType: "image/png" });

      return filepath;
    } catch (error) {
      this.logger.error("Screenshot failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Log current page state (URL, title)
   */
  async logPageState(): Promise<void> {
    const url = this.page.url();
    const title = await this.page.title();
    this.logger.info("Page state", { url, title });
  }

  /**
   * Assert an element is visible
   */
  async assertVisible(selector: string, description?: string): Promise<void> {
    const passed = await this.page.locator(selector).isVisible();
    this.logger.assertion(description ?? `Element visible: ${selector}`, passed, { selector });

    if (!passed) {
      await this.takeScreenshot(`assert-fail-visible-${Date.now()}`);
      throw new Error(`Expected element to be visible: ${selector}`);
    }
  }

  /**
   * Assert an element contains text
   */
  async assertText(selector: string, expectedText: string, description?: string): Promise<void> {
    const actualText = await this.page.locator(selector).textContent();
    const passed = actualText?.includes(expectedText) ?? false;
    this.logger.assertion(description ?? `Element contains text: ${expectedText}`, passed, {
      selector,
      expectedText,
      actualText: actualText?.slice(0, 100),
    });

    if (!passed) {
      await this.takeScreenshot(`assert-fail-text-${Date.now()}`);
      throw new Error(`Expected element ${selector} to contain "${expectedText}", got "${actualText}"`);
    }
  }

  /**
   * Assert element count
   */
  async assertCount(selector: string, expectedCount: number, description?: string): Promise<void> {
    const actualCount = await this.page.locator(selector).count();
    const passed = actualCount === expectedCount;
    this.logger.assertion(description ?? `Element count: ${expectedCount}`, passed, {
      selector,
      expectedCount,
      actualCount,
    });

    if (!passed) {
      await this.takeScreenshot(`assert-fail-count-${Date.now()}`);
      throw new Error(`Expected ${expectedCount} elements for ${selector}, got ${actualCount}`);
    }
  }

  /**
   * Get all log entries
   */
  getEntries(): LogEntry[] {
    return this.logger.getEntries();
  }

  /**
   * Write logs to file
   */
  writeToFile(filepath: string): void {
    this.logger.writeToFile(filepath);
  }
}

/**
 * Extended test fixture with logger
 */
export const test = base.extend<{ logger: PlaywrightLogger }>({
  logger: async ({ page }, use, testInfo) => {
    const logger = new PlaywrightLogger(page, testInfo);

    // Log test start
    logger.info("Test started", {
      title: testInfo.title,
      file: testInfo.file,
      project: testInfo.project.name,
    });

    await use(logger);

    // Log test end
    const status = testInfo.status ?? "unknown";
    if (status === "passed") {
      logger.info("Test passed", { duration: testInfo.duration });
    } else {
      logger.error("Test failed", {
        status,
        duration: testInfo.duration,
        error: testInfo.error?.message,
      });
    }

    // Save logs as test artifact (JSONL = newline-delimited JSON)
    const logPath = join(testInfo.outputDir, "test-log.jsonl");
    logger.writeToFile(logPath);
    await testInfo.attach("test-log", { path: logPath, contentType: "application/x-ndjson" });
  },
});

export { expect } from "@playwright/test";

export default PlaywrightLogger;
