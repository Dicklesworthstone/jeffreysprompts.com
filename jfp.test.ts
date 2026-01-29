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

function parseJson<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON output: ${message}`);
  }
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
    expect(stdout).toContain("jfp list");
    expect(stdout).toContain("jfp export");
  });

  it("should list prompts", async () => {
    const { stdout, exitCode } = await runJfp(["list"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("idea-wizard");
    expect(stdout).toContain("readme-reviser");
  });

  it("should show a prompt", async () => {
    const { stdout, exitCode } = await runJfp(["show", "idea-wizard"]);
    expect(exitCode).toBe(0);
    // In non-TTY mode (piped), CLI outputs JSON
    if (stdout.startsWith("{")) {
      const data = parseJson<{ title: string; category: string }>(stdout);
      expect(data.title).toBe("The Idea Wizard");
      expect(data.category).toBe("ideation");
    } else {
      // TTY mode outputs formatted text
      expect(stdout).toContain("The Idea Wizard");
      expect(stdout).toContain("Category: ideation");
    }
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

  it("should reject deprecated install command", async () => {
    const { stdout, stderr, exitCode } = await runJfp(["install"]);
    expect(exitCode).toBe(1);
    const output = `${stdout}${stderr}`;
    expect(output).toContain("moved to jsm");
  });
  
  it("should output JSON when requested", async () => {
     const { stdout, exitCode } = await runJfp(["list", "--json"]);
     expect(exitCode).toBe(0);
     const data = parseJson<{ prompts: Array<{ id: string }> }>(stdout);
     // list --json outputs { prompts: [...], count: N }
     expect(data).toHaveProperty("prompts");
     expect(Array.isArray(data.prompts)).toBe(true);
     expect(data.prompts[0]).toHaveProperty("id");
  });

  it("should export a prompt to a custom directory", async () => {
    const outputDir = join(TEST_DIR, "exports");
    const { stdout, exitCode } = await runJfp(
      ["export", "idea-wizard", "--output-dir", outputDir, "--json"],
      TEST_DIR
    );

    expect(exitCode).toBe(0);
    const data = parseJson<{ exported: Array<{ file: string }> }>(stdout);
    const file = data.exported[0].file;
    expect(existsSync(file)).toBe(true);

    const content = readFileSync(file, "utf-8");
    expect(content).toContain("# The Idea Wizard");
  }, 10000);
});
