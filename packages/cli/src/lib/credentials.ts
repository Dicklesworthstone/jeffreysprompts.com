/**
 * Credential Storage Module
 *
 * Securely stores and retrieves authentication tokens for the CLI.
 * - XDG Base Directory compliant storage location
 * - Atomic file operations (no partial writes)
 * - Token expiry checking with buffer
 * - Automatic token refresh when expired
 * - Environment variable override for CI/CD
 */

import { homedir } from "os";
import { join, dirname } from "path";
import { readFile, unlink, mkdir, chmod } from "fs/promises";
import { existsSync } from "fs";
import { z } from "zod";
import { atomicWriteFile } from "./utils";

// Premium API base URL (resolved per call to allow env overrides in tests)

/**
 * Zod schema for credentials validation
 * Ensures all required fields are present and have correct types
 */
export const CredentialsSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_at: z.string().min(1), // ISO 8601
  email: z.string().email(),
  tier: z.enum(["free", "premium"]),
  user_id: z.string().min(1),
});

export type Credentials = z.infer<typeof CredentialsSchema>;

/**
 * Get XDG Base Directory compliant credentials path
 * Re-reads HOME env var each time for testability
 */
export function getCredentialsPath(env = process.env): string {
  const xdgConfig = env.XDG_CONFIG_HOME;
  // Prefer JFP_HOME when provided to keep CLI state isolated (matches config.ts behavior).
  // Fall back to HOME or system homedir() for default resolution.
  const home = env.JFP_HOME || env.HOME || homedir();
  const configDir = xdgConfig || join(home, ".config");
  return join(configDir, "jfp", "credentials.json");
}

/**
 * Get config directory path
 */
function getConfigDir(env = process.env): string {
  return dirname(getCredentialsPath(env));
}

/**
 * Load credentials from disk
 * Returns null if not logged in or credentials are invalid
 * Uses Zod schema for complete runtime validation
 */
export async function loadCredentials(env = process.env): Promise<Credentials | null> {
  const path = getCredentialsPath(env);

  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content);

    // Validate with Zod schema - ensures all required fields are present with correct types
    const result = CredentialsSchema.safeParse(parsed);
    if (!result.success) {
      debugLog(`Invalid credentials file: ${result.error.message}`, env);
      return null;
    }

    return result.data;
  } catch {
    // Corrupt file or parse error
    return null;
  }
}

/**
 * Check if credentials are expired
 * Uses 5-minute buffer for clock skew
 */
export function isExpired(creds: Credentials): boolean {
  if (!creds.expires_at) return false;

  const expiresAt = new Date(creds.expires_at);
  const expiresMs = expiresAt.getTime();
  if (!Number.isFinite(expiresMs)) {
    return true;
  }
  const now = new Date();

  // Consider expired 5 minutes before actual expiry (buffer for clock skew)
  const bufferMs = 5 * 60 * 1000;
  return now.getTime() > expiresMs - bufferMs;
}

/**
 * Check if credentials need refresh (alias for isExpired)
 * Returns true if token is expired or about to expire within 5 minutes
 */
export function needsRefresh(creds: Credentials): boolean {
  return isExpired(creds);
}

/**
 * Save credentials to disk
 * Atomic write with temp file to prevent corruption
 */
export async function saveCredentials(creds: Credentials, env = process.env): Promise<void> {
  const path = getCredentialsPath(env);
  const content = JSON.stringify(creds, null, 2);

  // Ensure credentials directory uses secure permissions
  const dir = dirname(path);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") {
    try {
      await chmod(dir, 0o700);
    } catch {
      // Ignore chmod errors on filesystems that do not support it
    }
  }

  // Write with secure permissions (0o600)
  await atomicWriteFile(path, content, { mode: 0o600 });
}

/**
 * Clear stored credentials (logout)
 */
export async function clearCredentials(env = process.env): Promise<void> {
  const path = getCredentialsPath(env);

  if (existsSync(path)) {
    await unlink(path);
  }
}

/**
 * Debug logging helper
 */
function debugLog(message: string, env = process.env): void {
  if (env.JFP_DEBUG) {
    console.error(`[jfp] ${message}`);
  }
}

