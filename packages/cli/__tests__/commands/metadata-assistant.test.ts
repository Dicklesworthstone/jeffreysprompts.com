import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { tagsSuggestCommand, dedupeScanCommand } from "../../src/commands/utilities";
import { saveCredentials } from "../../src/lib/credentials";
import { tmpdir } from "os";
import { join } from "path";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;
const originalEnv = {
  HOME: process.env.HOME,
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  JFP_TOKEN: process.env.JFP_TOKEN,
};

function parseJson<T = Record<string, unknown>>(payload: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON output: ${message}`);
  }
}

beforeAll(async () => {
  const testHome = join(tmpdir(), "jfp-test-home");
  process.env.HOME = testHome;
  process.env.XDG_CONFIG_HOME = join(testHome, ".config");
  if (process.env.JFP_TOKEN) {
    delete process.env.JFP_TOKEN;
  }

  await saveCredentials(
    {
      access_token: "test-token",
      refresh_token: "test-refresh",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      email: "test@example.com",
      tier: "premium",
      user_id: "user-123",
    },
    process.env
  );
});

afterAll(() => {
  process.env.HOME = originalEnv.HOME;
  if (originalEnv.XDG_CONFIG_HOME === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = originalEnv.XDG_CONFIG_HOME;
  }
  if (originalEnv.JFP_TOKEN === undefined) {
    delete process.env.JFP_TOKEN;
  } else {
    process.env.JFP_TOKEN = originalEnv.JFP_TOKEN;
  }
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
    throw new Error("process.exit");
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  process.exit = originalExit;
});

describe("metadata assistant commands", () => {
  it("outputs tag suggestions JSON for a prompt", async () => {
    await tagsSuggestCommand("idea-wizard", { json: true, limit: "3", similar: "2", threshold: "0.2" });
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.promptId).toBe("idea-wizard");
    const suggestions = payload.suggestions as Record<string, unknown>;
    expect(Array.isArray(suggestions.tags)).toBe(true);
    expect(Array.isArray(suggestions.categories)).toBe(true);
    expect(Array.isArray(suggestions.descriptions)).toBe(true);
    expect(Array.isArray(payload.similar)).toBe(true);
  });

  it("outputs duplicate scan JSON array", async () => {
    await dedupeScanCommand({ json: true, minScore: "0.95", limit: "5" });
    const payload = parseJson<unknown>(output.join(""));
    expect(Array.isArray(payload)).toBe(true);
  });

  it("returns error JSON and exits for invalid threshold", () => {
    expect(() => tagsSuggestCommand("idea-wizard", { json: true, threshold: "2" })).toThrow();
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.code).toBe("invalid_threshold");
    expect(exitCode).toBe(1);
  });
});
