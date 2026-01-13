/**
 * Real filesystem tests for skill commands (install, uninstall, installed, update)
 *
 * Uses actual temp directories instead of mocking fs modules.
 * Set JFP_HOME env var to redirect config/skill paths to temp directory.
 */
import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";

// Test helpers
let testDir: string;
let originalJfpHome: string | undefined;
let originalCwd: string;

let output: string[] = [];
let errors: string[] = [];
let warnings: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalExit = process.exit;

// Create temp directory and set JFP_HOME before importing commands
beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "jfp-skills-test-"));
  originalJfpHome = process.env.JFP_HOME;
  originalCwd = process.cwd();
  process.env.JFP_HOME = testDir;
});

afterAll(() => {
  // Restore env
  if (originalJfpHome === undefined) {
    delete process.env.JFP_HOME;
  } else {
    process.env.JFP_HOME = originalJfpHome;
  }

  // Cleanup temp directory
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch (e) {
    console.error("Failed to cleanup test dir:", e);
  }
});

// Dynamically import commands after setting JFP_HOME
const { installCommand } = await import("../../src/commands/install");
const { uninstallCommand } = await import("../../src/commands/uninstall");
const { installedCommand } = await import("../../src/commands/installed");
const { updateCommand } = await import("../../src/commands/update");

function getPersonalSkillsDir(): string {
  return join(testDir, ".config", "claude", "skills");
}

function getProjectSkillsDir(): string {
  return join(process.cwd(), ".claude", "skills");
}

function writeManifest(dir: string, entries: Array<Record<string, string>>) {
  const manifest = {
    generatedAt: "2026-01-01T00:00:00.000Z",
    jfpVersion: "1.0.0",
    entries,
  };
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest));
}

beforeEach(() => {
  output = [];
  errors = [];
  warnings = [];
  exitCode = undefined;

  // Clean up skills directories before each test
  const personalDir = getPersonalSkillsDir();
  const projectDir = getProjectSkillsDir();

  try {
    rmSync(personalDir, { recursive: true, force: true });
  } catch {}
  try {
    rmSync(projectDir, { recursive: true, force: true });
  } catch {}

  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.join(" "));
  };
  console.warn = (...args: unknown[]) => {
    warnings.push(args.join(" "));
  };
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error("process.exit");
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
  process.exit = originalExit;
});

