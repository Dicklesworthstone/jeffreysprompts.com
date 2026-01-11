/**
 * E2E Test: Network Failure Handling
 *
 * Tests graceful degradation when network operations fail:
 * 1. Registry refresh with unreachable server
 * 2. List/search commands work with bundled prompts as fallback
 * 3. Timeout handling for slow connections
 *
 * Uses TestLogger for structured debugging output.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { TestLogger } from "@jeffreysprompts/core/testing";
import { spawnCli } from "@jeffreysprompts/core/testing";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";

const TEST_LOG_DIR = "/tmp/jfp-e2e-network-tests";
const PROJECT_ROOT = join(import.meta.dir, "../../../..");

describe("CLI Network Failure E2E", () => {
  let logger: TestLogger;
  let testDir: string;

  beforeAll(() => {
    mkdirSync(TEST_LOG_DIR, { recursive: true });
    testDir = mkdtempSync(join(tmpdir(), "jfp-network-test-"));
  });

  afterAll(() => {
    // Clean up temp directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    // Keep logs for CI artifact collection
  });

  describe("refresh command with network failures", () => {
    it("should fall back to bundled prompts when registry URL is unreachable", async () => {
      logger = new TestLogger({
        testName: "refresh-unreachable",
        outputFile: join(TEST_LOG_DIR, "refresh-unreachable.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp refresh with invalid registry URL");

      // Use an unreachable URL to simulate network failure
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "refresh", "--json"],
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          JFP_REGISTRY_URL: "http://localhost:59999/nonexistent",
          JFP_HOME: testDir,
        },
        logger,
        timeout: 15000, // Allow time for connection timeout
      });

      logger.step("Validating fallback response");

      // Should succeed with bundled prompts
      const output = JSON.parse(result.stdout);

      logger.info("Refresh result", {
        success: output.success,
        source: output.source,
        promptCount: output.promptCount,
      });

      expect(output.success).toBe(true);
      expect(output.source).toBe("bundled");
      expect(output.promptCount).toBeGreaterThan(0);

      logger.summary();
    });

    it("should handle DNS resolution failures gracefully", async () => {
      logger = new TestLogger({
        testName: "refresh-dns-failure",
        outputFile: join(TEST_LOG_DIR, "refresh-dns-failure.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp refresh with invalid hostname");

      // Use a definitely-invalid hostname
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "refresh", "--json"],
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          JFP_REGISTRY_URL: "http://this-domain-definitely-does-not-exist-xyz123.invalid/api/prompts",
          JFP_HOME: testDir,
        },
        logger,
        timeout: 15000,
      });

      logger.step("Validating fallback response");

      const output = JSON.parse(result.stdout);

      logger.info("Refresh result", {
        success: output.success,
        source: output.source,
      });

      // Should succeed with bundled prompts
      expect(output.success).toBe(true);
      expect(output.source).toBe("bundled");

      logger.summary();
    });
  });

  describe("list command with network failures", () => {
    it("should work without network using bundled prompts", async () => {
      logger = new TestLogger({
        testName: "list-no-network",
        outputFile: join(TEST_LOG_DIR, "list-no-network.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp list with unreachable registry");

      // Even with bad registry URL, list should work with bundled prompts
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "list", "--json"],
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          JFP_REGISTRY_URL: "http://localhost:59999/nonexistent",
          JFP_HOME: testDir,
        },
        logger,
      });

      logger.step("Validating list response");

      expect(result.success).toBe(true);

      const prompts = JSON.parse(result.stdout);
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThan(0);

      logger.info("List result", {
        promptCount: prompts.length,
        hasIdeaWizard: prompts.some((p: { id: string }) => p.id === "idea-wizard"),
      });

      // Should have bundled prompts available
      expect(prompts.some((p: { id: string }) => p.id === "idea-wizard")).toBe(true);

      logger.summary();
    });
  });

  describe("search command with network failures", () => {
    it("should work without network using bundled prompts", async () => {
      logger = new TestLogger({
        testName: "search-no-network",
        outputFile: join(TEST_LOG_DIR, "search-no-network.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp search with unreachable registry");

      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "search", "wizard", "--json"],
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          JFP_REGISTRY_URL: "http://localhost:59999/nonexistent",
          JFP_HOME: testDir,
        },
        logger,
      });

      logger.step("Validating search response");

      expect(result.success).toBe(true);

      const results = JSON.parse(result.stdout);
      expect(Array.isArray(results)).toBe(true);

      logger.info("Search result", {
        resultCount: results.length,
      });

      // Should find idea-wizard in bundled prompts
      const hasWizard = results.some(
        (r: { prompt: { id: string } }) => r.prompt.id === "idea-wizard"
      );
      expect(hasWizard).toBe(true);

      logger.summary();
    });
  });

  describe("show command with network failures", () => {
    it("should work without network for bundled prompts", async () => {
      logger = new TestLogger({
        testName: "show-no-network",
        outputFile: join(TEST_LOG_DIR, "show-no-network.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp show with unreachable registry");

      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "show", "idea-wizard", "--json"],
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          JFP_REGISTRY_URL: "http://localhost:59999/nonexistent",
          JFP_HOME: testDir,
        },
        logger,
      });

      logger.step("Validating show response");

      expect(result.success).toBe(true);

      const prompt = JSON.parse(result.stdout);

      logger.info("Show result", {
        id: prompt.id,
        title: prompt.title,
      });

      expect(prompt.id).toBe("idea-wizard");
      expect(prompt.title).toBe("The Idea Wizard");
      expect(prompt.content).toBeDefined();
      expect(prompt.content.length).toBeGreaterThan(100);

      logger.summary();
    });
  });

  describe("registry status with network failures", () => {
    it("should show status even without network", async () => {
      logger = new TestLogger({
        testName: "status-no-network",
        outputFile: join(TEST_LOG_DIR, "status-no-network.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp status");

      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "status", "--json"],
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          JFP_REGISTRY_URL: "http://localhost:59999/nonexistent",
          JFP_HOME: testDir,
        },
        logger,
      });

      logger.step("Validating status response");

      expect(result.success).toBe(true);

      const status = JSON.parse(result.stdout);

      logger.info("Status result", {
        cacheExists: status.cache?.exists,
        hasSettings: !!status.settings,
      });

      // Should show status with settings
      expect(status).toHaveProperty("cache");
      expect(status).toHaveProperty("settings");
      expect(status.settings).toHaveProperty("remoteUrl");

      logger.summary();
    });
  });

  describe("complete workflow with network failures", () => {
    it("should allow full list→search→show workflow without network", async () => {
      logger = new TestLogger({
        testName: "full-workflow-offline",
        outputFile: join(TEST_LOG_DIR, "full-workflow-offline.log"),
        minLevel: "debug",
      });

      const offlineEnv = {
        ...process.env,
        JFP_REGISTRY_URL: "http://localhost:59999/nonexistent",
        JFP_HOME: testDir,
      };

      // Step 1: List all prompts
      logger.step("List all prompts (offline mode)");
      const listResult = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "list", "--json"],
        cwd: PROJECT_ROOT,
        env: offlineEnv,
        logger,
      });
      expect(listResult.success).toBe(true);

      const allPrompts = JSON.parse(listResult.stdout);
      expect(allPrompts.length).toBeGreaterThan(0);
      logger.info("Found prompts", { count: allPrompts.length });

      // Step 2: Search for specific content
      logger.step("Search for improvement prompts (offline mode)");
      const searchResult = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "search", "improvement", "--json"],
        cwd: PROJECT_ROOT,
        env: offlineEnv,
        logger,
      });
      expect(searchResult.success).toBe(true);

      const searchResults = JSON.parse(searchResult.stdout);
      expect(searchResults.length).toBeGreaterThan(0);
      logger.info("Search results", { count: searchResults.length });

      // Step 3: Show the top result
      const topResultId = searchResults[0].prompt.id;
      logger.step(`Show details for ${topResultId} (offline mode)`);
      const showResult = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "show", topResultId, "--json"],
        cwd: PROJECT_ROOT,
        env: offlineEnv,
        logger,
      });
      expect(showResult.success).toBe(true);

      const promptDetails = JSON.parse(showResult.stdout);
      expect(promptDetails.id).toBe(topResultId);
      expect(promptDetails.content).toBeDefined();

      logger.info("Workflow completed successfully", {
        listCount: allPrompts.length,
        searchCount: searchResults.length,
        showedPrompt: topResultId,
      });

      logger.summary();
    });
  });
});
