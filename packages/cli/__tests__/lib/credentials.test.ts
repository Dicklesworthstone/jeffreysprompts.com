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
import { describe, it, expect, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import * as credentials from "../../src/lib/credentials";

// Helper to create a unique test environment
function setupTestEnv(envOverrides: Record<string, string | undefined> = {}) {
  const testDir = join(tmpdir(), "jfp-credentials-test-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const fakeHome = join(testDir, "home");
  const fakeConfig = join(fakeHome, ".config");

  mkdirSync(fakeHome, { recursive: true });

  const mockEnv: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: fakeHome,
    XDG_CONFIG_HOME: undefined,
    JFP_TOKEN: undefined,
    ...envOverrides,
  };

  const cleanup = () => {
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  };

  return { testDir, fakeHome, fakeConfig, mockEnv, cleanup };
}

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
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null for corrupt JSON file", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      writeFileSync(credPath, "not valid json {{{");

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null for empty file", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      writeFileSync(credPath, "");

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null when access_token is missing", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      writeFileSync(credPath, JSON.stringify({ email: "test@example.com" }));

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null when email is missing", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      writeFileSync(credPath, JSON.stringify({ access_token: "token" }));

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("loads valid credentials from file", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      writeFileSync(credPath, JSON.stringify(validCredentials));

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toMatchObject({
        access_token: validCredentials.access_token,
        email: validCredentials.email,
        tier: validCredentials.tier,
      });
    } finally {
      cleanup();
    }
  });
});

describe("CredentialsSchema validation (runtime)", () => {
  it("returns null when user_id is missing", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      const invalidCreds = {
        access_token: "token",
        email: "test@example.com",
        expires_at: new Date().toISOString(),
        tier: "premium",
        // user_id is missing
      };
      writeFileSync(credPath, JSON.stringify(invalidCreds));

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null when expires_at is missing", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      const invalidCreds = {
        access_token: "token",
        email: "test@example.com",
        tier: "premium",
        user_id: "user-123",
        // expires_at is missing
      };
      writeFileSync(credPath, JSON.stringify(invalidCreds));

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null when tier is invalid", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      const invalidCreds = {
        access_token: "token",
        email: "test@example.com",
        expires_at: new Date().toISOString(),
        tier: "invalid-tier",
        user_id: "user-123",
      };
      writeFileSync(credPath, JSON.stringify(invalidCreds));

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null when email format is invalid", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      const invalidCreds = {
        access_token: "token",
        email: "not-an-email",
        expires_at: new Date().toISOString(),
        tier: "premium",
        user_id: "user-123",
      };
      writeFileSync(credPath, JSON.stringify(invalidCreds));

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null when access_token is empty string", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      const invalidCreds = {
        access_token: "",
        email: "test@example.com",
        expires_at: new Date().toISOString(),
        tier: "premium",
        user_id: "user-123",
      };
      writeFileSync(credPath, JSON.stringify(invalidCreds));

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null when tier has wrong type", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      const invalidCreds = {
        access_token: "token",
        email: "test@example.com",
        expires_at: new Date().toISOString(),
        tier: 123,
        user_id: "user-123",
      };
      writeFileSync(credPath, JSON.stringify(invalidCreds));

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("accepts valid credentials with optional refresh_token", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      const credPath = join(fakeConfig, "jfp", "credentials.json");
      mkdirSync(join(fakeConfig, "jfp"), { recursive: true });
      const validCredsNoRefresh = {
        access_token: "token",
        email: "test@example.com",
        expires_at: new Date().toISOString(),
        tier: "free",
        user_id: "user-123",
      };
      writeFileSync(credPath, JSON.stringify(validCredsNoRefresh));

      const result = await credentials.loadCredentials(mockEnv);
      if (!result) {
        throw new Error("Expected credentials to load");
      }
      expect(result.tier).toBe("free");
      expect(result.refresh_token).toBeUndefined();
    } finally {
      cleanup();
    }
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
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const credPath = join(fakeConfig, "jfp", "credentials.json");
      expect(existsSync(credPath)).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("saves credentials as valid JSON", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const credPath = join(fakeConfig, "jfp", "credentials.json");
      const content = readFileSync(credPath, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed.access_token).toBe(validCredentials.access_token);
      expect(parsed.email).toBe(validCredentials.email);
    } finally {
      cleanup();
    }
  });

  it("file is readable after save", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);
      const result = await credentials.loadCredentials(mockEnv);

      expect(result).toMatchObject({ access_token: validCredentials.access_token });
    } finally {
      cleanup();
    }
  });

  it("overwrites existing credentials", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const newCreds = {
        ...validCredentials,
        email: "new@example.com",
        access_token: "new-token",
      };
      await credentials.saveCredentials(newCreds, mockEnv);

      const result = await credentials.loadCredentials(mockEnv);
      expect(result).toMatchObject({
        email: "new@example.com",
        access_token: "new-token",
      });
    } finally {
      cleanup();
    }
  });

  // Skip permission tests on Windows
  const isWindows = process.platform === "win32";
  const itUnix = isWindows ? it.skip : it;

  itUnix("creates file with 0o600 permissions (Unix only)", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const credPath = join(fakeConfig, "jfp", "credentials.json");
      const stats = statSync(credPath);
      const mode = stats.mode & 0o777;

      expect(mode).toBe(0o600);
    } finally {
      cleanup();
    }
  });

  itUnix("creates directory with 0o700 permissions (Unix only)", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const configDir = join(fakeConfig, "jfp");
      const stats = statSync(configDir);
      const mode = stats.mode & 0o777;

      expect(mode).toBe(0o700);
    } finally {
      cleanup();
    }
  });
});

