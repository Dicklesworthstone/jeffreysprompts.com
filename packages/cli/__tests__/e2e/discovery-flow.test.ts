/**
 * E2E Test: CLI Discovery Flow
 *
 * Tests the complete user journey for discovering prompts:
 * 1. list - Browse all available prompts
 * 2. search - Find specific prompts by keyword
 * 3. show - View detailed prompt information
 * 4. copy - Copy prompt content for use
 *
 * Uses TestLogger for structured debugging output.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { TestLogger } from "@jeffreysprompts/core/testing";
import { spawnCli } from "@jeffreysprompts/core/testing";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";

const TEST_LOG_DIR = "/tmp/jfp-e2e-tests";
const PROJECT_ROOT = join(import.meta.dir, "../../../..");

describe("CLI Discovery Flow E2E", () => {
  let logger: TestLogger;

  beforeAll(() => {
    mkdirSync(TEST_LOG_DIR, { recursive: true });
  });

  afterAll(() => {
    // Keep logs for CI artifact collection
    // rmSync(TEST_LOG_DIR, { recursive: true, force: true });
  });

  describe("list command", () => {
    it("should list all prompts in JSON format", async () => {
      logger = new TestLogger({
        testName: "list-json",
        outputFile: join(TEST_LOG_DIR, "list-json.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp list --json");
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "list", "--json"],
        cwd: PROJECT_ROOT,
        logger,
      });

      logger.step("Validating output");
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);

      const prompts = JSON.parse(result.stdout);
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThan(0);

      logger.info("Prompt count", { count: prompts.length });

      // Verify expected prompts exist
      const ids = prompts.map((p: { id: string }) => p.id);
      expect(ids).toContain("idea-wizard");
      expect(ids).toContain("readme-reviser");
      expect(ids).toContain("robot-mode-maker");

      logger.step("Validating schema");
      for (const prompt of prompts) {
        expect(prompt).toHaveProperty("id");
        expect(prompt).toHaveProperty("title");
        expect(prompt).toHaveProperty("description");
        expect(prompt).toHaveProperty("category");
        expect(prompt).toHaveProperty("tags");
        expect(Array.isArray(prompt.tags)).toBe(true);
      }

      logger.summary();
    });

    it("should filter by category", async () => {
      logger = new TestLogger({
        testName: "list-category",
        outputFile: join(TEST_LOG_DIR, "list-category.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp list --category ideation --json");
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "list", "--category", "ideation", "--json"],
        cwd: PROJECT_ROOT,
        logger,
      });

      expect(result.success).toBe(true);

      const prompts = JSON.parse(result.stdout);
      expect(prompts.length).toBeGreaterThan(0);

      logger.step("Verifying all results are in ideation category");
      for (const prompt of prompts) {
        expect(prompt.category).toBe("ideation");
      }

      logger.summary();
    });

    it("should filter by tag", async () => {
      logger = new TestLogger({
        testName: "list-tag",
        outputFile: join(TEST_LOG_DIR, "list-tag.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp list --tag ultrathink --json");
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "list", "--tag", "ultrathink", "--json"],
        cwd: PROJECT_ROOT,
        logger,
      });

      expect(result.success).toBe(true);

      const prompts = JSON.parse(result.stdout);
      expect(prompts.length).toBeGreaterThan(0);

      logger.step("Verifying all results have ultrathink tag");
      for (const prompt of prompts) {
        expect(prompt.tags).toContain("ultrathink");
      }

      logger.summary();
    });
  });

  describe("search command", () => {
    it("should find prompts by keyword", async () => {
      logger = new TestLogger({
        testName: "search-keyword",
        outputFile: join(TEST_LOG_DIR, "search-keyword.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp search wizard --json");
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "search", "wizard", "--json"],
        cwd: PROJECT_ROOT,
        logger,
      });

      expect(result.success).toBe(true);

      const results = JSON.parse(result.stdout);
      expect(results.length).toBeGreaterThan(0);

      logger.step("Validating search results");
      // idea-wizard should be in results
      const hasWizard = results.some(
        (r: { prompt: { id: string } }) => r.prompt.id === "idea-wizard"
      );
      expect(hasWizard).toBe(true);

      // Check search result schema
      const firstResult = results[0];
      expect(firstResult).toHaveProperty("prompt");
      expect(firstResult).toHaveProperty("score");
      expect(firstResult).toHaveProperty("matchedFields");
      expect(typeof firstResult.score).toBe("number");

      logger.info("Top result", {
        id: firstResult.prompt.id,
        score: firstResult.score,
        matchedFields: firstResult.matchedFields,
      });

      logger.summary();
    });

    it("should return empty array for no matches", async () => {
      logger = new TestLogger({
        testName: "search-no-match",
        outputFile: join(TEST_LOG_DIR, "search-no-match.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp search xyznonexistent123 --json");
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "search", "xyznonexistent123", "--json"],
        cwd: PROJECT_ROOT,
        logger,
      });

      expect(result.success).toBe(true);

      const results = JSON.parse(result.stdout);
      expect(results).toEqual([]);

      logger.summary();
    });
  });

  describe("show command", () => {
    it("should display prompt details in JSON format", async () => {
      logger = new TestLogger({
        testName: "show-json",
        outputFile: join(TEST_LOG_DIR, "show-json.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp show idea-wizard --json");
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "show", "idea-wizard", "--json"],
        cwd: PROJECT_ROOT,
        logger,
      });

      expect(result.success).toBe(true);

      const prompt = JSON.parse(result.stdout);

      logger.step("Validating prompt details");
      expect(prompt.id).toBe("idea-wizard");
      expect(prompt.title).toBe("The Idea Wizard");
      expect(prompt.category).toBe("ideation");
      expect(prompt.tags).toContain("brainstorming");
      expect(prompt.content).toContain("improvement");

      logger.info("Prompt retrieved", {
        id: prompt.id,
        title: prompt.title,
        contentLength: prompt.content.length,
      });

      logger.summary();
    });

    it("should handle non-existent prompt gracefully", async () => {
      logger = new TestLogger({
        testName: "show-not-found",
        outputFile: join(TEST_LOG_DIR, "show-not-found.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp show nonexistent-prompt --json");
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "show", "nonexistent-prompt", "--json"],
        cwd: PROJECT_ROOT,
        logger,
      });

      // Should fail with non-zero exit code
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);

      logger.info("Error handled correctly", {
        exitCode: result.exitCode,
        stderr: result.stderr.slice(0, 200),
      });

      logger.summary();
    });
  });

  describe("copy command", () => {
    it("should output prompt content for copying", async () => {
      logger = new TestLogger({
        testName: "copy-output",
        outputFile: join(TEST_LOG_DIR, "copy-output.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp copy idea-wizard");
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "copy", "idea-wizard"],
        cwd: PROJECT_ROOT,
        logger,
      });

      // In headless environments, clipboard fails but content is in fallback
      // Either success with raw content, or JSON with fallback field
      logger.step("Verifying content includes prompt text");

      if (result.success) {
        // Clipboard worked - raw content output
        expect(result.stdout).toContain("improvement");
        expect(result.stdout).toContain("ultrathink");
      } else {
        // Headless environment - JSON with fallback
        try {
          const output = JSON.parse(result.stdout);
          expect(output.fallback).toContain("improvement");
          expect(output.fallback).toContain("ultrathink");
          logger.info("Running in headless mode - using fallback content");
        } catch {
          // If not JSON, check raw stdout for expected content
          expect(result.stdout).toContain("improvement");
          expect(result.stdout).toContain("ultrathink");
        }
      }

      logger.info("Content available", { length: result.stdout.length });

      logger.summary();
    });

    it("should handle non-existent prompt", async () => {
      logger = new TestLogger({
        testName: "copy-not-found",
        outputFile: join(TEST_LOG_DIR, "copy-not-found.log"),
        minLevel: "debug",
      });

      logger.step("Running jfp copy nonexistent-prompt");
      const result = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "copy", "nonexistent-prompt"],
        cwd: PROJECT_ROOT,
        logger,
      });

      expect(result.success).toBe(false);
      // Should fail with "not found" error, not clipboard error
      expect(result.stdout).toContain("not_found");

      logger.summary();
    });
  });

  describe("complete discovery flow", () => {
    it("should allow full list→search→show→copy workflow", async () => {
      logger = new TestLogger({
        testName: "full-discovery-flow",
        outputFile: join(TEST_LOG_DIR, "full-discovery-flow.log"),
        minLevel: "debug",
      });

      // Step 1: List all prompts
      logger.step("List all prompts");
      const listResult = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "list", "--json"],
        cwd: PROJECT_ROOT,
        logger,
      });
      expect(listResult.success).toBe(true);

      const allPrompts = JSON.parse(listResult.stdout);
      logger.info("Found prompts", { count: allPrompts.length });

      // Step 2: Search for specific content
      logger.step("Search for documentation prompts");
      const searchResult = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "search", "documentation", "--json"],
        cwd: PROJECT_ROOT,
        logger,
      });
      expect(searchResult.success).toBe(true);

      const searchResults = JSON.parse(searchResult.stdout);
      expect(searchResults.length).toBeGreaterThan(0);
      logger.info("Search results", { count: searchResults.length });

      // Step 3: Show the top result
      const topResultId = searchResults[0].prompt.id;
      logger.step(`Show details for ${topResultId}`);
      const showResult = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "show", topResultId, "--json"],
        cwd: PROJECT_ROOT,
        logger,
      });
      expect(showResult.success).toBe(true);

      const promptDetails = JSON.parse(showResult.stdout);
      logger.info("Prompt details", {
        id: promptDetails.id,
        title: promptDetails.title,
      });

      // Step 4: Copy the prompt content
      logger.step(`Copy content for ${topResultId}`);
      const copyResult = await spawnCli({
        cmd: ["bun", "run", "jfp.ts", "copy", topResultId],
        cwd: PROJECT_ROOT,
        logger,
      });

      // In headless environments, clipboard fails but content is in fallback
      let copiedContent: string;
      if (copyResult.success) {
        copiedContent = copyResult.stdout;
      } else {
        // Headless - check for fallback in JSON response
        try {
          const output = JSON.parse(copyResult.stdout);
          expect(output.fallback).toBeDefined();
          copiedContent = output.fallback;
          logger.info("Running in headless mode - using fallback content");
        } catch {
          // If not JSON, use raw stdout
          copiedContent = copyResult.stdout;
        }
      }
      expect(copiedContent.length).toBeGreaterThan(50);

      logger.info("Content copied", { length: copiedContent.length });

      logger.summary();

      // Note: In headless environments, logger.hasErrors() may be true due to
      // clipboard failure, but the workflow still completes successfully with fallback.
      // We verify the workflow completed by checking all steps produced valid output.
    });
  });
});
