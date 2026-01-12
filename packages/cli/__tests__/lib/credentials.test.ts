/**
 * Credential Storage Module Tests
 *
 * Tests for secure credential storage and retrieval:
 * - File creation with correct permissions
 * - Atomic writes via temp file
 * - Corrupt/missing file handling
 * - Token expiry checking
 * - Environment variable override
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import * as credentials from "../../src/lib/credentials";

// Test directory setup - use unique ID per test run
let TEST_DIR: string;
let FAKE_HOME: string;
let FAKE_CONFIG: string;

// Store original env vars
const originalHome = process.env.HOME;
const originalXdgConfig = process.env.XDG_CONFIG_HOME;
const originalJfpToken = process.env.JFP_TOKEN;

beforeEach(() => {
  // Create unique test directory for each test
  TEST_DIR = join(tmpdir(), "jfp-credentials-test-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  FAKE_HOME = join(TEST_DIR, "home");
  FAKE_CONFIG = join(FAKE_HOME, ".config");

  // Create fresh test directories
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(FAKE_HOME, { recursive: true });

  // Set env vars for testing
  process.env.HOME = FAKE_HOME;
  delete process.env.XDG_CONFIG_HOME;
  delete process.env.JFP_TOKEN;
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

  // Cleanup test directory
  rmSync(TEST_DIR, { recursive: true, force: true });
});

const validCredentials: import("../../src/lib/credentials").Credentials = {
  access_token: "test-access-token-12345",
  refresh_token: "test-refresh-token-67890",
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  email: "test@example.com",
  tier: "premium",
  user_id: "user-123",
};

describe("loadCredentials", () => {
  it("returns null when credentials file does not exist", async () => {
    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("returns null for corrupt JSON file", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    writeFileSync(credPath, "not valid json {{{");

    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("returns null for empty file", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    writeFileSync(credPath, "");

    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("returns null when access_token is missing", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    writeFileSync(credPath, JSON.stringify({ email: "test@example.com" }));

    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("returns null when email is missing", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    writeFileSync(credPath, JSON.stringify({ access_token: "token" }));

    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("loads valid credentials from file", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    writeFileSync(credPath, JSON.stringify(validCredentials));

    const result = await credentials.loadCredentials();
    expect(result).not.toBeNull();
    expect(result!.access_token).toBe(validCredentials.access_token);
    expect(result!.email).toBe(validCredentials.email);
    expect(result!.tier).toBe(validCredentials.tier);
  });
});

describe("CredentialsSchema validation (runtime)", () => {
  it("returns null when user_id is missing", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    const invalidCreds = {
      access_token: "token",
      email: "test@example.com",
      expires_at: new Date().toISOString(),
      tier: "premium",
      // user_id is missing
    };
    writeFileSync(credPath, JSON.stringify(invalidCreds));

    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("returns null when expires_at is missing", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    const invalidCreds = {
      access_token: "token",
      email: "test@example.com",
      tier: "premium",
      user_id: "user-123",
      // expires_at is missing
    };
    writeFileSync(credPath, JSON.stringify(invalidCreds));

    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("returns null when tier is invalid", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    const invalidCreds = {
      access_token: "token",
      email: "test@example.com",
      expires_at: new Date().toISOString(),
      tier: "invalid-tier", // Should be "free" or "premium"
      user_id: "user-123",
    };
    writeFileSync(credPath, JSON.stringify(invalidCreds));

    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("returns null when email format is invalid", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    const invalidCreds = {
      access_token: "token",
      email: "not-an-email", // Invalid email format
      expires_at: new Date().toISOString(),
      tier: "premium",
      user_id: "user-123",
    };
    writeFileSync(credPath, JSON.stringify(invalidCreds));

    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("returns null when access_token is empty string", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    const invalidCreds = {
      access_token: "", // Empty string should fail min(1) validation
      email: "test@example.com",
      expires_at: new Date().toISOString(),
      tier: "premium",
      user_id: "user-123",
    };
    writeFileSync(credPath, JSON.stringify(invalidCreds));

    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("returns null when tier has wrong type", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    const invalidCreds = {
      access_token: "token",
      email: "test@example.com",
      expires_at: new Date().toISOString(),
      tier: 123, // Should be string "free" or "premium"
      user_id: "user-123",
    };
    writeFileSync(credPath, JSON.stringify(invalidCreds));

    const result = await credentials.loadCredentials();
    expect(result).toBeNull();
  });

  it("accepts valid credentials with optional refresh_token", async () => {
    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    mkdirSync(join(FAKE_CONFIG, "jfp"), { recursive: true });
    const validCredsNoRefresh = {
      access_token: "token",
      email: "test@example.com",
      expires_at: new Date().toISOString(),
      tier: "free",
      user_id: "user-123",
      // refresh_token is optional and can be omitted
    };
    writeFileSync(credPath, JSON.stringify(validCredsNoRefresh));

    const result = await credentials.loadCredentials();
    expect(result).not.toBeNull();
    expect(result!.tier).toBe("free");
    expect(result!.refresh_token).toBeUndefined();
  });

  it("schema validates complete valid credentials", () => {
    const result = credentials.CredentialsSchema.safeParse(validCredentials);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.access_token).toBe(validCredentials.access_token);
      expect(result.data.email).toBe(validCredentials.email);
    }
  });
});

describe("saveCredentials", () => {
  it("creates config directory if it does not exist", async () => {
    await credentials.saveCredentials(validCredentials);

    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    expect(existsSync(credPath)).toBe(true);
  });

  it("saves credentials as valid JSON", async () => {
    await credentials.saveCredentials(validCredentials);

    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    const content = readFileSync(credPath, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.access_token).toBe(validCredentials.access_token);
    expect(parsed.email).toBe(validCredentials.email);
  });

  it("file is readable after save", async () => {
    await credentials.saveCredentials(validCredentials);
    const result = await credentials.loadCredentials();

    expect(result).not.toBeNull();
    expect(result!.access_token).toBe(validCredentials.access_token);
  });

  it("overwrites existing credentials", async () => {
    await credentials.saveCredentials(validCredentials);

    const newCreds = {
      ...validCredentials,
      email: "new@example.com",
      access_token: "new-token",
    };
    await credentials.saveCredentials(newCreds);

    const result = await credentials.loadCredentials();
    expect(result!.email).toBe("new@example.com");
    expect(result!.access_token).toBe("new-token");
  });

  // Skip permission tests on Windows
  const isWindows = process.platform === "win32";
  const itUnix = isWindows ? it.skip : it;

  itUnix("creates file with 0o600 permissions (Unix only)", async () => {
    await credentials.saveCredentials(validCredentials);

    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    const stats = statSync(credPath);
    const mode = stats.mode & 0o777;

    expect(mode).toBe(0o600);
  });

  itUnix("creates directory with 0o700 permissions (Unix only)", async () => {
    await credentials.saveCredentials(validCredentials);

    const configDir = join(FAKE_CONFIG, "jfp");
    const stats = statSync(configDir);
    const mode = stats.mode & 0o777;

    expect(mode).toBe(0o700);
  });
});

describe("clearCredentials", () => {
  it("removes credentials file", async () => {
    await credentials.saveCredentials(validCredentials);

    const credPath = join(FAKE_CONFIG, "jfp", "credentials.json");
    expect(existsSync(credPath)).toBe(true);

    await credentials.clearCredentials();
    expect(existsSync(credPath)).toBe(false);
  });

  it("does not throw when file does not exist", async () => {
    // Should not throw
    await credentials.clearCredentials();
    expect(true).toBe(true);
  });
});

describe("isExpired", () => {
  it("returns false for non-expired token", () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const creds = { ...validCredentials, expires_at: futureDate.toISOString() };

    expect(credentials.isExpired(creds)).toBe(false);
  });

  it("returns true for expired token", () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const creds = { ...validCredentials, expires_at: pastDate.toISOString() };

    expect(credentials.isExpired(creds)).toBe(true);
  });

  it("returns true for token expiring within 5 minute buffer", () => {
    const nearFuture = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    const creds = { ...validCredentials, expires_at: nearFuture.toISOString() };

    // Within 5-minute buffer, so should be considered expired
    expect(credentials.isExpired(creds)).toBe(true);
  });

  it("returns false when expires_at is not set", () => {
    const creds = { ...validCredentials, expires_at: "" };

    // No expiry = never expires
    expect(credentials.isExpired(creds)).toBe(false);
  });
});

describe("needsRefresh", () => {
  it("returns same result as isExpired (alias)", () => {
    const expiredCreds = {
      ...validCredentials,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };
    const validCreds = {
      ...validCredentials,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    expect(credentials.needsRefresh(expiredCreds)).toBe(credentials.isExpired(expiredCreds));
    expect(credentials.needsRefresh(validCreds)).toBe(credentials.isExpired(validCreds));
    expect(credentials.needsRefresh(expiredCreds)).toBe(true);
    expect(credentials.needsRefresh(validCreds)).toBe(false);
  });
});

describe("getAccessToken", () => {
  it("returns null when not logged in", async () => {
    const token = await credentials.getAccessToken();
    expect(token).toBeNull();
  });

  it("returns token from saved credentials", async () => {
    await credentials.saveCredentials(validCredentials);

    const token = await credentials.getAccessToken();
    expect(token).toBe(validCredentials.access_token);
  });

  it("returns null for expired credentials without refresh token", async () => {
    const expiredCreds = {
      ...validCredentials,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      refresh_token: undefined, // Explicitly no refresh token - no network call
    };
    await credentials.saveCredentials(expiredCreds);

    const token = await credentials.getAccessToken();
    expect(token).toBeNull();
  });

  it("returns JFP_TOKEN env var when set", async () => {
    process.env.JFP_TOKEN = "env-token-override";

    const token = await credentials.getAccessToken();
    expect(token).toBe("env-token-override");
  });

  it("JFP_TOKEN takes precedence over saved credentials", async () => {
    await credentials.saveCredentials(validCredentials);
    process.env.JFP_TOKEN = "env-token-override";

    const token = await credentials.getAccessToken();
    expect(token).toBe("env-token-override");
  });
});

describe("isLoggedIn", () => {
  it("returns false when not logged in", async () => {
    const result = await credentials.isLoggedIn();
    expect(result).toBe(false);
  });

  it("returns true when logged in with valid credentials", async () => {
    await credentials.saveCredentials(validCredentials);

    const result = await credentials.isLoggedIn();
    expect(result).toBe(true);
  });

  it("returns false when credentials are expired without refresh token", async () => {
    const expiredCreds = {
      ...validCredentials,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      refresh_token: undefined, // Explicitly no refresh token - no network call
    };
    await credentials.saveCredentials(expiredCreds);

    const result = await credentials.isLoggedIn();
    expect(result).toBe(false);
  });

  it("returns true when JFP_TOKEN is set", async () => {
    process.env.JFP_TOKEN = "env-token";

    const result = await credentials.isLoggedIn();
    expect(result).toBe(true);
  });
});

describe("getCurrentUser", () => {
  it("returns null when not logged in", async () => {
    const user = await credentials.getCurrentUser();
    expect(user).toBeNull();
  });

  it("returns user info when logged in", async () => {
    await credentials.saveCredentials(validCredentials);

    const user = await credentials.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.email).toBe(validCredentials.email);
    expect(user!.tier).toBe(validCredentials.tier);
    expect(user!.userId).toBe(validCredentials.user_id);
  });

  it("returns null when credentials are expired without refresh token", async () => {
    const expiredCreds = {
      ...validCredentials,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      refresh_token: undefined, // Explicitly no refresh token - no network call
    };
    await credentials.saveCredentials(expiredCreds);

    const user = await credentials.getCurrentUser();
    expect(user).toBeNull();
  });
});

describe("XDG_CONFIG_HOME", () => {
  it("uses XDG_CONFIG_HOME when set", async () => {
    const customConfig = join(TEST_DIR, "custom-config");
    process.env.XDG_CONFIG_HOME = customConfig;

    // Module reads XDG_CONFIG_HOME on each call
    await credentials.saveCredentials(validCredentials);

    const credPath = join(customConfig, "jfp", "credentials.json");
    expect(existsSync(credPath)).toBe(true);
  });

  it("getCredentialsPath returns correct path with XDG_CONFIG_HOME", () => {
    const customConfig = join(TEST_DIR, "custom-xdg");
    process.env.XDG_CONFIG_HOME = customConfig;

    const path = credentials.getCredentialsPath();
    expect(path).toBe(join(customConfig, "jfp", "credentials.json"));
  });

  it("getCredentialsPath uses HOME/.config without XDG_CONFIG_HOME", () => {
    delete process.env.XDG_CONFIG_HOME;

    const path = credentials.getCredentialsPath();
    expect(path).toBe(join(FAKE_HOME, ".config", "jfp", "credentials.json"));
  });
});

describe("authenticatedFetch", () => {
  // Store original fetch to restore after tests
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null when not logged in", async () => {
    const result = await credentials.authenticatedFetch("https://example.com/api");
    expect(result).toBeNull();
  });

  it("adds Authorization header when logged in", async () => {
    await credentials.saveCredentials(validCredentials);

    let capturedHeaders: Headers | undefined;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const result = await credentials.authenticatedFetch("https://example.com/api");
    expect(result).not.toBeNull();
    expect(capturedHeaders?.get("Authorization")).toBe(`Bearer ${validCredentials.access_token}`);
  });

  it("preserves existing headers", async () => {
    await credentials.saveCredentials(validCredentials);

    let capturedHeaders: Headers | undefined;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const result = await credentials.authenticatedFetch("https://example.com/api", {
      headers: { "Content-Type": "application/json", "X-Custom": "value" },
    });

    expect(result).not.toBeNull();
    expect(capturedHeaders?.get("Authorization")).toBe(`Bearer ${validCredentials.access_token}`);
    expect(capturedHeaders?.get("Content-Type")).toBe("application/json");
    expect(capturedHeaders?.get("X-Custom")).toBe("value");
  });

  it("passes through request options", async () => {
    await credentials.saveCredentials(validCredentials);

    let capturedMethod: string | undefined;
    let capturedBody: string | undefined;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedMethod = init?.method;
      capturedBody = init?.body as string;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    await credentials.authenticatedFetch("https://example.com/api", {
      method: "POST",
      body: JSON.stringify({ data: "test" }),
    });

    expect(capturedMethod).toBe("POST");
    expect(capturedBody).toBe(JSON.stringify({ data: "test" }));
  });

  it("returns null for expired credentials without refresh token", async () => {
    const expiredCreds = {
      ...validCredentials,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      refresh_token: undefined,
    };
    await credentials.saveCredentials(expiredCreds);

    const result = await credentials.authenticatedFetch("https://example.com/api");
    expect(result).toBeNull();
  });

  it("uses JFP_TOKEN env var when set", async () => {
    process.env.JFP_TOKEN = "env-token-for-fetch";

    let capturedHeaders: Headers | undefined;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    const result = await credentials.authenticatedFetch("https://example.com/api");
    expect(result).not.toBeNull();
    expect(capturedHeaders?.get("Authorization")).toBe("Bearer env-token-for-fetch");
  });
});

describe("getAccessToken with refresh", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns current token when not expired", async () => {
    await credentials.saveCredentials(validCredentials);

    const token = await credentials.getAccessToken();
    expect(token).toBe(validCredentials.access_token);
  });

  it("attempts refresh when token is expired and refresh_token exists", async () => {
    const expiredCreds = {
      ...validCredentials,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      refresh_token: "test-refresh-token",
    };
    await credentials.saveCredentials(expiredCreds);

    let refreshCalled = false;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      refreshCalled = true;
      const url = input.toString();
      if (url.includes("/api/cli/token/refresh")) {
        return new Response(JSON.stringify({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          email: expiredCreds.email,
          tier: expiredCreds.tier,
          user_id: expiredCreds.user_id,
        }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    };

    const token = await credentials.getAccessToken();
    expect(refreshCalled).toBe(true);
    expect(token).toBe("new-access-token");

    // Verify new credentials were saved
    const savedCreds = await credentials.loadCredentials();
    expect(savedCreds?.access_token).toBe("new-access-token");
    expect(savedCreds?.refresh_token).toBe("new-refresh-token");
  });

  it("returns null when refresh fails with non-200 response", async () => {
    const expiredCreds = {
      ...validCredentials,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      refresh_token: "expired-refresh-token",
    };
    await credentials.saveCredentials(expiredCreds);

    globalThis.fetch = async () => {
      return new Response("Unauthorized", { status: 401 });
    };

    const token = await credentials.getAccessToken();
    expect(token).toBeNull();
  });

  it("returns null when refresh fails with network error", async () => {
    const expiredCreds = {
      ...validCredentials,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      refresh_token: "test-refresh-token",
    };
    await credentials.saveCredentials(expiredCreds);

    globalThis.fetch = async () => {
      throw new Error("Network error");
    };

    const token = await credentials.getAccessToken();
    expect(token).toBeNull();
  });

  it("returns null when no refresh_token and token is expired", async () => {
    const expiredCredsNoRefresh = {
      ...validCredentials,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      refresh_token: undefined,
    };
    await credentials.saveCredentials(expiredCredsNoRefresh);

    const token = await credentials.getAccessToken();
    expect(token).toBeNull();
  });

  it("keeps old refresh token if server doesnt return new one", async () => {
    const expiredCreds = {
      ...validCredentials,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      refresh_token: "original-refresh-token",
    };
    await credentials.saveCredentials(expiredCreds);

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({
        access_token: "new-access-token",
        // No refresh_token in response
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        email: expiredCreds.email,
        tier: expiredCreds.tier,
        user_id: expiredCreds.user_id,
      }), { status: 200 });
    };

    const token = await credentials.getAccessToken();
    expect(token).toBe("new-access-token");

    // Verify original refresh token was preserved
    const savedCreds = await credentials.loadCredentials();
    expect(savedCreds?.refresh_token).toBe("original-refresh-token");
  });
});
