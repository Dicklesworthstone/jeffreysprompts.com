/**
 * Console Error Monitor for Playwright E2E Tests
 *
 * Captures and categorizes browser console messages to catch
 * invisible bugs that don't cause test failures:
 * - Hydration mismatches (SSR/client differences)
 * - Network failures (API errors, CORS)
 * - React warnings (hooks, state updates)
 * - Security violations (CSP)
 * - Runtime JavaScript errors
 */

import { type Page, type ConsoleMessage as PWConsoleMessage } from "@playwright/test";

export type ConsoleLevel = "error" | "warning" | "info" | "log" | "debug" | "trace";

export type ConsoleCategory =
  | "runtime" // TypeError, ReferenceError, etc.
  | "network" // Failed fetch, CORS errors
  | "react" // React warnings
  | "security" // CSP violations
  | "hydration" // SSR/client mismatch
  | "deprecation" // Deprecated API warnings
  | "other";

export interface ConsoleMessage {
  level: ConsoleLevel;
  text: string;
  category: ConsoleCategory;
  url?: string;
  lineNumber?: number;
  timestamp: number;
}

/**
 * Global patterns to ignore (analytics, extensions, dev tools)
 */
const GLOBAL_IGNORE_PATTERNS = [
  // Browser extensions
  /chrome-extension/i,
  /moz-extension/i,

  // Analytics (expected noise)
  /gtag|google.*analytics|ga\(/i,
  /facebook.*pixel/i,
  /hotjar/i,
  /plausible/i,

  // Development tools
  /download the react devtools/i,
  /fast refresh/i,

  // Third-party services
  /intercom/i,
  /sentry/i,
  /posthog/i,

  // Known non-issues
  /ResizeObserver loop/i, // Browser quirk, not a bug
  /Non-Error promise rejection/i, // Often third-party

  // Service Worker registration errors when serviceWorkers: "block" is set
  /Service Worker registration failed/i,
  /\[SW\].*registration/i,
];

export class ConsoleMonitor {
  private page: Page;
  private messages: ConsoleMessage[] = [];
  private additionalIgnorePatterns: RegExp[] = [];

  constructor(page: Page, options?: { ignorePatterns?: RegExp[] }) {
    this.page = page;
    this.additionalIgnorePatterns = options?.ignorePatterns ?? [];
    this.attach();
  }

  /**
   * Attach listener to page console events.
   */
  attach(): void {
    this.page.on("console", (msg) => this.handleConsoleMessage(msg));
  }

  private handleConsoleMessage(msg: PWConsoleMessage): void {
    const level = msg.type() as ConsoleLevel;
    const text = msg.text();
    const location = msg.location();

    this.messages.push({
      level,
      text,
      category: this.categorize(text),
      url: location.url,
      lineNumber: location.lineNumber,
      timestamp: Date.now(),
    });
  }

  /**
   * Categorize message based on content patterns.
   */
  private categorize(text: string): ConsoleCategory {
    // Hydration errors (highest priority - serious issue)
    if (/hydrat|server.*different.*client|content.*mismatch|text content does not match/i.test(text)) {
      return "hydration";
    }

    // React-specific warnings
    if (/^warning:\s|react|hook|useeffect|usestate|setstate.*unmounted/i.test(text)) {
      return "react";
    }

    // Network errors
    if (/net::err|failed to (load|fetch)|cors|fetch.*failed|timeout|aborted/i.test(text)) {
      return "network";
    }

    // Security errors
    if (/csp|content security policy|refused to|blocked by cors|unsafe-eval/i.test(text)) {
      return "security";
    }

    // Runtime JavaScript errors
    if (/typeerror|referenceerror|syntaxerror|rangeerror|uncaught|error:/i.test(text)) {
      return "runtime";
    }

    // Deprecation warnings
    if (/deprecat|will be removed|no longer supported/i.test(text)) {
      return "deprecation";
    }

    return "other";
  }

  /**
   * Get all captured messages.
   */
  getAll(): ConsoleMessage[] {
    return [...this.messages];
  }

  /**
   * Get errors only (level === 'error').
   */
  getErrors(category?: ConsoleCategory): ConsoleMessage[] {
    return this.messages.filter((msg) => {
      if (msg.level !== "error") return false;
      if (category && msg.category !== category) return false;
      return true;
    });
  }

  /**
   * Get warnings only (level === 'warning').
   */
  getWarnings(category?: ConsoleCategory): ConsoleMessage[] {
    return this.messages.filter((msg) => {
      if (msg.level !== "warning") return false;
      if (category && msg.category !== category) return false;
      return true;
    });
  }

  /**
   * Get errors excluding known safe patterns.
   */
  getUnexpectedErrors(): ConsoleMessage[] {
    const allIgnorePatterns = [...GLOBAL_IGNORE_PATTERNS, ...this.additionalIgnorePatterns];

    return this.getErrors().filter((msg) => !allIgnorePatterns.some((pattern) => pattern.test(msg.text)));
  }

  /**
   * Check if there are any hydration errors (most serious issue).
   */
  hasHydrationErrors(): boolean {
    return this.getErrors("hydration").length > 0;
  }

  /**
   * Check if there are any network errors.
   */
  hasNetworkErrors(): boolean {
    return this.getErrors("network").length > 0;
  }

  /**
   * Get summary by category.
   */
  getSummary(): Record<ConsoleCategory, { errors: number; warnings: number }> {
    const summary: Record<ConsoleCategory, { errors: number; warnings: number }> = {
      runtime: { errors: 0, warnings: 0 },
      network: { errors: 0, warnings: 0 },
      react: { errors: 0, warnings: 0 },
      security: { errors: 0, warnings: 0 },
      hydration: { errors: 0, warnings: 0 },
      deprecation: { errors: 0, warnings: 0 },
      other: { errors: 0, warnings: 0 },
    };

    for (const msg of this.messages) {
      if (msg.level === "error") {
        summary[msg.category].errors++;
      } else if (msg.level === "warning") {
        summary[msg.category].warnings++;
      }
    }

    return summary;
  }

  /**
   * Format messages for debugging output.
   */
  formatMessages(filter?: { level?: ConsoleLevel; category?: ConsoleCategory }): string {
    const filtered = this.messages.filter((msg) => {
      if (filter?.level && msg.level !== filter.level) return false;
      if (filter?.category && msg.category !== filter.category) return false;
      return true;
    });

    if (filtered.length === 0) {
      return "No messages";
    }

    return filtered
      .map((msg) => {
        const icon = msg.level === "error" ? "❌" : msg.level === "warning" ? "⚠️" : "ℹ️";
        const truncated = msg.text.length > 150 ? msg.text.slice(0, 150) + "..." : msg.text;
        return `${icon} [${msg.category}] ${truncated}`;
      })
      .join("\n");
  }

  /**
   * Print all messages for debugging.
   */
  printAll(): void {
    console.log("\n=== Console Messages ===");
    console.log(this.formatMessages());
    console.log("========================\n");
  }

  /**
   * Print errors only.
   */
  printErrors(): void {
    console.log("\n=== Console Errors ===");
    console.log(this.formatMessages({ level: "error" }));
    console.log("======================\n");
  }

  /**
   * Clear captured messages.
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Get messages as JSON for attaching to test reports.
   */
  toJSON(): string {
    return JSON.stringify(this.messages, null, 2);
  }
}

export default ConsoleMonitor;