describe("clearCredentials", () => {
  it("removes credentials file", async () => {
    const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const credPath = join(fakeConfig, "jfp", "credentials.json");
      expect(existsSync(credPath)).toBe(true);

      await credentials.clearCredentials(mockEnv);
      expect(existsSync(credPath)).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("does not throw when file does not exist", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      // Should not throw
      await credentials.clearCredentials(mockEnv);
      expect(true).toBe(true);
    } finally {
      cleanup();
    }
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

  it("treats invalid expires_at as expired", () => {
    const creds = { ...validCredentials, expires_at: "not-a-date" };

    expect(credentials.isExpired(creds)).toBe(true);
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
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const token = await credentials.getAccessToken(mockEnv);
      expect(token).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns token from saved credentials", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const token = await credentials.getAccessToken(mockEnv);
      expect(token).toBe(validCredentials.access_token);
    } finally {
      cleanup();
    }
  });

  it("returns null for expired credentials without refresh token", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const expiredCreds = {
        ...validCredentials,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        refresh_token: undefined, // Explicitly no refresh token - no network call
      };
      await credentials.saveCredentials(expiredCreds, mockEnv);

      const token = await credentials.getAccessToken(mockEnv);
      expect(token).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns JFP_TOKEN env var when set", async () => {
    const { mockEnv, cleanup } = setupTestEnv({ JFP_TOKEN: "env-token-override" });
    try {
      const token = await credentials.getAccessToken(mockEnv);
      expect(token).toBe("env-token-override");
    } finally {
      cleanup();
    }
  });

  it("JFP_TOKEN takes precedence over saved credentials", async () => {
    const { mockEnv, cleanup } = setupTestEnv({ JFP_TOKEN: "env-token-override" });
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const token = await credentials.getAccessToken(mockEnv);
      expect(token).toBe("env-token-override");
    } finally {
      cleanup();
    }
  });
});

describe("isLoggedIn", () => {
  it("returns false when not logged in", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const result = await credentials.isLoggedIn(mockEnv);
      expect(result).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("returns true when logged in with valid credentials", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const result = await credentials.isLoggedIn(mockEnv);
      expect(result).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("returns false when credentials are expired without refresh token", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const expiredCreds = {
        ...validCredentials,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        refresh_token: undefined, // Explicitly no refresh token - no network call
      };
      await credentials.saveCredentials(expiredCreds, mockEnv);

      const result = await credentials.isLoggedIn(mockEnv);
      expect(result).toBe(false);
    } finally {
      cleanup();
    }
  });

  it("returns true when JFP_TOKEN is set", async () => {
    const { mockEnv, cleanup } = setupTestEnv({ JFP_TOKEN: "env-token" });
    try {
      const result = await credentials.isLoggedIn(mockEnv);
      expect(result).toBe(true);
    } finally {
      cleanup();
    }
  });
});

