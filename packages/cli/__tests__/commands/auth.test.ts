/**
 * Auth Commands Tests: logout and whoami
 *
 * Tests for authentication management commands:
 * - whoami: Show current user info
 * - logout: Clear credentials
 */
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Test directory setup
let TEST_DIR: string;
let FAKE_HOME: string;
let FAKE_CONFIG: string;

// Store original env vars
const originalHome = process.env.HOME;
const originalXdgConfig = process.env.XDG_CONFIG_HOME;
const originalJfpToken = process.env.JFP_TOKEN;

// Store original console methods
const originalLog = console.log;
const originalError = console.error;
const originalFetch = globalThis.fetch;

// Capture console output
let consoleOutput: string[] = [];

beforeEach(() => {
  // Create unique test directory for each test
  TEST_DIR = join(tmpdir(), "jfp-auth-test-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  FAKE_HOME = join(TEST_DIR, "home");
  FAKE_CONFIG = join(FAKE_HOME, ".config");

  // Create fresh test directories
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(FAKE_HOME, { recursive: true });

  // Set env vars for testing
  process.env.HOME = FAKE_HOME;
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.JFP_TOKEN;

  // Capture console output
  consoleOutput = [];
  console.log = (...args: unknown[]) => {
    consoleOutput.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    consoleOutput.push(args.map(String).join(" "));
  };
});

afterEach(() => {
  // Restore env vars
  process.env.HOME = originalHome;
  if (originalXdgConfig) {
    process.env.XDG_CONFIG_HOME = originalXdgConfig;
  } else {
    delete process.env.XDG_CONFIG_HOME;
  }
  if (originalJfpToken) {
    process.env.JFP_TOKEN = originalJfpToken;
  } else {
    delete process.env.JFP_TOKEN;
  }

  // Restore console
  console.log = originalLog;
  console.error = originalError;
  globalThis.fetch = originalFetch;

  // Cleanup test directory
  rmSync(TEST_DIR, { recursive: true, force: true });
});

// Helper to create valid credentials file
function createCredentialsFile(options: { expired?: boolean; email?: string } = {}) {
  const credDir = join(FAKE_CONFIG, "jfp");
  mkdirSync(credDir, { recursive: true });

  const expiresAt = options.expired
    ? new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

  const creds = {
    access_token: "test-token-12345",
    refresh_token: "refresh-token-67890",
    expires_at: expiresAt,
    email: options.email ?? "test@example.com",
    tier: "premium",
    user_id: "user-123",
  };

  writeFileSync(join(credDir, "credentials.json"), JSON.stringify(creds, null, 2));
  return creds;
}

function getCredentialsPath() {
  return join(FAKE_CONFIG, "jfp", "credentials.json");
}

describe("whoamiCommand", () => {
  // Import dynamically to use updated env vars
  async function getWhoamiCommand() {
    // Clear module cache to pick up env changes
    const mod = await import("../../src/commands/auth");
    return mod.whoamiCommand;
  }

  it("shows not logged in when no credentials", async () => {
    const whoamiCommand = await getWhoamiCommand();

    let exitCode: number | undefined;
    const originalExit = process.exit;
    // Mock process.exit to throw to stop execution
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error("EXIT_" + code);
    }) as never;

    try {
      await whoamiCommand({ json: true });
    } catch (e) {
      // Expected - process.exit throws
    }

    process.exit = originalExit;

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);
    expect(parsed.error).toBe(true);
    expect(parsed.code).toBe("not_authenticated");
    expect(parsed.authenticated).toBe(false);
    expect(exitCode).toBe(1);
  });

  it("shows user info when logged in (JSON)", async () => {
    createCredentialsFile({ email: "user@example.com" });
    const whoamiCommand = await getWhoamiCommand();

    await whoamiCommand({ json: true });

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.authenticated).toBe(true);
    expect(parsed.email).toBe("user@example.com");
    expect(parsed.tier).toBe("premium");
    expect(parsed.user_id).toBeDefined();
    expect(parsed.expired).toBe(false);
  });

  it("shows expired status for expired credentials (JSON)", async () => {
    createCredentialsFile({ expired: true });
    const whoamiCommand = await getWhoamiCommand();

    let exitCode: number | undefined;
    const originalExit = process.exit;
    // Mock process.exit to throw to stop execution
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error("EXIT_" + code);
    }) as never;

    try {
      await whoamiCommand({ json: true });
    } catch (e) {
      // Expected - process.exit throws
    }

    process.exit = originalExit;

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.error).toBe(true);
    expect(parsed.code).toBe("session_expired");
    expect(parsed.authenticated).toBe(false);
    expect(parsed.expired).toBe(true);
    expect(exitCode).toBe(1);
  });

  it("refreshes expired credentials before reporting session state", async () => {
    const creds = createCredentialsFile({ expired: true, email: "refresh@example.com" });
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = input.toString();
      if (!url.includes("/api/cli/token/refresh")) {
        return Promise.resolve(new Response("Not found", { status: 404 }));
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            email: creds.email,
            tier: creds.tier,
            user_id: creds.user_id,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );
    });

    const whoamiCommand = await getWhoamiCommand();
    await whoamiCommand({ json: true });

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.authenticated).toBe(true);
    expect(parsed.email).toBe("refresh@example.com");
    expect(parsed.expired).toBe(false);
    expect(parsed.expires_in).toBeGreaterThan(0);
  });

  it("shows env token message when JFP_TOKEN is set", async () => {
    process.env.JFP_TOKEN = "env-token-xyz";
    const whoamiCommand = await getWhoamiCommand();

    await whoamiCommand({ json: true });

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.authenticated).toBe(true);
    expect(parsed.source).toBe("environment");
  });
});

