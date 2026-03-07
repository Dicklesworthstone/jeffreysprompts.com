/**
 * API Client Tests
 *
 * Tests for authenticated API client:
 * - Automatic auth header injection
 * - HTTP method helpers (GET, POST, PUT, DELETE)
 * - Timeout handling
 * - Error handling and helper functions
 */
import { describe, it, expect, mock, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  ApiClient,
  createApiClient,
  isAuthError,
  isPermissionError,
  isNotFoundError,
  requiresPremium,
} from "../../src/lib/api-client";

// Helper to create a unique test environment
function setupTestEnv(envOverrides: Record<string, string | undefined> = {}) {
  const testDir = join(tmpdir(), "jfp-api-client-test-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const fakeHome = join(testDir, "home");
  const fakeConfig = join(fakeHome, ".config");

  mkdirSync(fakeHome, { recursive: true });

  const mockEnv: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: fakeHome,
    XDG_CONFIG_HOME: undefined,
    JFP_TOKEN: undefined,
    JFP_PREMIUM_API_URL: undefined,
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

// Helper to create valid credentials
function createCredentialsFile(configDir: string, options: { expired?: boolean; email?: string } = {}) {
  const credDir = join(configDir, "jfp");
  mkdirSync(credDir, { recursive: true });

  const expiresAt = options.expired
    ? new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

  const creds = {
    access_token: "file-token-12345",
    refresh_token: "refresh-token-67890",
    expires_at: expiresAt,
    email: options.email ?? "test@example.com",
    tier: "premium",
    user_id: "user-123",
  };

  writeFileSync(join(credDir, "credentials.json"), JSON.stringify(creds, null, 2));
  return creds;
}

// Mock fetch setup
const originalFetch = globalThis.fetch;
let mockFetch: ReturnType<typeof mock>;

// Initialize mock fetch for each test run (this assumes serial execution within file, or worker isolation)
// Since we are refactoring to remove global state, we should probably handle fetch locally too if possible,
// but fetch is global. We rely on Bun's worker isolation for files.
// For tests within this file, we use beforeEach/afterEach for fetch restoration.
import { beforeEach } from "bun:test";

beforeEach(() => {
  mockFetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ data: "test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )
  );
  globalThis.fetch = mockFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("ApiClient", () => {
  describe("constructor", () => {
    it("uses default base URL", async () => {
      const client = new ApiClient(); // Default env (process.env) - mostly safe, but cleaner to inject mockEnv
      // To test default behavior, we might need to rely on the fact that JFP_PREMIUM_API_URL isn't set in CI usually.
      // But let's inject a mockEnv with no override.
      const { mockEnv, cleanup } = setupTestEnv();
      try {
        const client = new ApiClient({ env: mockEnv });
        await client.get("/test");
        expect(mockFetch).toHaveBeenCalled();
        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://pro.jeffreysprompts.com/api/test");
      } finally {
        cleanup();
      }
    });

    it("uses custom base URL from options", async () => {
      const client = new ApiClient({ baseUrl: "https://custom.api.com" });
      await client.get("/test");
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://custom.api.com/test");
    });

    it("uses JFP_PREMIUM_API_URL env var", async () => {
      const { mockEnv, cleanup } = setupTestEnv({ JFP_PREMIUM_API_URL: "https://env.api.com" });
      try {
        const client = new ApiClient({ env: mockEnv });
        await client.get("/test");
        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://env.api.com/test");
      } finally {
        cleanup();
      }
    });

    it("derives the API base from JFP_PREMIUM_URL when only that override is set", async () => {
      const { mockEnv, cleanup } = setupTestEnv({
        JFP_PREMIUM_URL: "https://staging-premium.example.com/",
      });
      try {
        const client = new ApiClient({ env: mockEnv });
        await client.get("/test");
        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("https://staging-premium.example.com/api/test");
      } finally {
        cleanup();
      }
    });
  });

  describe("request", () => {
    it("makes request without auth header when not logged in", async () => {
      const { mockEnv, cleanup } = setupTestEnv();
      try {
        const client = new ApiClient({ env: mockEnv });
        await client.request("/test");

        expect(mockFetch).toHaveBeenCalled();
        const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
        const headers = options.headers as Headers;
        expect(headers.get("Authorization")).toBeNull();
      } finally {
        cleanup();
      }
    });

    it("includes auth header when JFP_TOKEN env var is set", async () => {
      const { mockEnv, cleanup } = setupTestEnv({ JFP_TOKEN: "env-token-xyz" });
      try {
        const client = new ApiClient({ env: mockEnv });
        await client.request("/test");

        const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
        const headers = options.headers as Headers;
        expect(headers.get("Authorization")).toBe("Bearer env-token-xyz");
      } finally {
        cleanup();
      }
    });

    it("includes auth header from stored credentials", async () => {
      const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
      try {
        createCredentialsFile(fakeConfig);

        const client = new ApiClient({ env: mockEnv });
        await client.request("/test");

        const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
        const headers = options.headers as Headers;
        expect(headers.get("Authorization")).toBe("Bearer file-token-12345");
      } finally {
        cleanup();
      }
    });

    it("auto-refreshes expired token and includes new token in header", async () => {
      const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
      try {
        createCredentialsFile(fakeConfig, { expired: true });

        // Mock refresh endpoint to return new token
        let callCount = 0;
        globalThis.fetch = mock(() => {
          callCount++;
          if (callCount === 1) {
            // First call is refresh - return new token
            return Promise.resolve(
              new Response(JSON.stringify({
                access_token: "new-refreshed-token",
                refresh_token: "new-refresh-token",
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                email: "test@example.com",
                tier: "premium",
                user_id: "user-123",
              }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              })
            );
          }
          // Subsequent calls are the actual API request
          return Promise.resolve(
            new Response(JSON.stringify({ data: "test" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );
        });

        const client = new ApiClient({ env: mockEnv });
        await client.request("/test");

        // The second call should be the API request with the refreshed token
        const calls = (globalThis.fetch as ReturnType<typeof mock>).mock.calls;
        expect(calls.length).toBe(2); // refresh + actual request

        // Check the actual API request has the new token
        const [, options] = calls[1] as [string, RequestInit];
        const headers = options.headers as Headers;
        expect(headers.get("Authorization")).toBe("Bearer new-refreshed-token");
      } finally {
        cleanup();
      }
    });

    it("does not include auth header when refresh fails", async () => {
      const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
      try {
        createCredentialsFile(fakeConfig, { expired: true });

        // Make refresh endpoint fail (401)
        let callCount = 0;
        globalThis.fetch = mock(() => {
          callCount++;
          if (callCount === 1) {
            // First call is refresh - return 401 to simulate expired refresh token
            return Promise.resolve(
              new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
              })
            );
          }
          // Subsequent calls are the actual API request
          return Promise.resolve(
            new Response(JSON.stringify({ data: "test" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );
        });

        const client = new ApiClient({ env: mockEnv });
        await client.request("/test");

        // The second call should be the API request without auth header
        const calls = (globalThis.fetch as ReturnType<typeof mock>).mock.calls;
        expect(calls.length).toBe(2); // refresh + actual request

        // Check the actual API request (second call)
        const [, options] = calls[1] as [string, RequestInit];
        const headers = options.headers as Headers;
        expect(headers.get("Authorization")).toBeNull();
      } finally {
        cleanup();
      }
    });

    it("sets Content-Type header to application/json", async () => {
      const client = new ApiClient();
      await client.request("/test");

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Headers;
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("handles full URLs without prepending base URL", async () => {
      const client = new ApiClient({ baseUrl: "https://base.api.com" });
      await client.request("https://other.api.com/test");

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://other.api.com/test");
    });

    it("returns ok: true for successful response", async () => {
      const client = new ApiClient();
      const response = await client.request<{ data: string }>("/test");

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: "test" });
    });

    it("returns ok: false for error response", async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const client = new ApiClient();
      const response = await client.request("/test");

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(response.error).toBe("Not found");
    });

    it("handles non-JSON responses", async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve(
          new Response("Plain text response", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          })
        )
      );

      const client = new ApiClient();
      const response = await client.request("/test");

      expect(response.ok).toBe(true);
      expect(response.data).toBeUndefined();
    });

    it("handles network errors", async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error("Network error")));

      const client = new ApiClient();
      const response = await client.request("/test");

      expect(response.ok).toBe(false);
      expect(response.status).toBe(0);
      expect(response.error).toBe("Network error");
    });

    it("handles timeout", async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          })
      );

      const client = new ApiClient({ timeout: 100 });
      const response = await client.request("/test");

      expect(response.ok).toBe(false);
      expect(response.error).toBe("Request timed out");
    });
  });

  describe("HTTP method helpers", () => {
    it("get() makes GET request", async () => {
      const client = new ApiClient();
      await client.get("/test");

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(options.method).toBe("GET");
    });

    it("post() makes POST request with body", async () => {
      const client = new ApiClient();
      await client.post("/test", { key: "value" });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(options.method).toBe("POST");
      expect(options.body).toBe('{"key":"value"}');
    });

    it("put() makes PUT request with body", async () => {
      const client = new ApiClient();
      await client.put("/test", { updated: true });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(options.method).toBe("PUT");
      expect(options.body).toBe('{"updated":true}');
    });

    it("delete() makes DELETE request", async () => {
      const client = new ApiClient();
      await client.delete("/test");

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(options.method).toBe("DELETE");
    });
  });

  describe("isAuthenticated", () => {
    it("returns false when not logged in", async () => {
      const { mockEnv, cleanup } = setupTestEnv();
      try {
        const client = new ApiClient({ env: mockEnv });
        const result = await client.isAuthenticated();
        expect(result).toBe(false);
      } finally {
        cleanup();
      }
    });

    it("returns true when logged in via env var", async () => {
      const { mockEnv, cleanup } = setupTestEnv({ JFP_TOKEN: "env-token" });
      try {
        const client = new ApiClient({ env: mockEnv });
        const result = await client.isAuthenticated();
        expect(result).toBe(true);
      } finally {
        cleanup();
      }
    });

    it("returns true when logged in via credentials file", async () => {
      const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
      try {
        createCredentialsFile(fakeConfig);

        const client = new ApiClient({ env: mockEnv });
        const result = await client.isAuthenticated();
        expect(result).toBe(true);
      } finally {
        cleanup();
      }
    });
  });

  describe("getUser", () => {
    it("returns null when not logged in", async () => {
      const { mockEnv, cleanup } = setupTestEnv();
      try {
        const client = new ApiClient({ env: mockEnv });
        const user = await client.getUser();
        expect(user).toBeNull();
      } finally {
        cleanup();
      }
    });

    it("returns user info when logged in", async () => {
      const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
      try {
        createCredentialsFile(fakeConfig, { email: "user@test.com" });

        const client = new ApiClient({ env: mockEnv });
        const user = await client.getUser();
        expect(user).not.toBeNull();
        expect(user!.email).toBe("user@test.com");
        expect(user!.tier).toBe("premium");
      } finally {
        cleanup();
      }
    });
  });

  describe("verifyAuth", () => {
    it("returns authenticated: true for valid token", async () => {
      const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
      try {
        createCredentialsFile(fakeConfig);
        mockFetch.mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify({ email: "test@example.com", tier: "premium" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          )
        );

        const client = new ApiClient({ env: mockEnv });
        const result = await client.verifyAuth();

        expect(result.authenticated).toBe(true);
        expect(result.user?.email).toBe("test@example.com");
      } finally {
        cleanup();
      }
    });

    it("returns authenticated: false for invalid token", async () => {
      const { fakeConfig, mockEnv, cleanup } = setupTestEnv();
      try {
        createCredentialsFile(fakeConfig);
        mockFetch.mockImplementationOnce(() =>
          Promise.resolve(
            new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            })
          )
        );

        const client = new ApiClient({ env: mockEnv });
        const result = await client.verifyAuth();

        expect(result.authenticated).toBe(false);
        expect(result.user).toBeUndefined();
      } finally {
        cleanup();
      }
    });
  });
});