describe("installCommand", () => {
  it("installs a prompt and outputs JSON", async () => {
    await installCommand(["idea-wizard"], { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.installed).toContain("idea-wizard");
    expect(payload.failed.length).toBe(0);
    expect(payload.targetDir).toContain(".config/claude/skills");

    const skillPath = join(getPersonalSkillsDir(), "idea-wizard", "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);

    const content = readFileSync(skillPath, "utf-8");
    expect(content).toContain("name: idea-wizard");
    expect(content).toContain("x_jfp_generated: true");
  });

  it("installs multiple prompts", async () => {
    await installCommand(["idea-wizard", "readme-reviser"], { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.installed).toContain("idea-wizard");
    expect(payload.installed).toContain("readme-reviser");
    expect(payload.failed.length).toBe(0);

    expect(existsSync(join(getPersonalSkillsDir(), "idea-wizard", "SKILL.md"))).toBe(true);
    expect(existsSync(join(getPersonalSkillsDir(), "readme-reviser", "SKILL.md"))).toBe(true);
  });

  it("exits when no ids are provided", async () => {
    try {
      await installCommand([], { json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit") throw e;
    }
    expect(errors.join("\n")).toContain("No prompts specified");
    expect(exitCode).toBe(1);
  });

  it("creates manifest.json with skill metadata", async () => {
    await installCommand(["idea-wizard"], { json: true });

    const manifestPath = join(getPersonalSkillsDir(), "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.entries.length).toBe(1);
    expect(manifest.entries[0].id).toBe("idea-wizard");
    expect(manifest.entries[0].kind).toBe("prompt");
    expect(manifest.entries[0]).toHaveProperty("hash");
    expect(manifest.entries[0]).toHaveProperty("version");
  });
});

describe("uninstallCommand", () => {
  it("removes a skill and outputs JSON", async () => {
    // First install a skill
    await installCommand(["idea-wizard"], { json: true });
    output = [];

    // Verify it exists
    const skillPath = join(getPersonalSkillsDir(), "idea-wizard", "SKILL.md");
    expect(existsSync(skillPath)).toBe(true);

    // Now uninstall it
    await uninstallCommand(["idea-wizard"], { json: true, confirm: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.removed).toContain("idea-wizard");

    // Verify it's gone
    expect(existsSync(skillPath)).toBe(false);
  });

  it("updates manifest after uninstall", async () => {
    // Install two skills
    await installCommand(["idea-wizard", "readme-reviser"], { json: true });
    output = [];

    // Uninstall one
    await uninstallCommand(["idea-wizard"], { json: true, confirm: true });

    // Verify manifest only has one entry
    const manifestPath = join(getPersonalSkillsDir(), "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.entries.length).toBe(1);
    expect(manifest.entries[0].id).toBe("readme-reviser");
  });
});

describe("installedCommand", () => {
  it("lists installed skills", async () => {
    // Install some skills first
    await installCommand(["idea-wizard", "readme-reviser"], { json: true });
    output = [];

    await installedCommand({ json: true });
    const payload = JSON.parse(output.join(""));

    expect(payload.installed.length).toBe(2);
    expect(payload.installed.map((s: { id: string }) => s.id)).toContain("idea-wizard");
    expect(payload.installed.map((s: { id: string }) => s.id)).toContain("readme-reviser");
  });

  it("shows empty list when no skills installed", async () => {
    await installedCommand({ json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.installed.length).toBe(0);
  });

  it("includes location information", async () => {
    await installCommand(["idea-wizard"], { json: true });
    output = [];

    await installedCommand({ json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.locations).toHaveProperty("personal");
    expect(payload.locations.personal).toContain(".config/claude/skills");
  });
});

describe("updateCommand", () => {
  it("detects outdated skills in dry-run", async () => {
    // Install a skill
    await installCommand(["idea-wizard"], { json: true });

    // Modify the manifest to have an old hash (simulating outdated skill)
    const manifestPath = join(getPersonalSkillsDir(), "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    manifest.entries[0].hash = "old-fake-hash";
    writeFileSync(manifestPath, JSON.stringify(manifest));

    output = [];

    // Run update in dry-run mode with force to bypass user modification check
    await updateCommand({ json: true, dryRun: true, personal: true, force: true });
    const payload = JSON.parse(output.join(""));

    expect(payload.dryRun).toBe(true);
    expect(payload.updated.length).toBeGreaterThan(0);
    expect(payload.updated[0].id).toBe("idea-wizard");
  });

  it("actually updates skill when not in dry-run with force", async () => {
    // Install a skill
    await installCommand(["idea-wizard"], { json: true });

    // Modify the content to simulate an older version
    const skillPath = join(getPersonalSkillsDir(), "idea-wizard", "SKILL.md");
    writeFileSync(skillPath, "---\nx_jfp_generated: true\n---\nOld content");

    // Modify manifest hash
    const manifestPath = join(getPersonalSkillsDir(), "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    manifest.entries[0].hash = "old-fake-hash";
    writeFileSync(manifestPath, JSON.stringify(manifest));

    output = [];

    // Run actual update with force
    await updateCommand({ json: true, force: true, personal: true });
    const payload = JSON.parse(output.join(""));

    expect(payload.updated.length).toBeGreaterThan(0);

    // Verify content was updated
    const newContent = readFileSync(skillPath, "utf-8");
    expect(newContent).toContain("The Idea Wizard");
    expect(newContent).not.toContain("Old content");
  });
});
