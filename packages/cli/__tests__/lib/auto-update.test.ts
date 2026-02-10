/**
 * Unit tests for packages/cli/src/lib/auto-update.ts
 * Tests the shouldCheck logic indirectly via checkForUpdates.
 * Since auto-update depends on network (GitHub API) and config,
 * we test the exported interface behavior.
 * Uses real config with temp JFP_HOME - minimal mocking.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Store original env vars before importing the module
const originalJfpHome = process.env.JFP_HOME;
const originalArgv = [...process.argv];

let TEST_DIR: string;
let FAKE_HOME: string;

beforeEach(() => {
  TEST_DIR = join(
    tmpdir(),
    "jfp-autoupdate-test-" + Date.now() + "-" + Math.random().toString(36).slice(2)
  );
  FAKE_HOME = join(TEST_DIR, "home");
  mkdirSync(FAKE_HOME, { recursive: true });
  process.env.JFP_HOME = FAKE_HOME;
});

afterEach(() => {
  if (originalJfpHome) {
    process.env.JFP_HOME = originalJfpHome;
  } else {
    delete process.env.JFP_HOME;
  }
  process.argv = [...originalArgv];
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("checkForUpdates", () => {
  it("returns an object with currentVersion, latestVersion, and hasUpdate", async () => {
    // Disable auto-check by writing config that disables it, to avoid actual network call
    const configDir = join(FAKE_HOME, ".config", "jfp");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({ updates: { autoCheck: false } })
    );

    const { checkForUpdates } = await import("../../src/lib/auto-update");
    const result = await checkForUpdates();

    expect(result).toHaveProperty("currentVersion");
    expect(result).toHaveProperty("latestVersion");
    expect(result).toHaveProperty("hasUpdate");
    expect(typeof result.currentVersion).toBe("string");
    expect(typeof result.hasUpdate).toBe("boolean");
  });

  it("currentVersion is a valid semver string", async () => {
    const configDir = join(FAKE_HOME, ".config", "jfp");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({ updates: { autoCheck: false } })
    );

    const { checkForUpdates } = await import("../../src/lib/auto-update");
    const result = await checkForUpdates();

    expect(result.currentVersion).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("checkForUpdatesInBackground", () => {
  it("does not throw in non-TTY environment", async () => {
    // Add --json flag to prevent spawning background process
    process.argv = [...process.argv, "--json"];

    const { checkForUpdatesInBackground } = await import(
      "../../src/lib/auto-update"
    );

    // Should silently return without errors
    expect(() => checkForUpdatesInBackground()).not.toThrow();
  });
});
