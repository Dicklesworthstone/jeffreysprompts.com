/**
 * End-to-End CLI Workflow Tests
 *
 * Tests the full user journey through the CLI:
 * list → search → show → export → render → suggest → bundles
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

function requireJson<T>(value: T | null, context: string): T {
  if (!value) {
    throw new Error(`Expected JSON for ${context}`);
  }
  return value;
}

// ============================================================================
// Test Setup/Teardown
// ============================================================================

beforeAll(() => {
  log("setup", "Initializing e2e test environment");

  // Create fake home directory for config isolation
  const fakeHome = "/tmp/jfp-e2e-home";
  if (!existsSync(fakeHome)) {
    mkdirSync(fakeHome, { recursive: true });
  }
  mkdirSync(join(fakeHome, ".config", "claude", "skills"), { recursive: true });
});

afterAll(() => {
  log("teardown", "Cleaning up e2e test environment");

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

    // List returns wrapped response with prompts array
    const response = requireJson(
      parseJson<{ prompts: unknown[]; count: number }>(stdout),
      "list --json"
    );
    expect(Array.isArray(response.prompts)).toBe(true);
    expect(response.prompts.length).toBeGreaterThan(0);
    expect(response.count).toBe(response.prompts.length);

    log("list", `Found ${response.prompts.length} prompts`);

    // Verify schema of first prompt
    const firstPrompt = response.prompts[0] as Record<string, unknown>;
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

    // List returns wrapped response with prompts array
    const response = requireJson(
      parseJson<{ prompts: { category: string }[]; count: number }>(stdout),
      "list --category ideation --json"
    );
    expect(response.prompts.length).toBeGreaterThan(0);

    // All should be ideation
    for (const prompt of response.prompts) {
      expect(prompt.category).toBe("ideation");
    }

    log("list-filter", `Found ${response.prompts.length} ideation prompts`);
  });

  it("Step 3: search prompts", async () => {
    log("search", "Running: jfp search wizard --json");

    const { stdout, exitCode } = await runCli("search wizard --json");

    expect(exitCode).toBe(0);

    const response = requireJson(
      parseJson<{ results: { id: string; score: number }[]; query: string; authenticated: boolean }>(stdout),
      "search wizard --json"
    );
    expect(Array.isArray(response.results)).toBe(true);
    expect(response.results.length).toBeGreaterThan(0);

    // idea-wizard should be in results
    const hasWizard = response.results.some((r) => r.id === "idea-wizard");
    expect(hasWizard).toBe(true);

    // Results should be ordered by score
    for (let i = 1; i < response.results.length; i++) {
      expect(response.results[i - 1].score).toBeGreaterThanOrEqual(response.results[i].score);
    }

    log("search", `Found ${response.results.length} results, scores descending verified`);
  });

  it("Step 4: show specific prompt", async () => {
    log("show", `Running: jfp show ${TEST_PROMPT_ID} --json`);

    const { stdout, exitCode } = await runCli(`show ${TEST_PROMPT_ID} --json`);

    expect(exitCode).toBe(0);

    const prompt = requireJson(
      parseJson<{ id: string; content: string; title: string }>(stdout),
      `show ${TEST_PROMPT_ID} --json`
    );
    expect(prompt.id).toBe(TEST_PROMPT_ID);
    expect(prompt.content.length).toBeGreaterThan(100);

    log("show", `Prompt content length: ${prompt.content.length} chars`);
  });

  it("Step 5: show non-existent prompt returns error", async () => {
    log("show-error", "Running: jfp show nonexistent-xyz --json");

    const { stdout, exitCode } = await runCli("show nonexistent-xyz --json");

    expect(exitCode).toBe(1);

    const error = requireJson(parseJson<{ error: string }>(stdout), "show nonexistent-xyz --json");
    expect(error.error).toBe("not_found");

    log("show-error", "Error payload verified");
  });
});

describe("CLI E2E: Suggestion Flow", () => {
  it("suggest prompts for a task", async () => {
    log("suggest", "Running: jfp suggest documentation --json");

    // Use a single word to avoid shell quoting issues
    const { stdout, exitCode } = await runCli("suggest documentation --json");

    expect(exitCode).toBe(0);

    const result = requireJson(parseJson<{
      task: string;
      suggestions: { id: string; relevance: number }[];
      total: number;
    }>(stdout), "suggest documentation --json");
    expect(result.task).toBe("documentation");
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);

    log("suggest", `Got ${result.suggestions.length} suggestions`);
  });
});

describe("CLI E2E: Category & Tag Commands", () => {
  it("list categories", async () => {
    log("categories", "Running: jfp categories --json");

    const { stdout, exitCode } = await runCli("categories --json");

    expect(exitCode).toBe(0);

    const categories = requireJson(parseJson<{ name: string; count: number }[]>(stdout), "categories --json");
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);

    // Each category should have name and count
    for (const cat of categories) {
      expect(cat).toHaveProperty("name");
      expect(cat).toHaveProperty("count");
      expect(cat.count).toBeGreaterThan(0);
    }

    log("categories", `Found ${categories.length} categories`);
  });

  it("list tags", async () => {
    log("tags", "Running: jfp tags --json");

    const { stdout, exitCode } = await runCli("tags --json");

    expect(exitCode).toBe(0);

    const tags = requireJson(parseJson<{ name: string; count: number }[]>(stdout), "tags --json");
    expect(Array.isArray(tags)).toBe(true);
    expect(tags.length).toBeGreaterThan(0);

    log("tags", `Found ${tags.length} tags`);
  });
});

describe("CLI E2E: Bundle Flow", () => {
  it("list bundles", async () => {
    log("bundles", "Running: jfp bundles --json");

    const { stdout, exitCode } = await runCli("bundles --json");

    expect(exitCode).toBe(0);

    const bundles = requireJson(
      parseJson<{ id: string; title: string; promptCount: number }[]>(stdout),
      "bundles --json"
    );
    expect(Array.isArray(bundles)).toBe(true);
    expect(bundles.length).toBeGreaterThan(0);

    // Each bundle should have required fields
    for (const bundle of bundles) {
      expect(bundle).toHaveProperty("id");
      expect(bundle).toHaveProperty("title");
      expect(bundle).toHaveProperty("promptCount");
      expect(typeof bundle.promptCount).toBe("number");
    }

    log("bundles", `Found ${bundles.length} bundles`);
  });

  it("show bundle details", async () => {
    // First get a bundle ID
    const { stdout: bundlesOut } = await runCli("bundles --json");
    const bundles = requireJson(parseJson<{ id: string }[]>(bundlesOut), "bundles --json");

    if (bundles.length > 0) {
      const bundleId = bundles[0].id;
      log("bundle-show", `Running: jfp bundle ${bundleId} --json`);

      const { stdout, exitCode } = await runCli(`bundle ${bundleId} --json`);

      expect(exitCode).toBe(0);

      const bundle = requireJson(parseJson<{ id: string; promptCount: number }>(stdout), `bundle ${bundleId} --json`);
      expect(bundle.id).toBe(bundleId);

      log("bundle-show", `Bundle ${bundleId} has ${bundle.promptCount} prompts`);
    }
  });
});

describe("CLI E2E: Help & Documentation", () => {
  it("help command returns structured JSON", async () => {
    log("help", "Running: jfp help --json");

    const { stdout, exitCode } = await runCli("help --json");

    expect(exitCode).toBe(0);

    const help = requireJson(parseJson<{
      name: string;
      version: string;
      commands: Record<string, unknown[]>;
      examples: unknown[];
    }>(stdout), "help --json");

    expect(help.name).toBe("jfp");
    expect(help.version).toBeDefined();
    expect(help.commands).toBeDefined();
    expect(help.examples).toBeDefined();

    // Verify command categories
    expect(help.commands).toHaveProperty("listing_searching");
    expect(help.commands).toHaveProperty("viewing");
    expect(help.commands).toHaveProperty("copying_exporting");

    log("help", "Help JSON schema verified");
  });

  it("about command returns info", async () => {
    log("about", "Running: jfp about --json");

    const { stdout, exitCode } = await runCli("about --json");

    expect(exitCode).toBe(0);

    const about = requireJson(parseJson<{ name: string; version: string }>(stdout), "about --json");

    log("about", "About command works");
  });
});

describe("CLI E2E: JSON Schema Stability", () => {
  /**
   * These tests verify that JSON output schemas remain stable.
   * Breaking changes to these will break agent integrations.
   */

  it("list schema: wrapped response with prompts array having required fields", async () => {
    const { stdout } = await runCli("list --json");
    const response = requireJson(
      parseJson<{ prompts: Record<string, unknown>[]; count: number }>(stdout),
      "list --json"
    );

    // Wrapped response structure
    expect(response).toHaveProperty("prompts");
    expect(response).toHaveProperty("count");
    expect(Array.isArray(response.prompts)).toBe(true);

    const requiredFields = ["id", "title", "description", "category", "tags", "version", "content", "author", "created"];

    for (const field of requiredFields) {
      expect(response.prompts[0]).toHaveProperty(field);
    }
  });

  it("search schema: wrapped response with results array having flat structure", async () => {
    const { stdout } = await runCli("search idea --json");
    const response = requireJson(
      parseJson<{ results: Record<string, unknown>[]; query: string; authenticated: boolean }>(stdout),
      "search idea --json"
    );

    // Wrapped response structure
    expect(response).toHaveProperty("results");
    expect(response).toHaveProperty("query");
    expect(response).toHaveProperty("authenticated");
    expect(Array.isArray(response.results)).toBe(true);

    // Flat result structure (no nested prompt object)
    expect(response.results[0]).toHaveProperty("id");
    expect(response.results[0]).toHaveProperty("title");
    expect(response.results[0]).toHaveProperty("score");
    expect(response.results[0]).toHaveProperty("source");
    expect(typeof response.results[0].score).toBe("number");
  });

  it("show schema: single prompt object with content", async () => {
    const { stdout } = await runCli(`show ${TEST_PROMPT_ID} --json`);
    const prompt = requireJson(parseJson<Record<string, unknown>>(stdout), `show ${TEST_PROMPT_ID} --json`);

    expect(prompt).toHaveProperty("id");
    expect(prompt).toHaveProperty("content");
    expect(typeof prompt.content).toBe("string");
    expect((prompt.content as string).length).toBeGreaterThan(0);
  });

  it("error schema: object with error key", async () => {
    const { stdout } = await runCli("show nonexistent-prompt --json");
    const error = requireJson(parseJson<Record<string, unknown>>(stdout), "show nonexistent-prompt --json");

    expect(error).toHaveProperty("error");
    expect(error.error).toBe("not_found");
  });
});

