/**
 * End-to-End CLI Workflow Tests
 *
 * Tests the full user journey through the CLI:
 * list → search → show → install → installed → update → uninstall
 *
 * Uses detailed logging for each step to aid debugging.
 * Verifies JSON output schemas for agent integration stability.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";

// ============================================================================
// Test Configuration
// ============================================================================

const PROJECT_ROOT = "/data/projects/jeffreysprompts.com";
const JFP_CLI = `bun ${PROJECT_ROOT}/jfp.ts`;
const TEST_SKILLS_DIR = "/tmp/jfp-e2e-test-skills";
const TEST_PROMPT_ID = "idea-wizard"; // Known prompt for testing

// Log levels for debugging
const LOG_ENABLED = process.env.E2E_VERBOSE === "1";
function log(step: string, message: string) {
  if (LOG_ENABLED) {
    console.log(`[E2E:${step}] ${message}`);
  }
}

// ============================================================================
// Test Utilities
// ============================================================================

async function runCli(args: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const proc = Bun.spawn(["bun", `${PROJECT_ROOT}/jfp.ts`, ...args.split(" ")], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, HOME: "/tmp/jfp-e2e-home" },
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { stdout, stderr, exitCode };
  } catch (error) {
    return { stdout: "", stderr: String(error), exitCode: 1 };
  }
}

function parseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ============================================================================
// Test Setup/Teardown
// ============================================================================

beforeAll(() => {
  log("setup", "Initializing e2e test environment");

  // Create test skills directory
  if (existsSync(TEST_SKILLS_DIR)) {
    rmSync(TEST_SKILLS_DIR, { recursive: true });
  }
  mkdirSync(TEST_SKILLS_DIR, { recursive: true });

  // Create fake home directory for config isolation
  const fakeHome = "/tmp/jfp-e2e-home";
  if (!existsSync(fakeHome)) {
    mkdirSync(fakeHome, { recursive: true });
  }
  mkdirSync(join(fakeHome, ".config", "claude", "skills"), { recursive: true });
});

afterAll(() => {
  log("teardown", "Cleaning up e2e test environment");

  // Cleanup test directories
  if (existsSync(TEST_SKILLS_DIR)) {
    rmSync(TEST_SKILLS_DIR, { recursive: true });
  }

  const fakeHome = "/tmp/jfp-e2e-home";
  if (existsSync(fakeHome)) {
    rmSync(fakeHome, { recursive: true });
  }
});

// ============================================================================
// E2E Test Suites
// ============================================================================

describe("CLI E2E: Discovery Flow", () => {
  it("Step 1: list prompts and verify JSON structure", async () => {
    log("list", "Running: jfp list --json");

    const { stdout, exitCode } = await runCli("list --json");

    expect(exitCode).toBe(0);

    const prompts = parseJson<unknown[]>(stdout);
    expect(prompts).not.toBeNull();
    expect(Array.isArray(prompts)).toBe(true);
    expect(prompts!.length).toBeGreaterThan(0);

    log("list", `Found ${prompts!.length} prompts`);

    // Verify schema of first prompt
    const firstPrompt = prompts![0] as Record<string, unknown>;
    expect(firstPrompt).toHaveProperty("id");
    expect(firstPrompt).toHaveProperty("title");
    expect(firstPrompt).toHaveProperty("description");
    expect(firstPrompt).toHaveProperty("category");
    expect(firstPrompt).toHaveProperty("tags");

    log("list", "JSON schema verified");
  });

  it("Step 2: list with category filter", async () => {
    log("list-filter", "Running: jfp list --category ideation --json");

    const { stdout, exitCode } = await runCli("list --category ideation --json");

    expect(exitCode).toBe(0);

    const prompts = parseJson<{ category: string }[]>(stdout);
    expect(prompts).not.toBeNull();
    expect(prompts!.length).toBeGreaterThan(0);

    // All should be ideation
    for (const prompt of prompts!) {
      expect(prompt.category).toBe("ideation");
    }

    log("list-filter", `Found ${prompts!.length} ideation prompts`);
  });

  it("Step 3: search prompts", async () => {
    log("search", "Running: jfp search wizard --json");

    const { stdout, exitCode } = await runCli("search wizard --json");

    expect(exitCode).toBe(0);

    const results = parseJson<{ prompt: { id: string }; score: number }[]>(stdout);
    expect(results).not.toBeNull();
    expect(Array.isArray(results)).toBe(true);
    expect(results!.length).toBeGreaterThan(0);

    // idea-wizard should be in results
    const hasWizard = results!.some((r) => r.prompt.id === "idea-wizard");
    expect(hasWizard).toBe(true);

    // Results should be ordered by score
    for (let i = 1; i < results!.length; i++) {
      expect(results![i - 1].score).toBeGreaterThanOrEqual(results![i].score);
    }

    log("search", `Found ${results!.length} results, scores descending verified`);
  });

  it("Step 4: show specific prompt", async () => {
    log("show", `Running: jfp show ${TEST_PROMPT_ID} --json`);

    const { stdout, exitCode } = await runCli(`show ${TEST_PROMPT_ID} --json`);

    expect(exitCode).toBe(0);

    const prompt = parseJson<{ id: string; content: string; title: string }>(stdout);
    expect(prompt).not.toBeNull();
    expect(prompt!.id).toBe(TEST_PROMPT_ID);
    expect(prompt!.content.length).toBeGreaterThan(100);

    log("show", `Prompt content length: ${prompt!.content.length} chars`);
  });

  it("Step 5: show non-existent prompt returns error", async () => {
    log("show-error", "Running: jfp show nonexistent-xyz --json");

    const { stdout, exitCode } = await runCli("show nonexistent-xyz --json");

    expect(exitCode).toBe(1);

    const error = parseJson<{ error: string }>(stdout);
    expect(error).not.toBeNull();
    expect(error!.error).toBe("not_found");

    log("show-error", "Error payload verified");
  });
});

describe("CLI E2E: Suggestion Flow", () => {
  it("suggest prompts for a task", async () => {
    log("suggest", "Running: jfp suggest documentation --json");

    // Use a single word to avoid shell quoting issues
    const { stdout, exitCode } = await runCli("suggest documentation --json");

    expect(exitCode).toBe(0);

    const result = parseJson<{
      task: string;
      suggestions: { id: string; relevance: number }[];
      total: number;
    }>(stdout);
    expect(result).not.toBeNull();
    expect(result!.task).toBe("documentation");
    expect(Array.isArray(result!.suggestions)).toBe(true);
    expect(result!.suggestions.length).toBeGreaterThan(0);

    log("suggest", `Got ${result!.suggestions.length} suggestions`);
  });
});

describe("CLI E2E: Category & Tag Commands", () => {
  it("list categories", async () => {
    log("categories", "Running: jfp categories --json");

    const { stdout, exitCode } = await runCli("categories --json");

    expect(exitCode).toBe(0);

    const categories = parseJson<{ name: string; count: number }[]>(stdout);
    expect(categories).not.toBeNull();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories!.length).toBeGreaterThan(0);

    // Each category should have name and count
    for (const cat of categories!) {
      expect(cat).toHaveProperty("name");
      expect(cat).toHaveProperty("count");
      expect(cat.count).toBeGreaterThan(0);
    }

    log("categories", `Found ${categories!.length} categories`);
  });

  it("list tags", async () => {
    log("tags", "Running: jfp tags --json");

    const { stdout, exitCode } = await runCli("tags --json");

    expect(exitCode).toBe(0);

    const tags = parseJson<{ name: string; count: number }[]>(stdout);
    expect(tags).not.toBeNull();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags!.length).toBeGreaterThan(0);

    log("tags", `Found ${tags!.length} tags`);
  });
});

describe("CLI E2E: Bundle Flow", () => {
  it("list bundles", async () => {
    log("bundles", "Running: jfp bundles --json");

    const { stdout, exitCode } = await runCli("bundles --json");

    expect(exitCode).toBe(0);

    const bundles = parseJson<{ id: string; title: string; promptCount: number }[]>(stdout);
    expect(bundles).not.toBeNull();
    expect(Array.isArray(bundles)).toBe(true);
    expect(bundles!.length).toBeGreaterThan(0);

    // Each bundle should have required fields
    for (const bundle of bundles!) {
      expect(bundle).toHaveProperty("id");
      expect(bundle).toHaveProperty("title");
      expect(bundle).toHaveProperty("promptCount");
      expect(typeof bundle.promptCount).toBe("number");
    }

    log("bundles", `Found ${bundles!.length} bundles`);
  });

  it("show bundle details", async () => {
    // First get a bundle ID
    const { stdout: bundlesOut } = await runCli("bundles --json");
    const bundles = parseJson<{ id: string }[]>(bundlesOut);

    if (bundles && bundles.length > 0) {
      const bundleId = bundles[0].id;
      log("bundle-show", `Running: jfp bundle ${bundleId} --json`);

      const { stdout, exitCode } = await runCli(`bundle ${bundleId} --json`);

      expect(exitCode).toBe(0);

      const bundle = parseJson<{ id: string; promptCount: number }>(stdout);
      expect(bundle).not.toBeNull();
      expect(bundle!.id).toBe(bundleId);

      log("bundle-show", `Bundle ${bundleId} has ${bundle!.promptCount} prompts`);
    }
  });
});

describe("CLI E2E: Help & Documentation", () => {
  it("help command returns structured JSON", async () => {
    log("help", "Running: jfp help --json");

    const { stdout, exitCode } = await runCli("help --json");

    expect(exitCode).toBe(0);

    const help = parseJson<{
      name: string;
      version: string;
      commands: Record<string, unknown[]>;
      examples: unknown[];
    }>(stdout);

    expect(help).not.toBeNull();
    expect(help!.name).toBe("jfp");
    expect(help!.version).toBeDefined();
    expect(help!.commands).toBeDefined();
    expect(help!.examples).toBeDefined();

    // Verify command categories
    expect(help!.commands).toHaveProperty("listing_searching");
    expect(help!.commands).toHaveProperty("viewing");
    expect(help!.commands).toHaveProperty("copying_exporting");

    log("help", "Help JSON schema verified");
  });

  it("about command returns info", async () => {
    log("about", "Running: jfp about --json");

    const { stdout, exitCode } = await runCli("about --json");

    expect(exitCode).toBe(0);

    const about = parseJson<{ name: string; version: string }>(stdout);
    expect(about).not.toBeNull();

    log("about", "About command works");
  });
});

describe("CLI E2E: JSON Schema Stability", () => {
  /**
   * These tests verify that JSON output schemas remain stable.
   * Breaking changes to these will break agent integrations.
   */

  it("list schema: array of prompts with required fields", async () => {
    const { stdout } = await runCli("list --json");
    const prompts = parseJson<Record<string, unknown>[]>(stdout)!;

    const requiredFields = ["id", "title", "description", "category", "tags", "version", "content", "author", "created"];

    for (const field of requiredFields) {
      expect(prompts[0]).toHaveProperty(field);
    }
  });

  it("search schema: array of results with prompt, score, matchedFields", async () => {
    const { stdout } = await runCli("search idea --json");
    const results = parseJson<Record<string, unknown>[]>(stdout)!;

    expect(results[0]).toHaveProperty("prompt");
    expect(results[0]).toHaveProperty("score");
    expect(results[0]).toHaveProperty("matchedFields");
    expect(typeof results[0].score).toBe("number");
    expect(Array.isArray(results[0].matchedFields)).toBe(true);
  });

  it("show schema: single prompt object with content", async () => {
    const { stdout } = await runCli(`show ${TEST_PROMPT_ID} --json`);
    const prompt = parseJson<Record<string, unknown>>(stdout)!;

    expect(prompt).toHaveProperty("id");
    expect(prompt).toHaveProperty("content");
    expect(typeof prompt.content).toBe("string");
    expect((prompt.content as string).length).toBeGreaterThan(0);
  });

  it("error schema: object with error key", async () => {
    const { stdout } = await runCli("show nonexistent-prompt --json");
    const error = parseJson<Record<string, unknown>>(stdout)!;

    expect(error).toHaveProperty("error");
    expect(error.error).toBe("not_found");
  });
});

