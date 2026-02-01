import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { recommendCommand } from "../../src/commands/recommend";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;
let mockEnv: NodeJS.ProcessEnv;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;

function setupTestEnv() {
  const testDir = join(tmpdir(), "jfp-recommend-test-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const fakeHome = join(testDir, "home");
  const credDir = join(fakeHome, ".config", "jfp");
  mkdirSync(credDir, { recursive: true });

  const creds = {
    access_token: "test-token-12345",
    refresh_token: "refresh-token-67890",
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    email: "test@example.com",
    tier: "premium",
    user_id: "user-123",
  };
  writeFileSync(join(credDir, "credentials.json"), JSON.stringify(creds, null, 2));

  mockEnv = {
    ...process.env,
    HOME: fakeHome,
    XDG_CONFIG_HOME: undefined,
    JFP_TOKEN: undefined,
  };
}

beforeEach(() => {
  output = [];
  errors = [];
  exitCode = undefined;
  setupTestEnv();
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

describe("recommendCommand", () => {
  it("outputs JSON recommendations without a seed", async () => {
    await recommendCommand(undefined, { json: true, limit: 3 }, mockEnv);
    const payload = JSON.parse(output.join(""));
    expect(payload.recommendations.length).toBeGreaterThan(0);
    expect(payload.recommendations.length).toBeLessThanOrEqual(3);
    expect(payload.recommendations[0]).toHaveProperty("id");
    expect(payload.recommendations[0]).toHaveProperty("reasons");
  });

  it("returns error payload and exits for invalid limit", () => {
    expect(() => recommendCommand(undefined, { json: true, limit: "0" }, mockEnv)).toThrow();
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("invalid_limit");
    expect(exitCode).toBe(1);
  });

  it("respects preference filters without saved prompts", async () => {
    const allCategories = [
      "ideation",
      "documentation",
      "automation",
      "refactoring",
      "testing",
      "debugging",
      "workflow",
      "communication",
    ].join(",");

    await recommendCommand(undefined, { json: true, excludeCategories: allCategories }, mockEnv);
    const payload = JSON.parse(output.join(""));
    expect(payload.mode).toBe("for_you");
    expect(payload.recommendations.length).toBe(0);
    expect(payload.preferences.excludeCategories).toEqual(allCategories.split(","));
  });
});
