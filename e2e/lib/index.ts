/**
 * E2E Test Library - Shared utilities for CLI and Web E2E tests
 *
 * This module provides:
 * - TestLogger: Structured logging with levels, timestamps, and file output
 * - CliRunner: Process spawning with logging and assertions
 * - PlaywrightLogger: Step logging and screenshot helpers for Playwright
 */

export { TestLogger, createCliLogger, createWebLogger, type LogLevel } from "./test-logger";
export { CliRunner, createCliRunner, type CommandResult, type CliRunnerOptions } from "./cli-runner";
export { PlaywrightLogger, test, expect, type StepOptions } from "./playwright-logger";
export * from "./theme-helpers";