describe("getCurrentUser", () => {
  it("returns null when not logged in", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const user = await credentials.getCurrentUser(mockEnv);
      expect(user).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns user info when logged in", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const user = await credentials.getCurrentUser(mockEnv);
      expect(user).toEqual({
        email: validCredentials.email,
        tier: validCredentials.tier,
        userId: validCredentials.user_id,
      });
    } finally {
      cleanup();
    }
  });

  it("returns null when credentials are expired without refresh token", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const expiredCreds = {
        ...validCredentials,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        refresh_token: undefined, // Explicitly no refresh token - no network call
      };
      await credentials.saveCredentials(expiredCreds, mockEnv);

      const user = await credentials.getCurrentUser(mockEnv);
      expect(user).toBeNull();
    } finally {
      cleanup();
    }
  });
});

describe("XDG_CONFIG_HOME", () => {
  it("uses XDG_CONFIG_HOME when set", async () => {
    const { testDir, mockEnv, cleanup } = setupTestEnv();
    try {
      const customConfig = join(testDir, "custom-config");
      // Need to update mockEnv to use the new customConfig
      const xdgMockEnv = { ...mockEnv, XDG_CONFIG_HOME: customConfig };

      await credentials.saveCredentials(validCredentials, xdgMockEnv);

      const credPath = join(customConfig, "jfp", "credentials.json");
      expect(existsSync(credPath)).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("getCredentialsPath returns correct path with XDG_CONFIG_HOME", () => {
    const { testDir, mockEnv, cleanup } = setupTestEnv();
    try {
      const customConfig = join(testDir, "custom-xdg");
      const xdgMockEnv = { ...mockEnv, XDG_CONFIG_HOME: customConfig };

      const path = credentials.getCredentialsPath(xdgMockEnv);
      expect(path).toBe(join(customConfig, "jfp", "credentials.json"));
    } finally {
      cleanup();
    }
  });

  it("getCredentialsPath respects JFP_HOME when XDG_CONFIG_HOME is not set", () => {
    const { testDir, mockEnv, cleanup } = setupTestEnv();
    try {
      const customHome = join(testDir, "custom-home");
      const jfpEnv = { ...mockEnv, JFP_HOME: customHome };

      const path = credentials.getCredentialsPath(jfpEnv);
      expect(path).toBe(join(customHome, ".config", "jfp", "credentials.json"));
    } finally {
      cleanup();
    }
  });

  it("getCredentialsPath uses HOME/.config without XDG_CONFIG_HOME", () => {
    const { fakeHome, mockEnv, cleanup } = setupTestEnv();
    try {
      // mockEnv has XDG_CONFIG_HOME: undefined by default
      const path = credentials.getCredentialsPath(mockEnv);
      expect(path).toBe(join(fakeHome, ".config", "jfp", "credentials.json"));
    } finally {
      cleanup();
    }
  });
});

describe("authenticatedFetch", () => {
  // Store original fetch to restore after tests
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null when not logged in", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const result = await credentials.authenticatedFetch("https://example.com/api", {}, mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("adds Authorization header when logged in", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      let capturedHeaders: Headers | undefined;
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      };

      const result = await credentials.authenticatedFetch("https://example.com/api", {}, mockEnv);
      expect(result).not.toBeNull();
      expect(capturedHeaders?.get("Authorization")).toBe(`Bearer ${validCredentials.access_token}`);
    } finally {
      cleanup();
    }
  });

  it("preserves existing headers", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      let capturedHeaders: Headers | undefined;
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      };

      const result = await credentials.authenticatedFetch("https://example.com/api", {
        headers: { "Content-Type": "application/json", "X-Custom": "value" },
      }, mockEnv);

      expect(result).not.toBeNull();
      expect(capturedHeaders?.get("Authorization")).toBe(`Bearer ${validCredentials.access_token}`);
      expect(capturedHeaders?.get("Content-Type")).toBe("application/json");
      expect(capturedHeaders?.get("X-Custom")).toBe("value");
    } finally {
      cleanup();
    }
  });

  it("passes through request options", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

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
      }, mockEnv);

      expect(capturedMethod).toBe("POST");
      expect(capturedBody).toBe(JSON.stringify({ data: "test" }));
    } finally {
      cleanup();
    }
  });

  it("returns null for expired credentials without refresh token", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const expiredCreds = {
        ...validCredentials,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        refresh_token: undefined,
      };
      await credentials.saveCredentials(expiredCreds, mockEnv);

      const result = await credentials.authenticatedFetch("https://example.com/api", {}, mockEnv);
      expect(result).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("uses JFP_TOKEN env var when set", async () => {
    const { mockEnv, cleanup } = setupTestEnv({ JFP_TOKEN: "env-token-for-fetch" });
    try {
      let capturedHeaders: Headers | undefined;
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      };

      const result = await credentials.authenticatedFetch("https://example.com/api", {}, mockEnv);
      expect(result).not.toBeNull();
      expect(capturedHeaders?.get("Authorization")).toBe("Bearer env-token-for-fetch");
    } finally {
      cleanup();
    }
  });
});

