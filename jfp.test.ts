import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";

const JFP_PATH = resolve("./jfp.ts");
const TEST_DIR = mkdtempSync(join(tmpdir(), "jfp-test-"));

// Helper to run jfp command
async function runJfp(args: string[], cwd = process.cwd()) {
  const proc = spawn(["bun", "run", JFP_PATH, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  
  return { stdout, stderr, exitCode };
}

describe("CLI (jfp)", () => {
  afterAll(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch (e) {
      console.error("Failed to cleanup test dir:", e);
    }
  });

  it("should show help when run with --help", async () => {
    const { stdout, exitCode } = await runJfp(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Usage:");
    expect(stdout).toContain("jfp install");
  });

  it("should list prompts", async () => {
    const { stdout, exitCode } = await runJfp(["list"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("idea-wizard");
    expect(stdout).toContain("readme-reviser");
  });

  it("should show a prompt", async () => {
    const { stdout, stderr, exitCode } = await runJfp(["show", "idea-wizard"]);
    if (stdout.startsWith("{")) {
        console.log("DEBUG STDERR:", stderr);
        console.log("DEBUG STDOUT:", stdout);
    }
    expect(exitCode).toBe(0);
    expect(stdout).toContain("The Idea Wizard");
    expect(stdout).toContain("Category: ideation");
  });

  it("should fail showing non-existent prompt", async () => {
    const { stdout, stderr, exitCode } = await runJfp(["show", "does-not-exist"]);
    expect(exitCode).toBe(1);
    
    // Check for either text error (stderr) or JSON error (stdout)
    const hasTextError = stderr.includes("Prompt not found");
    const hasJsonError = stdout.includes('"error": "not_found"') || stdout.includes('"error":"not_found"');
    
    expect(hasTextError || hasJsonError).toBe(true);
  });

  it("should search prompts", async () => {
    const { stdout, exitCode } = await runJfp(["search", "idea"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("idea-wizard");
  });

  it("should install help works", async () => {
    const { stdout, exitCode } = await runJfp(["install", "--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("--all");
    expect(stdout).toContain("--project");
  });
  
  it("should output JSON when requested", async () => {
     const { stdout, exitCode } = await runJfp(["list", "--json"]);
     expect(exitCode).toBe(0);
     const data = JSON.parse(stdout);
     expect(Array.isArray(data)).toBe(true);
     expect(data[0]).toHaveProperty("id");
  });

  it("should install a prompt to a custom project directory", async () => {
    // Run install in the temp directory with --project flag
    const { stdout, exitCode } = await runJfp(["install", "idea-wizard", "--project"], TEST_DIR);
    
    expect(exitCode).toBe(0);
    
    const skillFile = join(TEST_DIR, ".claude/skills/idea-wizard/SKILL.md");
    expect(existsSync(skillFile)).toBe(true);
    
    const content = readFileSync(skillFile, "utf-8");
    expect(content).toContain("name: idea-wizard");
    expect(content).toContain("The Idea Wizard");
  });
});
