
import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from "bun:test";
import { join } from "path";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";

// Test helpers
let testDir: string;
let originalJfpHome: string | undefined;

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

// Create temp directory and set JFP_HOME before importing commands
beforeAll(() => {
  testDir = mkdtempSync(join(tmpdir(), "jfp-config-test-"));
  originalJfpHome = process.env.JFP_HOME;
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
const { configSetCommand, configGetCommand, configListCommand, configResetCommand } = await import("../../src/commands/config");
const { loadConfig } = await import("../../src/lib/config");

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

describe("config commands", () => {
  it("sets a boolean value", async () => {
    await configSetCommand("updates.autoCheck", "false", { json: true });
    
    expect(exitCode).toBeUndefined();
    const result = JSON.parse(output.join(""));
    expect(result.success).toBe(true);
    expect(result.value).toBe(false);

    const config = loadConfig();
    expect(config.updates.autoCheck).toBe(false);
  });

  it("sets a number value", async () => {
    await configSetCommand("registry.timeoutMs", "5000", { json: true });

    expect(exitCode).toBeUndefined();
    const result = JSON.parse(output.join(""));
    expect(result.success).toBe(true);
    expect(result.value).toBe(5000);

    const config = loadConfig();
    expect(config.registry.timeoutMs).toBe(5000);
  });

  it("sets a string value", async () => {
    await configSetCommand("registry.remote", "https://example.com", { json: true });

    expect(exitCode).toBeUndefined();
    const result = JSON.parse(output.join(""));
    expect(result.success).toBe(true);
    expect(result.value).toBe("https://example.com");

    const config = loadConfig();
    expect(config.registry.remote).toBe("https://example.com");
  });

  it("gets a value", async () => {
    await configSetCommand("registry.timeoutMs", "1234", { json: true });
    output = [];
    
    await configGetCommand("registry.timeoutMs", { json: true });
    
    const result = JSON.parse(output.join(""));
    expect(result.value).toBe(1234);
  });

  it("fails on unknown key", async () => {
    try {
      await configSetCommand("invalid.key", "foo", { json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit(1)") throw e;
    }
    
    expect(exitCode).toBe(1);
    const result = JSON.parse(output.join(""));
    expect(result.error).toBe(true);
    expect(result.code).toBe("invalid_key");
  });

  it("resets config", async () => {
    await configSetCommand("registry.timeoutMs", "9999", { json: true });
    output = [];
    
    await configResetCommand({ json: true });
    
    expect(exitCode).toBeUndefined();
    const result = JSON.parse(output.join(""));
    expect(result.reset).toBe(true);
    
    const config = loadConfig();
    expect(config.registry.timeoutMs).toBe(2000); // Default value
  });
  
  it("ambiguous type handling", async () => {
    // registry.remote is a string. If we set it to "true", it should remain a string.
    await configSetCommand("registry.remote", "true", { json: true });
    
    const result = JSON.parse(output.join(""));
    // Fixed behavior: preserves string type
    expect(result.value).toBe("true"); 
    
    const config = loadConfig();
    expect(config.registry.remote).toBe("true"); 
  });
});