describe("getAccessToken with refresh", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns current token when not expired", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      await credentials.saveCredentials(validCredentials, mockEnv);

      const token = await credentials.getAccessToken(mockEnv);
      expect(token).toBe(validCredentials.access_token);
    } finally {
      cleanup();
    }
  });

  it("attempts refresh when token is expired and refresh_token exists", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const expiredCreds = {
        ...validCredentials,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        refresh_token: "test-refresh-token",
      };
      await credentials.saveCredentials(expiredCreds, mockEnv);

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

      const token = await credentials.getAccessToken(mockEnv);
      expect(refreshCalled).toBe(true);
      expect(token).toBe("new-access-token");

      // Verify new credentials were saved
      const savedCreds = await credentials.loadCredentials(mockEnv);
      expect(savedCreds?.access_token).toBe("new-access-token");
      expect(savedCreds?.refresh_token).toBe("new-refresh-token");
    } finally {
      cleanup();
    }
  });

  it("returns null when refresh fails with non-200 response", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const expiredCreds = {
        ...validCredentials,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        refresh_token: "expired-refresh-token",
      };
      await credentials.saveCredentials(expiredCreds, mockEnv);

      globalThis.fetch = async () => {
        return new Response("Unauthorized", { status: 401 });
      };

      const token = await credentials.getAccessToken(mockEnv);
      expect(token).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null when refresh fails with network error", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const expiredCreds = {
        ...validCredentials,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        refresh_token: "test-refresh-token",
      };
      await credentials.saveCredentials(expiredCreds, mockEnv);

      globalThis.fetch = async () => {
        throw new Error("Network error");
      };

      const token = await credentials.getAccessToken(mockEnv);
      expect(token).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("returns null when no refresh_token and token is expired", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const expiredCredsNoRefresh = {
        ...validCredentials,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        refresh_token: undefined,
      };
      await credentials.saveCredentials(expiredCredsNoRefresh, mockEnv);

      const token = await credentials.getAccessToken(mockEnv);
      expect(token).toBeNull();
    } finally {
      cleanup();
    }
  });

  it("keeps old refresh token if server doesnt return new one", async () => {
    const { mockEnv, cleanup } = setupTestEnv();
    try {
      const expiredCreds = {
        ...validCredentials,
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        refresh_token: "original-refresh-token",
      };
      await credentials.saveCredentials(expiredCreds, mockEnv);

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

      const token = await credentials.getAccessToken(mockEnv);
      expect(token).toBe("new-access-token");

      // Verify original refresh token was preserved
      const savedCreds = await credentials.loadCredentials(mockEnv);
      expect(savedCreds?.refresh_token).toBe("original-refresh-token");
    } finally {
      cleanup();
    }
  });
});
