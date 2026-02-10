/**
 * Tests for sync command — status and sync operations
 *
 * Uses mocked fetch and temp directories for offline library.
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";

let testDir: string;
let originalJfpHome: string | undefined;

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

let syncCommand: typeof import("../../src/commands/sync").syncCommand;

beforeAll(async () => {
  testDir = mkdtempSync(join(tmpdir(), "jfp-sync-test-"));
  originalJfpHome = process.env.JFP_HOME;
  process.env.JFP_HOME = testDir;

  const mod = await import("../../src/commands/sync");
  syncCommand = mod.syncCommand;
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
});

describe("syncCommand", () => {
  it("shows status in JSON mode (never synced)", async () => {
    await syncCommand({ status: true, json: true });
    expect(exitCode).toBeUndefined();
    const json = JSON.parse(output.join(""));
    expect(json.synced).toBe(false);
    expect(json.lastSync).toBeNull();
    expect(json.promptCount).toBe(0);
  });

  it("requires authentication for sync", async () => {
    // Without credentials, sync should fail
    try {
      await syncCommand({ json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit(1)") throw e;
    }
    expect(exitCode).toBe(1);
    const json = JSON.parse(output.join(""));
    expect(json.error).toBe(true);
    expect(json.code).toBe("not_authenticated");
  });
});
