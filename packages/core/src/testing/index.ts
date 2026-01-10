/**
 * Testing utilities for JeffreysPrompts E2E tests
 *
 * Provides shared infrastructure for CLI and Web E2E testing with
 * detailed structured logging for debugging.
 */

export { TestLogger, type LogLevel, type LogEntry, type TestLoggerOptions } from "./logger";
export { spawnCli, spawnJfp, type SpawnResult, type SpawnOptions } from "./spawn";