/**
 * Attempt to refresh the access token using the refresh token
 * Returns new credentials on success, null on failure
 */
async function refreshAccessToken(refreshToken: string, env = process.env): Promise<Credentials | null> {
  debugLog("Access token expired, attempting refresh...", env);
  const apiBase =
    env.JFP_PREMIUM_API_URL ??
    (env.JFP_PREMIUM_URL ? `${env.JFP_PREMIUM_URL.replace(/\/$/, "")}/api` : "https://pro.jeffreysprompts.com/api");
  const refreshUrl = `${apiBase.replace(/\/$/, "")}/cli/token/refresh`;

  try {
    const response = await fetch(refreshUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: refreshToken,
        client_id: "jfp-cli",
      }),
    });

    if (!response.ok) {
      debugLog(`Refresh failed: ${response.status} ${response.statusText}`, env);
      return null;
    }

    const data = await response.json();

    // Validate response with Zod schema (refresh_token may be omitted)
    const RefreshResponseSchema = CredentialsSchema.extend({
      refresh_token: z.string().optional(),
    });
    const result = RefreshResponseSchema.safeParse(data);
    if (!result.success) {
      debugLog(`Invalid refresh response: ${result.error.message}`, env);
      return null;
    }

    debugLog(`Refresh successful, new token expires: ${result.data.expires_at}`, env);

    return {
      access_token: result.data.access_token,
      refresh_token: result.data.refresh_token ?? refreshToken, // Keep old refresh token if not provided
      expires_at: result.data.expires_at,
      email: result.data.email,
      tier: result.data.tier,
      user_id: result.data.user_id,
    };
  } catch (err) {
    // Network error - return null to fail gracefully
    debugLog(`Refresh error: ${err instanceof Error ? err.message : String(err)}`, env);
    return null;
  }
}

/**
 * Get access token for API calls
 * Automatically refreshes if token is expired and refresh token is available
 * Returns null if not logged in or refresh fails
 * Handles environment variable override (for CI/CD)
 */
export async function getAccessToken(env = process.env): Promise<string | null> {
  // Environment variable takes precedence (for CI/CD)
  const envToken = env.JFP_TOKEN;
  if (envToken) {
    return envToken;
  }

  const creds = await loadCredentials(env);
  if (!creds) {
    return null;
  }

  // Return current token if not expired
  if (!isExpired(creds)) {
    return creds.access_token;
  }

  // Token expired - try to refresh
  if (creds.refresh_token) {
    const refreshed = await refreshAccessToken(creds.refresh_token, env);
    if (refreshed) {
      // Save new credentials
      await saveCredentials(refreshed, env);
      return refreshed.access_token;
    }
  }

  // No refresh token or refresh failed
  debugLog("Session expired. Please run 'jfp login' to sign in again.", env);
  return null;
}

/**
 * Check if user is currently logged in
 */
export async function isLoggedIn(env = process.env): Promise<boolean> {
  const token = await getAccessToken(env);
  return token !== null;
}

/**
 * Get current user info if logged in
 * Triggers auto-refresh if token is expired but refresh token is available.
 * Returns null if:
 * - Not logged in
 * - Using JFP_TOKEN env var (no user info available)
 * - Refresh failed and credentials are expired
 */
export async function getCurrentUser(env = process.env): Promise<{ email: string; tier: string; userId: string } | null> {
  // Trigger auto-refresh if needed (this may update the credentials file)
  await getAccessToken(env);

  // Load credentials (possibly refreshed)
  const creds = await loadCredentials(env);
  if (!creds || isExpired(creds)) {
    return null;
  }

  return {
    email: creds.email,
    tier: creds.tier,
    userId: creds.user_id,
  };
}

/**
 * Authenticated fetch wrapper
 * Automatically adds Authorization header with a valid access token
 * Returns null if not logged in (token unavailable or refresh failed)
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  env = process.env
): Promise<Response | null> {
  const token = await getAccessToken(env);

  if (!token) {
    debugLog("No valid token available for authenticated request", env);
    return null;
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
