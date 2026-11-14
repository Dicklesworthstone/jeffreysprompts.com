import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
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

  describe.skipIf(process.platform === "win32")("piped JSON output", () => {
    const pipeHome = join(TEST_DIR, "pipe-home");
    const configDir = join(pipeHome, ".config", "jfp");
    const binary = join(TEST_DIR, "jfp-pipe-test");
    const prompt = {
      id: "pipe-regression",
      title: "Pipe regression",
      description: "Large Unicode payload for stdout backpressure",
      category: "testing",
      tags: ["testing"],
      author: "JFP test",
      version: "1.0.0",
      created: "2026-01-01",
      content: "é🚀漢字".repeat(160_000) + "END-OF-PROMPT",
    };
    const expected = Buffer.from(JSON.stringify({ prompts: [prompt], count: 1 }) + "\n");
    const env = {
      ...process.env,
      JFP_HOME: pipeHome,
      XDG_CONFIG_HOME: join(pipeHome, ".config"),
      XDG_DATA_HOME: join(pipeHome, ".local", "share"),
      JFP_TOKEN: "",
      JFP_REGISTRY_URL: "http://127.0.0.1:1/unused",
      JFP_TEST_BUN: process.execPath,
      NO_COLOR: "1",
    };

    beforeAll(async () => {
      mkdirSync(configDir, { recursive: true });
      writeFileSync(join(configDir, "config.json"), JSON.stringify({
        registry: { autoRefresh: false },
        updates: { autoCheck: false },
        localPrompts: { enabled: false },
      }));
      writeFileSync(join(configDir, "registry.json"), JSON.stringify({ prompts: [prompt] }));
      writeFileSync(join(configDir, "registry.meta.json"), JSON.stringify({
        version: "pipe-regression",
        fetchedAt: new Date().toISOString(),
        etag: null,
        promptCount: 1,
      }));

      const build = spawn([
        process.execPath, "build", "--compile", JFP_PATH, "--outfile", binary,
      ], { stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(build.stdout).text(),
        new Response(build.stderr).text(),
        build.exited,
      ]);
      if (exitCode !== 0) {
        throw new Error(`Failed to compile CLI for pipe regression: ${stdout}\n${stderr}`);
      }
    }, 60000);

    async function runPipe(command: string[], reader: string, outputPath: string) {
      // Bash creates a real OS pipe. Delaying a Bun.spawn stream reader alone
      // can still let Bun eagerly drain the producer and hide backpressure.
      const proc = spawn([
        "bash", "-o", "pipefail", "-c",
        '"$@" | "$JFP_TEST_BUN" --eval "$JFP_TEST_READER"',
        "jfp-pipe-test", ...command,
      ], {
        env: { ...env, JFP_TEST_READER: reader, JFP_TEST_OUTPUT: outputPath },
        stdin: "ignore",
        stdout: "ignore",
        stderr: "pipe",
      });
      const [stderr, exitCode] = await Promise.all([
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      return { stderr, exitCode };
    }

    for (const [name, command] of [
      ["source", [process.execPath, JFP_PATH]],
      ["compiled", [binary]],
    ] as const) {
      for (const json of [false, true]) {
        it(`preserves all ${name} JSON bytes with a slow reader (json=${json})`, async () => {
          const outputPath = join(pipeHome, `${name}-${json}.json`);
          const { stderr, exitCode } = await runPipe(
            [...command, "list", ...(json ? ["--json"] : [])],
            `
              import { readSync, writeFileSync } from "node:fs";
              const chunks = [];
              const buffer = Buffer.alloc(4096);
              await Bun.sleep(100);
              for (;;) {
                const bytes = readSync(0, buffer, 0, buffer.length, null);
                if (bytes === 0) break;
                chunks.push(Buffer.from(buffer.subarray(0, bytes)));
                await Bun.sleep(1);
              }
              writeFileSync(process.env.JFP_TEST_OUTPUT, Buffer.concat(chunks));
            `,
            outputPath
          );
          expect(stderr).toBe("");
          expect(exitCode).toBe(0);
          const output = readFileSync(outputPath);
          expect(output.byteLength).toBe(expected.byteLength);
          expect(output.equals(expected)).toBe(true);
          const data = parseJson<{ prompts: Array<{ content: string }>; count: number }>(
            output.toString("utf-8")
          );
          expect(data.count).toBe(1);
          expect(data.prompts[0].content).toBe(prompt.content);
        }, 30000);
      }

      it(`fails when the ${name} output pipe closes early`, async () => {
        const outputPath = join(pipeHome, `${name}-closed-pipe.txt`);
        const { exitCode } = await runPipe(
          [...command, "list", "--json"],
          `
            import { readSync, writeFileSync } from "node:fs";
            const firstByte = Buffer.alloc(1);
            if (readSync(0, firstByte, 0, 1, null) !== 1) {
              throw new Error("Expected CLI output before closing the pipe");
            }
            writeFileSync(process.env.JFP_TEST_OUTPUT, firstByte);
          `,
          outputPath
        );
        expect(readFileSync(outputPath, "utf-8")).toBe("{");
        expect(exitCode).not.toBe(0);
      }, 30000);
    }
  });

});
