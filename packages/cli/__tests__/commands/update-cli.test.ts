/**
 * Tests for update-cli command — version check logic
 *
 * Tests the check-only mode and version comparison.
 * Does not test actual binary download/replacement.
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";

let testDir: string;
let originalJfpHome: string | undefined;

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;
let originalFetch: typeof fetch | undefined;

let updateCliCommand: typeof import("../../src/commands/update-cli").updateCliCommand;
let cliVersion: string;

beforeAll(async () => {
  testDir = mkdtempSync(join(tmpdir(), "jfp-update-test-"));
  originalJfpHome = process.env.JFP_HOME;
  process.env.JFP_HOME = testDir;

  const mod = await import("../../src/commands/update-cli");
  updateCliCommand = mod.updateCliCommand;

  const pkg = await import("../../package.json");
  cliVersion = pkg.version;
});

afterAll(() => {
  if (originalJfpHome === undefined) {
    delete process.env.JFP_HOME;
  } else {
    process.env.JFP_HOME = originalJfpHome;
  }
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch { /* ignore */ }
});

beforeEach(() => {
  output = [];
  errors = [];
  exitCode = undefined;
  originalFetch = globalThis.fetch;

  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.join(" "));
  };
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`process.exit(${code})`);
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
  if (originalFetch) globalThis.fetch = originalFetch;
});

describe("updateCliCommand", () => {
  it("reports no update when current version matches (JSON)", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ tag_name: `v${cliVersion}`, assets: [] }),
        { status: 200 }
      )) as typeof fetch;

    await updateCliCommand({ check: true, json: true });
    expect(exitCode).toBeUndefined();
    const json = JSON.parse(output.join(""));
    expect(json.hasUpdate).toBe(false);
    expect(json.currentVersion).toBe(cliVersion);
  });

  it("detects newer version (JSON)", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          tag_name: "v99.99.99",
          assets: [
            { name: "jfp-linux-x64", browser_download_url: "https://example.com/jfp" },
            { name: "jfp-linux-x64.sha256", browser_download_url: "https://example.com/jfp.sha256" },
          ],
        }),
        { status: 200 }
      )) as typeof fetch;

    await updateCliCommand({ check: true, json: true });
    expect(exitCode).toBeUndefined();
    const json = JSON.parse(output.join(""));
    expect(json.hasUpdate).toBe(true);
    expect(json.latestVersion).toBe("99.99.99");
  });

  it("handles network error gracefully (JSON)", async () => {
    globalThis.fetch = (async () => {
      throw new Error("Network error");
    }) as typeof fetch;

    try {
      await updateCliCommand({ check: true, json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit(1)") throw e;
    }
    expect(exitCode).toBe(1);
    const allOutput = output.join("");
    const json = JSON.parse(allOutput);
    expect(json.error).toBeDefined();
  });
});
