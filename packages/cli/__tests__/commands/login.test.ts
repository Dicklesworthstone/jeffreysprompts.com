/**
 * Login Command Tests
 *
 * Tests for authentication flows:
 * - Already logged in handling
 * - Device code flow initiation and error handling
 */
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Mock dependencies
const mockCredentials = {
  access_token: "test-token-12345",
  refresh_token: "refresh-token-67890",
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  email: "existing@example.com",
  tier: "premium",
  user_id: "user-123",
};

// Mock credentials module
mock.module("../../src/lib/credentials", () => ({
  loadCredentials: mock(),
  saveCredentials: mock(),
  getAccessToken: mock(),
}));

import { loadCredentials, saveCredentials, getAccessToken } from "../../src/lib/credentials";
import { loginCommand } from "../../src/commands/login";

// Test directory setup
let TEST_DIR: string;
let FAKE_HOME: string;
let FAKE_CONFIG: string;

// Store original env vars
const originalEnv = { ...process.env };

// Store original console methods and fetch
const originalLog = console.log;
const originalError = console.error;
const originalFetch = globalThis.fetch;
const originalExit = process.exit;

// Capture console output
let consoleOutput: string[] = [];

// Setup for each test
function setupTest() {
  // Create unique test directory for each test
  TEST_DIR = join(tmpdir(), "jfp-login-test-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  FAKE_HOME = join(TEST_DIR, "home");
  FAKE_CONFIG = join(FAKE_HOME, ".config");

  // Create fresh test directories
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(FAKE_HOME, { recursive: true });

  // Set env vars for testing
  process.env.HOME = FAKE_HOME;
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.JFP_TOKEN;
  delete process.env.SSH_CLIENT;
  delete process.env.SSH_TTY;
  process.env.DISPLAY = ":0"; // Simulate display available
  process.env.JFP_PREMIUM_URL = "https://test-premium.example.com";

  // Capture console output
  consoleOutput = [];
  console.log = (...args: unknown[]) => {
    consoleOutput.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    consoleOutput.push(args.map(String).join(" "));
  };
}

// Cleanup for each test
function cleanupTest() {
  // Restore env vars
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  });
  Object.assign(process.env, originalEnv);

  // Restore console and fetch
  console.log = originalLog;
  console.error = originalError;
  globalThis.fetch = originalFetch;
  process.exit = originalExit;

  // Cleanup test directory
  try {
    rmSync(TEST_DIR, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe("loginCommand - already logged in", () => {
  beforeEach(() => {
    setupTest();
    // Reset mocks
    (loadCredentials as jest.Mock).mockReset();
  });
  afterEach(cleanupTest);

  it("shows already logged in when credentials exist (JSON)", async () => {
    (loadCredentials as jest.Mock).mockResolvedValue(mockCredentials);

    await loginCommand({ json: true });

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.error).toBe(true);
    expect(parsed.code).toBe("already_logged_in");
    expect(parsed.email).toBe("existing@example.com");
  });
});

describe("Device Code Flow", () => {
  beforeEach(() => {
    setupTest();
    (loadCredentials as jest.Mock).mockResolvedValue(null);
  });
  afterEach(cleanupTest);

  it("handles network error", async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error("Network unreachable")));

    let exitCode: number | undefined;
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error("EXIT_" + code);
    }) as never;

    try {
      await loginCommand({ remote: true, json: true });
    } catch (e) {
      // Expected
    }

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.error).toBe(true);
    expect(parsed.code).toBe("network_error");
    expect(exitCode).toBe(1);
  });

  it("handles server error", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Internal Server Error", { status: 500 }))
    );

    let exitCode: number | undefined;
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error("EXIT_" + code);
    }) as never;

    try {
      await loginCommand({ remote: true, json: true });
    } catch (e) {
      // Expected
    }

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.error).toBe(true);
    expect(parsed.code).toBe("device_code_failed");
    expect(exitCode).toBe(1);
  });

  it("displays verification info", async () => {
    // Mock: first call returns device code, second call returns success to avoid loop
    let callCount = 0;
    globalThis.fetch = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              device_code: "device-abc123",
              user_code: "TEST1234",
              verification_url: "https://test-premium.example.com/cli/verify",
              expires_in: 900,
              interval: 1,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: "token",
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            email: "test@example.com",
            tier: "premium",
            user_id: "user-123",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    });

    await loginCommand({ remote: true, json: true, timeout: 30000 });

    const output = consoleOutput.join("\n");
    expect(output).toContain("verification_url");
    expect(output).toContain("TEST-1234");
  });
});