describe("logoutCommand", () => {
  async function getLogoutCommand() {
    const mod = await import("../../src/commands/auth");
    return mod.logoutCommand;
  }

  it("does nothing when not logged in (JSON)", async () => {
    const logoutCommand = await getLogoutCommand();

    await logoutCommand({ json: true });

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.logged_out).toBe(true);
    expect(parsed.message).toContain("Not logged in");
  });

  it("clears credentials when logged in (JSON)", async () => {
    createCredentialsFile({ email: "user@example.com" });
    const logoutCommand = await getLogoutCommand();

    // Verify credentials exist before logout
    expect(existsSync(getCredentialsPath())).toBe(true);

    await logoutCommand({ json: true });

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.logged_out).toBe(true);
    expect(parsed.email).toBe("user@example.com");

    // Verify credentials are cleared
    expect(existsSync(getCredentialsPath())).toBe(false);
  });

  it("shows error when using env token", async () => {
    process.env.JFP_TOKEN = "env-token-xyz";
    const logoutCommand = await getLogoutCommand();

    let exitCode: number | undefined;
    const originalExit = process.exit;
    // Mock process.exit to throw to stop execution
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error("EXIT_" + code);
    }) as never;

    try {
      await logoutCommand({ json: true });
    } catch (e) {
      // Expected - process.exit throws
    }

    process.exit = originalExit;

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.error).toBe(true);
    expect(parsed.code).toBe("env_token");
    expect(exitCode).toBe(1);
  });

  it("includes revoke flag in output when --revoke is used", async () => {
    createCredentialsFile({ email: "user@example.com" });

    // Mock fetch to prevent actual API call
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    const logoutCommand = await getLogoutCommand();
    await logoutCommand({ json: true, revoke: true });

    globalThis.fetch = originalFetch;

    const output = consoleOutput.join("\n");
    const parsed = JSON.parse(output);

    expect(parsed.logged_out).toBe(true);
    expect(parsed.revoked).toBe(true);
  });
});

describe("Human-readable output", () => {
  it("whoami shows boxen output for logged in user", async () => {
    createCredentialsFile({ email: "human@example.com" });
    const { whoamiCommand } = await import("../../src/commands/auth");

    await whoamiCommand({});

    const output = consoleOutput.join("\n");
    expect(output).toContain("human@example.com");
    expect(output).toContain("premium");
  });

  it("logout shows success message", async () => {
    createCredentialsFile({ email: "human@example.com" });
    const { logoutCommand } = await import("../../src/commands/auth");

    await logoutCommand({});

    const output = consoleOutput.join("\n");
    expect(output).toContain("Logged out");
    expect(output).toContain("human@example.com");
  });
});