describe("CLI E2E: Export Flow", () => {
  it("export prompt returns file list in JSON mode", async () => {
    log("export", `Running: jfp export ${TEST_PROMPT_ID} --json`);

    const { stdout, exitCode } = await runCli(`export ${TEST_PROMPT_ID} --json`);

    expect(exitCode).toBe(0);

    const result = requireJson(
      parseJson<{ exported: { id: string; file: string }[] }>(stdout),
      `export ${TEST_PROMPT_ID} --json`
    );
    expect(Array.isArray(result.exported)).toBe(true);
    expect(result.exported.length).toBe(1);
    expect(result.exported[0].id).toBe(TEST_PROMPT_ID);

    log("export", `Exported to: ${result.exported[0].file}`);
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

describe("CLI E2E: Deprecated Skill Commands", () => {
  const deprecatedCommands = ["install", "installed", "uninstall", "update", "skills"];

  for (const command of deprecatedCommands) {
    it(`rejects ${command} and points to jsm`, async () => {
      log("deprecated", `Running: jfp ${command} --json`);

      const { stdout, exitCode } = await runCli(`${command} --json`);

      expect(exitCode).toBe(1);

      const result = requireJson(parseJson<{
        error: boolean;
        code: string;
        message: string;
      }>(stdout), `${command} --json`);

      expect(result.code).toBe("deprecated_command");
      expect(result.message.toLowerCase()).toContain("jsm");
    });
  }
});

describe("CLI E2E: TTY vs Pipe Output Mode Switching", () => {
  /**
   * Tests that the CLI correctly switches output modes based on terminal context.
   *
   * The shouldOutputJson function returns true when:
   * - options.json === true (explicit --json flag)
   * - !process.stdout.isTTY (piped/redirected output)
   *
   * Since these E2E tests run in a script context (non-TTY), we test:
   * 1. Piped output defaults to JSON even without --json flag
   * 2. --json flag always produces JSON (explicit)
   * 3. JSON output is valid and parseable
   */

  it("piped output (non-TTY) defaults to JSON format", async () => {
    log("tty-pipe", "Testing that piped output produces JSON without --json flag");

    // Run without --json flag, but output should still be JSON because non-TTY
    const { stdout, exitCode } = await runCli("list");

    expect(exitCode).toBe(0);

    // Should be valid JSON since we're in a non-TTY context - wrapped response
    const result = requireJson(parseJson<{ prompts: unknown[]; count: number }>(stdout), "list");
    expect(Array.isArray(result.prompts)).toBe(true);

    log("tty-pipe", "Piped output correctly defaults to JSON");
  });

  it("--json flag produces JSON regardless of context", async () => {
    log("tty-json-flag", "Testing --json flag explicitly produces JSON");

    const { stdout, exitCode } = await runCli("list --json");

    expect(exitCode).toBe(0);

    // Should definitely be JSON with explicit flag - wrapped response
    const result = requireJson(parseJson<{ prompts: unknown[]; count: number }>(stdout), "list --json");
    expect(Array.isArray(result.prompts)).toBe(true);

    log("tty-json-flag", "Explicit --json produces valid JSON");
  });

  it("show command outputs JSON in piped mode", async () => {
    log("tty-show", "Testing show command in piped mode");

    const { stdout, exitCode } = await runCli("show idea-wizard");

    expect(exitCode).toBe(0);

    // Should be JSON object
    const result = requireJson(parseJson<{ id: string; content: string }>(stdout), "show idea-wizard");
    expect(result.id).toBe("idea-wizard");
    expect(typeof result.content).toBe("string");

    log("tty-show", "Show command outputs JSON in piped mode");
  });

  it("search command outputs JSON in piped mode", async () => {
    log("tty-search", "Testing search command in piped mode");

    const { stdout, exitCode } = await runCli("search wizard");

    expect(exitCode).toBe(0);

    // Should be wrapped JSON with results array
    const result = requireJson(
      parseJson<{ results: unknown[]; query: string; authenticated: boolean }>(stdout),
      "search wizard"
    );
    expect(Array.isArray(result.results)).toBe(true);

    log("tty-search", "Search command outputs JSON in piped mode");
  });

  it("help command outputs JSON in piped mode", async () => {
    log("tty-help", "Testing help command in piped mode");

    const { stdout, exitCode } = await runCli("help");

    expect(exitCode).toBe(0);

    // Should be JSON with help structure
    const result = requireJson(parseJson<{ name: string; commands: Record<string, unknown> }>(stdout), "help");
    expect(result.name).toBe("jfp");
    expect(result.commands).toBeDefined();

    log("tty-help", "Help command outputs JSON in piped mode");
  });

  it("error output is JSON in piped mode", async () => {
    log("tty-error", "Testing error output in piped mode");

    const { stdout, exitCode } = await runCli("show nonexistent-prompt");

    expect(exitCode).toBe(1);

    // Error should be JSON
    const result = requireJson(parseJson<{ error: string; message?: string }>(stdout), "show nonexistent-prompt");
    expect(result.error).toBe("not_found");

    log("tty-error", "Error output is JSON in piped mode");
  });

  it("categories command requires --json flag for JSON output", async () => {
    log("tty-categories", "Testing categories command with --json flag");

    // categories uses options.json directly, not shouldOutputJson
    // So it requires explicit --json flag
    const { stdout, exitCode } = await runCli("categories --json");

    expect(exitCode).toBe(0);

    // Should be JSON array of categories
    const result = requireJson(parseJson<{ name: string; count: number }[]>(stdout), "categories --json");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    log("tty-categories", "Categories outputs JSON with --json flag");
  });

  it("tags command requires --json flag for JSON output", async () => {
    log("tty-tags", "Testing tags command with --json flag");

    // tags uses options.json directly, not shouldOutputJson
    // So it requires explicit --json flag
    const { stdout, exitCode } = await runCli("tags --json");

    expect(exitCode).toBe(0);

    // Should be JSON array of tags
    const result = requireJson(parseJson<{ name: string; count: number }[]>(stdout), "tags --json");
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    log("tty-tags", "Tags outputs JSON with --json flag");
  });
});

describe("CLI E2E: Invalid Input and Edge Case Handling", () => {
  /**
   * Tests the CLI's handling of:
   * - Invalid prompt/skill IDs
   * - Non-existent resources
   * - Empty/malformed input
   * - Edge cases in search
   * - Invalid command arguments
   */

  it("show command with non-existent prompt ID", async () => {
    log("invalid-show", "Testing show with non-existent prompt ID");

    const { stdout, stderr, exitCode } = await runCli("show nonexistent-prompt-xyz --json");

    // Should fail gracefully with error in JSON
    expect(exitCode).not.toBe(0);

    const result = requireJson(parseJson<{ error: string }>(stdout), "show nonexistent-prompt-xyz --json");
    expect(result.error).toBeDefined();

    log("invalid-show", "Non-existent prompt handled correctly");
  });

  it("install command is deprecated (even with invalid IDs)", async () => {
    log("invalid-install", "Testing install deprecation");

    const { stdout, exitCode } = await runCli("install fake-nonexistent-prompt --json");

    expect(exitCode).toBe(1);

    const result = requireJson(
      parseJson<{ code: string; message: string }>(stdout),
      "install fake-nonexistent-prompt --json"
    );
    expect(result.code).toBe("deprecated_command");
    expect(result.message.toLowerCase()).toContain("jsm");

    log("invalid-install", "Deprecated install handled correctly");
  });

  it("search command requires a query argument", async () => {
    log("empty-search", "Testing search with no query (should fail)");

    // Empty search should fail - query is required
    const { exitCode } = await runCli("search --json");

    expect(exitCode).not.toBe(0);

    log("empty-search", "Empty search correctly rejected");
  });

  it("search with very specific non-matching query", async () => {
    log("no-results-search", "Testing search with non-matching query");

    const { stdout, exitCode } = await runCli("search xyznonexistentquerythatmatchesnothing123 --json");

    expect(exitCode).toBe(0);

    // Search returns wrapped response with results array
    const response = requireJson(
      parseJson<{ results: Array<{ id: string }>; query: string; authenticated: boolean }>(stdout),
      "search xyznonexistentquerythatmatchesnothing123 --json"
    );
    expect(response.results.length).toBe(0);

    log("no-results-search", "No results handled correctly");
  });

  it("uninstall command is deprecated", async () => {
    log("invalid-uninstall-id", "Testing uninstall deprecation");

    const { stdout, exitCode } = await runCli("uninstall ../../../etc/passwd --confirm --json");

    expect(exitCode).toBe(1);

    const result = requireJson(
      parseJson<{ code: string; message: string }>(stdout),
      "uninstall --confirm --json"
    );
    expect(result.code).toBe("deprecated_command");
    expect(result.message.toLowerCase()).toContain("jsm");

    log("invalid-uninstall-id", "Deprecated uninstall handled correctly");
  });

  it("copy command with non-existent prompt ID", async () => {
    log("invalid-copy", "Testing copy with non-existent prompt ID");

    const { stdout, exitCode } = await runCli("copy fake-nonexistent-prompt --json");

    // Should fail gracefully
    expect(exitCode).not.toBe(0);

    log("invalid-copy", "Non-existent prompt copy handled correctly");
  });

  it("installed command is deprecated", async () => {
    log("empty-installed", "Testing installed deprecation");

    const { stdout, exitCode } = await runCli("installed --json");

    expect(exitCode).toBe(1);

    const result = requireJson(parseJson<{ code: string; message: string }>(stdout), "installed --json");
    expect(result.code).toBe("deprecated_command");
    expect(result.message.toLowerCase()).toContain("jsm");

    log("empty-installed", "Deprecated installed handled correctly");
  });

  it("search with special characters in query", async () => {
    log("special-chars", "Testing search with special characters");

    // Use direct Bun.spawn to pass query with special chars as single arg
    try {
      const proc = Bun.spawn(["bun", `${PROJECT_ROOT}/jfp.ts`, "search", "test & query", "--json"], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, HOME: "/tmp/jfp-e2e-home" },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);

      // Search returns wrapped response with results array
      const response = requireJson(
        parseJson<{ results: Array<{ id: string }>; query: string; authenticated: boolean }>(stdout),
        "search with special characters"
      );
      // Should not crash, just return 0 or some results
      expect(response.results.length).toBeGreaterThanOrEqual(0);

      log("special-chars", "Special characters handled safely");
    } catch (error) {
      // Should not throw
      expect(error).toBeNull();
    }
  });

  it("export command with non-existent prompt ID", async () => {
    log("invalid-export", "Testing export with non-existent prompt ID");

    const { stdout, exitCode } = await runCli("export nonexistent-prompt-xyz --json");

    // Should fail gracefully
    expect(exitCode).not.toBe(0);

    log("invalid-export", "Non-existent prompt export handled correctly");
  });

  it("show command with very long ID", async () => {
    log("long-id", "Testing show with excessively long ID");

    const longId = "a".repeat(500);
    const { stdout, exitCode } = await runCli(`show ${longId} --json`);

    // Should handle gracefully without crashing
    expect(exitCode).not.toBe(0);

    log("long-id", "Long ID handled gracefully");
  });

  it("install command is deprecated with multiple IDs", async () => {
    log("multi-invalid", "Testing install deprecation with multiple IDs");

    const { stdout, exitCode } = await runCli("install fake-id-1 fake-id-2 fake-id-3 --json");

    expect(exitCode).toBe(1);

    const result = requireJson(
      parseJson<{ code: string; message: string }>(stdout),
      "install fake-id-1 fake-id-2 fake-id-3 --json"
    );
    expect(result.code).toBe("deprecated_command");
    expect(result.message.toLowerCase()).toContain("jsm");

    log("multi-invalid", "Deprecated install handled correctly");
  });
});