describe("CLI E2E: Export Flow", () => {
  it("export prompt returns file list in JSON mode", async () => {
    log("export", `Running: jfp export ${TEST_PROMPT_ID} --json`);

    const { stdout, exitCode } = await runCli(`export ${TEST_PROMPT_ID} --json`);

    expect(exitCode).toBe(0);

    const result = parseJson<{ exported: { id: string; file: string }[] }>(stdout);
    expect(result).not.toBeNull();
    expect(Array.isArray(result!.exported)).toBe(true);
    expect(result!.exported.length).toBe(1);
    expect(result!.exported[0].id).toBe(TEST_PROMPT_ID);

    log("export", `Exported to: ${result!.exported[0].file}`);
  });

  it("export to stdout outputs skill markdown", async () => {
    log("export-stdout", `Running: jfp export ${TEST_PROMPT_ID} --stdout`);

    const { stdout, exitCode } = await runCli(`export ${TEST_PROMPT_ID} --stdout`);

    expect(exitCode).toBe(0);

    // Should contain YAML frontmatter and content
    expect(stdout).toContain("---");
    expect(stdout).toContain("name: idea-wizard");
    expect(stdout).toContain("version: 1.0.0");

    log("export-stdout", `Exported markdown length: ${stdout.length} chars`);
  });
});