describe("Helper functions", () => {
  describe("isAuthError", () => {
    it("returns true for 401 status", () => {
      expect(isAuthError({ ok: false, status: 401, error: "Unauthorized" })).toBe(true);
    });

    it("returns false for other statuses", () => {
      expect(isAuthError({ ok: false, status: 403, error: "Forbidden" })).toBe(false);
      expect(isAuthError({ ok: false, status: 500, error: "Server error" })).toBe(false);
    });
  });

  describe("isPermissionError", () => {
    it("returns true for 403 status", () => {
      expect(isPermissionError({ ok: false, status: 403, error: "Forbidden" })).toBe(true);
    });

    it("returns false for other statuses", () => {
      expect(isPermissionError({ ok: false, status: 401, error: "Unauthorized" })).toBe(false);
    });
  });

  describe("isNotFoundError", () => {
    it("returns true for 404 status", () => {
      expect(isNotFoundError({ ok: false, status: 404, error: "Not found" })).toBe(true);
    });

    it("returns false for other statuses", () => {
      expect(isNotFoundError({ ok: false, status: 400, error: "Bad request" })).toBe(false);
    });
  });

  describe("requiresPremium", () => {
    it("returns true for 403 with premium in error message", () => {
      expect(requiresPremium({ ok: false, status: 403, error: "Premium tier required" })).toBe(true);
      expect(requiresPremium({ ok: false, status: 403, error: "This feature requires PREMIUM" })).toBe(true);
    });

    it("returns false for 403 without premium in message", () => {
      expect(requiresPremium({ ok: false, status: 403, error: "Access denied" })).toBe(false);
    });

    it("returns false for other statuses", () => {
      expect(requiresPremium({ ok: false, status: 401, error: "Premium required" })).toBe(false);
    });
  });
});

describe("createApiClient", () => {
  it("creates a new ApiClient instance", () => {
    const client = createApiClient({ baseUrl: "https://custom.api.com" });
    expect(client).toBeInstanceOf(ApiClient);
  });
});
