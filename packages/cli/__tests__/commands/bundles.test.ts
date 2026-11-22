import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { bundlesCommand, bundleShowCommand } from "../../src/commands/bundles";

// Capture console output
let consoleOutput: string[] = [];
const originalLog = console.log;
const originalWrite = process.stdout.write;
const originalError = console.error;

beforeEach(() => {
  consoleOutput = [];
  console.log = (...args: unknown[]) => {
    consoleOutput.push(args.map(String).join(" "));
  };
  process.stdout.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ) => {
    consoleOutput.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
    const done = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    done?.(null);
    return true;
  }) as typeof process.stdout.write;
  console.error = (...args: unknown[]) => {
    consoleOutput.push(args.map(String).join(" "));
  };
});

afterEach(() => {
  console.log = originalLog;
  process.stdout.write = originalWrite;
  console.error = originalError;
});

describe("bundlesCommand", () => {
  it("outputs JSON with --json flag", async () => {
    await bundlesCommand({ json: true });
    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it("JSON output includes expected fields", async () => {
    await bundlesCommand({ json: true });
    const parsed = JSON.parse(consoleOutput.join("\n"));
    const first = parsed[0];
    expect(typeof first.id).toBe("string");
    expect(typeof first.title).toBe("string");
    expect(typeof first.description).toBe("string");
    expect(typeof first.promptCount).toBe("number");
    expect(typeof first.featured).toBe("boolean");
  });

  it("lists bundles in human-readable format", async () => {
    await bundlesCommand({});
    const output = consoleOutput.join("\n");
    expect(output.length).toBeGreaterThan(0);
    // Human output uses cli-table3 which contains bundle IDs
    expect(output).toContain("getting-started");
  });
});

describe("bundleShowCommand", () => {
  it("outputs JSON for known bundle with --json", async () => {
    // Get available bundles first
    await bundlesCommand({ json: true });
    const bundles = JSON.parse(consoleOutput.join("\n"));
    consoleOutput = [];

    const firstId = bundles[0].id;
    await bundleShowCommand(firstId, { json: true });
    const detail = JSON.parse(consoleOutput.join("\n"));

    expect(detail.id).toBe(firstId);
    expect(detail.title).toBeDefined();
    expect(Array.isArray(detail.prompts)).toBe(true);
  });

  it("JSON detail includes prompt objects", async () => {
    await bundlesCommand({ json: true });
    const bundles = JSON.parse(consoleOutput.join("\n"));
    consoleOutput = [];

    const firstId = bundles[0].id;
    await bundleShowCommand(firstId, { json: true });
    const detail = JSON.parse(consoleOutput.join("\n"));

    if (detail.prompts.length > 0) {
      const prompt = detail.prompts[0];
      expect(typeof prompt.id).toBe("string");
      expect(typeof prompt.title).toBe("string");
      expect(typeof prompt.category).toBe("string");
    }
  });

  it("exits with error for unknown bundle", async () => {
    const originalExit = process.exit;
    let exitCode: number | undefined;
    process.exit = ((code: number) => {
      exitCode = code;
      throw new Error("process.exit called");
    }) as never;

    try {
      await bundleShowCommand("nonexistent-bundle-xyz", { json: true });
    } catch {
      // Expected
    }

    expect(exitCode).toBe(1);
    const output = consoleOutput.join("\n");
    expect(output).toContain("not_found");
    process.exit = originalExit;
  });

  it("shows human-readable detail for known bundle", async () => {
    await bundlesCommand({ json: true });
    const bundles = JSON.parse(consoleOutput.join("\n"));
    consoleOutput = [];

    const firstId = bundles[0].id;
    await bundleShowCommand(firstId, {});
    const output = consoleOutput.join("\n");

    expect(output.length).toBeGreaterThan(0);
  });
});
