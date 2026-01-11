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

    // List returns wrapped response with prompts array
    const response = parseJson<{ prompts: unknown[]; count: number }>(stdout);
    expect(response).not.toBeNull();
    expect(Array.isArray(response!.prompts)).toBe(true);
    expect(response!.prompts.length).toBeGreaterThan(0);
    expect(response!.count).toBe(response!.prompts.length);

    log("list", `Found ${response!.prompts.length} prompts`);

    // Verify schema of first prompt
    const firstPrompt = response!.prompts[0] as Record<string, unknown>;
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
    const response = parseJson<{ prompts: { category: string }[]; count: number }>(stdout);
    expect(response).not.toBeNull();
    expect(response!.prompts.length).toBeGreaterThan(0);

    // All should be ideation
    for (const prompt of response!.prompts) {
      expect(prompt.category).toBe("ideation");
    }

    log("list-filter", `Found ${response!.prompts.length} ideation prompts`);
  });

  it("Step 3: search prompts", async () => {
    log("search", "Running: jfp search wizard --json");

    const { stdout, exitCode } = await runCli("search wizard --json");

    expect(exitCode).toBe(0);

    const response = parseJson<{ results: { id: string; score: number }[]; query: string; authenticated: boolean }>(stdout);
    expect(response).not.toBeNull();
    expect(Array.isArray(response!.results)).toBe(true);
    expect(response!.results.length).toBeGreaterThan(0);

    // idea-wizard should be in results
    const hasWizard = response!.results.some((r) => r.id === "idea-wizard");
    expect(hasWizard).toBe(true);

    // Results should be ordered by score
    for (let i = 1; i < response!.results.length; i++) {
      expect(response!.results[i - 1].score).toBeGreaterThanOrEqual(response!.results[i].score);
    }

    log("search", `Found ${response!.results.length} results, scores descending verified`);
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

  it("list schema: wrapped response with prompts array having required fields", async () => {
    const { stdout } = await runCli("list --json");
    const response = parseJson<{ prompts: Record<string, unknown>[]; count: number }>(stdout)!;

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
    const response = parseJson<{ results: Record<string, unknown>[]; query: string; authenticated: boolean }>(stdout)!;

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

describe("CLI E2E: Skill Lifecycle", () => {
  /**
   * Tests the full skill lifecycle:
   * 1. Install a skill
   * 2. Verify installed
   * 3. Update skills
   * 4. Uninstall the skill
   * 5. Verify uninstalled
   */
  const TEST_SKILL_ID = "idea-wizard";
  const SKILLS_DIR = "/tmp/jfp-e2e-home/.config/claude/skills";

  it("Step 1: Install a skill", async () => {
    log("install", `Running: jfp install ${TEST_SKILL_ID} --json`);

    const { stdout, exitCode } = await runCli(`install ${TEST_SKILL_ID} --json`);

    expect(exitCode).toBe(0);

    const result = parseJson<{
      success: boolean;
      installed: string[];
      targetDir: string;
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.installed).toContain(TEST_SKILL_ID);

    // Verify file exists on disk
    const skillPath = join(SKILLS_DIR, TEST_SKILL_ID, "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);

    log("install", `Skill installed to: ${result!.targetDir}`);
  });

  it("Step 2: List installed skills", async () => {
    log("installed", "Running: jfp installed --json");

    const { stdout, exitCode } = await runCli("installed --json");

    expect(exitCode).toBe(0);

    const result = parseJson<{
      installed: { id: string; version: string; location: string }[];
      count: number;
    }>(stdout);

    expect(result).not.toBeNull();

    // Should find our installed skill
    const hasSkill = result!.installed.some((s) => s.id === TEST_SKILL_ID);
    expect(hasSkill).toBe(true);

    log("installed", `Found ${result!.count} installed skills`);
  });

  it("Step 3: Update skills (dry-run)", async () => {
    log("update", "Running: jfp update --personal --dry-run --json");

    const { stdout, exitCode } = await runCli("update --personal --dry-run --json");

    expect(exitCode).toBe(0);

    const result = parseJson<{
      success: boolean;
      dryRun: boolean;
      updated: { id: string }[];
      unchanged: { id: string }[];
      skipped: { id: string }[];
      failed: { id: string }[];
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.dryRun).toBe(true);

    // All results should be in one of the result arrays
    const allResults = [
      ...(result!.updated || []),
      ...(result!.unchanged || []),
      ...(result!.skipped || []),
    ];

    // Our skill should appear in one of the arrays (likely unchanged since just installed)
    const hasSkill = allResults.some((r) => r.id === TEST_SKILL_ID);
    expect(hasSkill).toBe(true);

    log("update", `Update dry-run completed`);
  });

  it("Step 4: Uninstall the skill", async () => {
    log("uninstall", `Running: jfp uninstall ${TEST_SKILL_ID} --confirm --json`);

    const { stdout, exitCode } = await runCli(`uninstall ${TEST_SKILL_ID} --confirm --json`);

    expect(exitCode).toBe(0);

    const result = parseJson<{
      success: boolean;
      removed: string[];
      targetDir: string;
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.removed).toContain(TEST_SKILL_ID);

    log("uninstall", `Skill uninstalled from: ${result!.targetDir}`);
  });

  it("Step 5: Verify skill is uninstalled", async () => {
    log("verify-uninstall", "Running: jfp installed --json");

    const { stdout, exitCode } = await runCli("installed --json");

    expect(exitCode).toBe(0);

    const result = parseJson<{
      installed: { id: string }[];
      count: number;
    }>(stdout);

    expect(result).not.toBeNull();

    // Skill should no longer be in the list
    const hasSkill = result!.installed.some((s) => s.id === TEST_SKILL_ID);
    expect(hasSkill).toBe(false);

    // Verify file is removed from disk
    const skillPath = join(SKILLS_DIR, TEST_SKILL_ID, "SKILL.md");
    expect(existsSync(skillPath)).toBe(false);

    log("verify-uninstall", "Skill confirmed removed");
  });

  it("Step 6: Reinstall with --force", async () => {
    // First install
    await runCli(`install ${TEST_SKILL_ID} --json`);

    // Force reinstall
    log("force-install", `Running: jfp install ${TEST_SKILL_ID} --force --json`);

    const { stdout, exitCode } = await runCli(`install ${TEST_SKILL_ID} --force --json`);

    expect(exitCode).toBe(0);

    const result = parseJson<{
      success: boolean;
      installed: string[];
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.installed).toContain(TEST_SKILL_ID);

    log("force-install", "Force reinstall successful");

    // Cleanup
    await runCli(`uninstall ${TEST_SKILL_ID} --confirm --json`);
  });

  it("Step 7: Uninstall non-existent skill shows not found", async () => {
    log("uninstall-notfound", "Running: jfp uninstall fake-skill-xyz --confirm --json");

    const { stdout, exitCode } = await runCli("uninstall fake-skill-xyz --confirm --json");

    // Still exits 0 but with notFound
    expect(exitCode).toBe(0);

    const result = parseJson<{
      success: boolean;
      notFound: string[];
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.notFound).toContain("fake-skill-xyz");

    log("uninstall-notfound", "Not found handled correctly");
  });
});

describe("CLI E2E: Project-local vs Personal Skill Installation", () => {
  /**
   * Tests skill installation to different locations:
   * - Personal: ~/.config/claude/skills/ (default)
   * - Project: .claude/skills/ (with --project flag)
   *
   * Verifies that:
   * 1. Skills can be installed to both locations independently
   * 2. The installed command shows correct location for each skill
   * 3. Location filters (--personal, --project) work correctly
   * 4. Uninstall respects the --project flag
   */
  const PERSONAL_SKILL_ID = "idea-wizard";
  const PROJECT_SKILL_ID = "readme-reviser";
  const PROJECT_DIR = "/tmp/jfp-e2e-project";
  const FAKE_HOME = "/tmp/jfp-e2e-home";

  // Custom runCli for project-local tests that sets CWD to project directory
  async function runCliInProject(args: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const proc = Bun.spawn(["bun", `${PROJECT_ROOT}/jfp.ts`, ...args.split(" ")], {
        cwd: PROJECT_DIR,
        env: { ...process.env, HOME: FAKE_HOME },
      });

      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      return { stdout, stderr, exitCode };
    } catch (error) {
      return { stdout: "", stderr: String(error), exitCode: 1 };
    }
  }

  it("Step 1: Setup project directory", async () => {
    log("project-setup", `Creating project directory at ${PROJECT_DIR}`);

    // Create project directory with .claude/skills structure
    if (existsSync(PROJECT_DIR)) {
      rmSync(PROJECT_DIR, { recursive: true });
    }
    mkdirSync(join(PROJECT_DIR, ".claude", "skills"), { recursive: true });

    expect(existsSync(PROJECT_DIR)).toBe(true);
    expect(existsSync(join(PROJECT_DIR, ".claude", "skills"))).toBe(true);

    log("project-setup", "Project directory created");
  });

  it("Step 2: Install skill to personal location (default)", async () => {
    log("personal-install", `Installing ${PERSONAL_SKILL_ID} to personal location`);

    // Use runCli which sets HOME to FAKE_HOME
    const { stdout, exitCode } = await runCli(`install ${PERSONAL_SKILL_ID} --json`);

    expect(exitCode).toBe(0);

    const result = parseJson<{
      success: boolean;
      installed: string[];
      targetDir: string;
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.installed).toContain(PERSONAL_SKILL_ID);
    // Target should be personal location
    expect(result!.targetDir).toContain(".config/claude/skills");

    // Verify file exists
    const skillPath = join(FAKE_HOME, ".config/claude/skills", PERSONAL_SKILL_ID, "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);

    log("personal-install", `Installed to ${result!.targetDir}`);
  });

  it("Step 3: Install different skill to project location", async () => {
    log("project-install", `Installing ${PROJECT_SKILL_ID} to project location with --project`);

    // Use runCliInProject which runs from PROJECT_DIR
    const { stdout, exitCode } = await runCliInProject(`install ${PROJECT_SKILL_ID} --project --json`);

    expect(exitCode).toBe(0);

    const result = parseJson<{
      success: boolean;
      installed: string[];
      targetDir: string;
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.installed).toContain(PROJECT_SKILL_ID);
    // Target should be project-local location
    expect(result!.targetDir).toContain(".claude/skills");
    expect(result!.targetDir).not.toContain(".config");

    // Verify file exists in project directory
    const skillPath = join(PROJECT_DIR, ".claude/skills", PROJECT_SKILL_ID, "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);

    log("project-install", `Installed to ${result!.targetDir}`);
  });

  it("Step 4: List all installed skills (both locations)", async () => {
    log("list-all", "Listing all installed skills from both locations");

    const { stdout, exitCode } = await runCliInProject("installed --json");

    expect(exitCode).toBe(0);

    const result = parseJson<{
      installed: Array<{ id: string; location: "personal" | "project" }>;
      count: number;
      locations: { personal: string | null; project: string | null };
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.count).toBeGreaterThanOrEqual(2);

    // Find our installed skills
    const personalSkill = result!.installed.find(s => s.id === PERSONAL_SKILL_ID);
    const projectSkill = result!.installed.find(s => s.id === PROJECT_SKILL_ID);

    expect(personalSkill).toBeDefined();
    expect(personalSkill!.location).toBe("personal");

    expect(projectSkill).toBeDefined();
    expect(projectSkill!.location).toBe("project");

    // Both locations should be present
    expect(result!.locations.personal).not.toBeNull();
    expect(result!.locations.project).not.toBeNull();

    log("list-all", `Found ${result!.count} skills across both locations`);
  });

  it("Step 5: List only personal skills with --personal flag", async () => {
    log("list-personal", "Listing only personal skills with --personal flag");

    const { stdout, exitCode } = await runCliInProject("installed --personal --json");

    expect(exitCode).toBe(0);

    const result = parseJson<{
      installed: Array<{ id: string; location: "personal" | "project" }>;
      count: number;
      locations: { personal: string | null; project: string | null };
    }>(stdout);

    expect(result).not.toBeNull();

    // All skills should be in personal location
    for (const skill of result!.installed) {
      expect(skill.location).toBe("personal");
    }

    // Should include our personal skill
    const hasPersonalSkill = result!.installed.some(s => s.id === PERSONAL_SKILL_ID);
    expect(hasPersonalSkill).toBe(true);

    // Should NOT include the project skill
    const hasProjectSkill = result!.installed.some(s => s.id === PROJECT_SKILL_ID);
    expect(hasProjectSkill).toBe(false);

    // Project location should be null
    expect(result!.locations.project).toBeNull();

    log("list-personal", `Found ${result!.count} personal skills`);
  });

  it("Step 6: List only project skills with --project flag", async () => {
    log("list-project", "Listing only project skills with --project flag");

    const { stdout, exitCode } = await runCliInProject("installed --project --json");

    expect(exitCode).toBe(0);

    const result = parseJson<{
      installed: Array<{ id: string; location: "personal" | "project" }>;
      count: number;
      locations: { personal: string | null; project: string | null };
    }>(stdout);

    expect(result).not.toBeNull();

    // All skills should be in project location
    for (const skill of result!.installed) {
      expect(skill.location).toBe("project");
    }

    // Should include our project skill
    const hasProjectSkill = result!.installed.some(s => s.id === PROJECT_SKILL_ID);
    expect(hasProjectSkill).toBe(true);

    // Should NOT include the personal skill
    const hasPersonalSkill = result!.installed.some(s => s.id === PERSONAL_SKILL_ID);
    expect(hasPersonalSkill).toBe(false);

    // Personal location should be null
    expect(result!.locations.personal).toBeNull();

    log("list-project", `Found ${result!.count} project skills`);
  });

  it("Step 7: Uninstall project skill with --project flag", async () => {
    log("uninstall-project", `Uninstalling ${PROJECT_SKILL_ID} from project location`);

    const { stdout, exitCode } = await runCliInProject(`uninstall ${PROJECT_SKILL_ID} --project --confirm --json`);

    expect(exitCode).toBe(0);

    const result = parseJson<{
      success: boolean;
      removed: string[];
      targetDir: string;
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.removed).toContain(PROJECT_SKILL_ID);

    // Verify file is removed from project directory
    const skillPath = join(PROJECT_DIR, ".claude/skills", PROJECT_SKILL_ID, "SKILL.md");
    expect(existsSync(skillPath)).toBe(false);

    log("uninstall-project", `Uninstalled from ${result!.targetDir}`);
  });

  it("Step 8: Verify personal skill still exists after project uninstall", async () => {
    log("verify-personal", "Verifying personal skill is unaffected");

    // Check installed --personal still shows our skill
    const { stdout, exitCode } = await runCli("installed --personal --json");

    expect(exitCode).toBe(0);

    const result = parseJson<{
      installed: Array<{ id: string; location: string }>;
    }>(stdout);

    expect(result).not.toBeNull();

    const hasPersonalSkill = result!.installed.some(s => s.id === PERSONAL_SKILL_ID);
    expect(hasPersonalSkill).toBe(true);

    // Verify file still exists
    const skillPath = join(FAKE_HOME, ".config/claude/skills", PERSONAL_SKILL_ID, "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);

    log("verify-personal", "Personal skill confirmed intact");
  });

  it("Step 9: Cleanup - uninstall personal skill", async () => {
    log("cleanup", `Cleaning up - uninstalling ${PERSONAL_SKILL_ID} from personal`);

    const { stdout, exitCode } = await runCli(`uninstall ${PERSONAL_SKILL_ID} --confirm --json`);

    expect(exitCode).toBe(0);

    const result = parseJson<{
      success: boolean;
      removed: string[];
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
    expect(result!.removed).toContain(PERSONAL_SKILL_ID);

    // Cleanup project directory
    if (existsSync(PROJECT_DIR)) {
      rmSync(PROJECT_DIR, { recursive: true });
    }

    log("cleanup", "All test skills uninstalled and project directory removed");
  });
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
    const result = parseJson<{ prompts: unknown[]; count: number }>(stdout);
    expect(result).not.toBeNull();
    expect(Array.isArray(result!.prompts)).toBe(true);

    log("tty-pipe", "Piped output correctly defaults to JSON");
  });

  it("--json flag produces JSON regardless of context", async () => {
    log("tty-json-flag", "Testing --json flag explicitly produces JSON");

    const { stdout, exitCode } = await runCli("list --json");

    expect(exitCode).toBe(0);

    // Should definitely be JSON with explicit flag - wrapped response
    const result = parseJson<{ prompts: unknown[]; count: number }>(stdout);
    expect(result).not.toBeNull();
    expect(Array.isArray(result!.prompts)).toBe(true);

    log("tty-json-flag", "Explicit --json produces valid JSON");
  });

  it("show command outputs JSON in piped mode", async () => {
    log("tty-show", "Testing show command in piped mode");

    const { stdout, exitCode } = await runCli("show idea-wizard");

    expect(exitCode).toBe(0);

    // Should be JSON object
    const result = parseJson<{ id: string; content: string }>(stdout);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("idea-wizard");
    expect(typeof result!.content).toBe("string");

    log("tty-show", "Show command outputs JSON in piped mode");
  });

  it("search command outputs JSON in piped mode", async () => {
    log("tty-search", "Testing search command in piped mode");

    const { stdout, exitCode } = await runCli("search wizard");

    expect(exitCode).toBe(0);

    // Should be wrapped JSON with results array
    const result = parseJson<{ results: unknown[]; query: string; authenticated: boolean }>(stdout);
    expect(result).not.toBeNull();
    expect(Array.isArray(result!.results)).toBe(true);

    log("tty-search", "Search command outputs JSON in piped mode");
  });

  it("help command outputs JSON in piped mode", async () => {
    log("tty-help", "Testing help command in piped mode");

    const { stdout, exitCode } = await runCli("help");

    expect(exitCode).toBe(0);

    // Should be JSON with help structure
    const result = parseJson<{ name: string; commands: Record<string, unknown> }>(stdout);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("jfp");
    expect(result!.commands).toBeDefined();

    log("tty-help", "Help command outputs JSON in piped mode");
  });

  it("error output is JSON in piped mode", async () => {
    log("tty-error", "Testing error output in piped mode");

    const { stdout, exitCode } = await runCli("show nonexistent-prompt");

    expect(exitCode).toBe(1);

    // Error should be JSON
    const result = parseJson<{ error: string; message?: string }>(stdout);
    expect(result).not.toBeNull();
    expect(result!.error).toBe("not_found");

    log("tty-error", "Error output is JSON in piped mode");
  });

  it("categories command requires --json flag for JSON output", async () => {
    log("tty-categories", "Testing categories command with --json flag");

    // categories uses options.json directly, not shouldOutputJson
    // So it requires explicit --json flag
    const { stdout, exitCode } = await runCli("categories --json");

    expect(exitCode).toBe(0);

    // Should be JSON array of categories
    const result = parseJson<{ name: string; count: number }[]>(stdout);
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    expect(result!.length).toBeGreaterThan(0);

    log("tty-categories", "Categories outputs JSON with --json flag");
  });

  it("tags command requires --json flag for JSON output", async () => {
    log("tty-tags", "Testing tags command with --json flag");

    // tags uses options.json directly, not shouldOutputJson
    // So it requires explicit --json flag
    const { stdout, exitCode } = await runCli("tags --json");

    expect(exitCode).toBe(0);

    // Should be JSON array of tags
    const result = parseJson<{ name: string; count: number }[]>(stdout);
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    expect(result!.length).toBeGreaterThan(0);

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

    const result = parseJson<{ error: string }>(stdout);
    expect(result).not.toBeNull();
    expect(result!.error).toBeDefined();

    log("invalid-show", "Non-existent prompt handled correctly");
  });

  it("install command with non-existent prompt ID", async () => {
    log("invalid-install", "Testing install with non-existent prompt ID");

    const { stdout, exitCode } = await runCli("install fake-nonexistent-prompt --json");

    // Should fail with error
    expect(exitCode).not.toBe(0);

    const result = parseJson<{
      success: boolean;
      failed: string[];
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(false);
    expect(result!.failed).toContain("fake-nonexistent-prompt");

    log("invalid-install", "Non-existent prompt install handled correctly");
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
    const response = parseJson<{ results: Array<{ id: string }>; query: string; authenticated: boolean }>(stdout);

    expect(response).not.toBeNull();
    expect(response!.results.length).toBe(0);

    log("no-results-search", "No results handled correctly");
  });

  it("uninstall with invalid skill ID format", async () => {
    log("invalid-uninstall-id", "Testing uninstall with invalid ID format");

    // IDs with invalid characters should be rejected
    const { stdout, stderr, exitCode } = await runCli("uninstall ../../../etc/passwd --confirm --json");

    // Should fail with exit code indicating invalid ID
    expect(exitCode).not.toBe(0);

    log("invalid-uninstall-id", "Invalid ID format rejected");
  });

  it("copy command with non-existent prompt ID", async () => {
    log("invalid-copy", "Testing copy with non-existent prompt ID");

    const { stdout, exitCode } = await runCli("copy fake-nonexistent-prompt --json");

    // Should fail gracefully
    expect(exitCode).not.toBe(0);

    log("invalid-copy", "Non-existent prompt copy handled correctly");
  });

  it("installed command with no skills installed", async () => {
    log("empty-installed", "Testing installed command with clean state");

    // Use a fresh home directory with no skills
    const freshHome = "/tmp/jfp-e2e-fresh-home";
    if (existsSync(freshHome)) {
      rmSync(freshHome, { recursive: true });
    }
    mkdirSync(join(freshHome, ".config", "claude", "skills"), { recursive: true });

    try {
      const proc = Bun.spawn(["bun", `${PROJECT_ROOT}/jfp.ts`, "installed", "--json"], {
        cwd: PROJECT_ROOT,
        env: { ...process.env, HOME: freshHome },
      });

      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      expect(exitCode).toBe(0);

      const result = parseJson<{
        installed: Array<{ id: string }>;
        count: number;
      }>(stdout);

      expect(result).not.toBeNull();
      expect(result!.count).toBe(0);
      expect(result!.installed).toEqual([]);

      log("empty-installed", "Empty installed list handled correctly");
    } finally {
      rmSync(freshHome, { recursive: true, force: true });
    }
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
      const response = parseJson<{ results: Array<{ id: string }>; query: string; authenticated: boolean }>(stdout);

      expect(response).not.toBeNull();
      // Should not crash, just return 0 or some results
      expect(response!.results.length).toBeGreaterThanOrEqual(0);

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

  it("multiple invalid prompt IDs in install command", async () => {
    log("multi-invalid", "Testing install with multiple non-existent IDs");

    const { stdout, exitCode } = await runCli("install fake-id-1 fake-id-2 fake-id-3 --json");

    expect(exitCode).not.toBe(0);

    const result = parseJson<{
      success: boolean;
      installed: string[];
      failed: string[];
    }>(stdout);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(false);
    expect(result!.failed).toContain("fake-id-1");
    expect(result!.failed).toContain("fake-id-2");
    expect(result!.failed).toContain("fake-id-3");
    expect(result!.installed).toEqual([]);

    log("multi-invalid", "Multiple invalid IDs handled correctly");
  });
});
