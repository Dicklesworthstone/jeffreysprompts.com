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
import { readFile, writeFile, mkdir, unlink, rename } from "fs/promises";
import { existsSync } from "fs";
import { randomBytes } from "crypto";
import { z } from "zod";

// Premium API URL for token refresh
const PREMIUM_URL = process.env.JFP_PREMIUM_URL ?? "https://pro.jeffreysprompts.com";

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
export function getCredentialsPath(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  // Use process.env.HOME directly for testability (homedir() caches)
  const home = process.env.HOME || homedir();
  const configDir = xdgConfig || join(home, ".config");
  return join(configDir, "jfp", "credentials.json");
}

/**
 * Get config directory path
 */
function getConfigDir(): string {
  return dirname(getCredentialsPath());
}

/**
 * Load credentials from disk
 * Returns null if not logged in or credentials are invalid
 * Uses Zod schema for complete runtime validation
 */
export async function loadCredentials(): Promise<Credentials | null> {
  const path = getCredentialsPath();

  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = await readFile(path, "utf-8");
    const parsed = JSON.parse(content);

    // Validate with Zod schema - ensures all required fields are present with correct types
    const result = CredentialsSchema.safeParse(parsed);
    if (!result.success) {
      debugLog(`Invalid credentials file: ${result.error.message}`);
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
  const now = new Date();

  // Consider expired 5 minutes before actual expiry (buffer for clock skew)
  const bufferMs = 5 * 60 * 1000;
  return now.getTime() > expiresAt.getTime() - bufferMs;
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
export async function saveCredentials(creds: Credentials): Promise<void> {
  const path = getCredentialsPath();
  const dir = getConfigDir();

  // Ensure config directory exists with secure permissions
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true, mode: 0o700 });
  }

  // Write atomically via temp file with random suffix to prevent race conditions
  const suffix = randomBytes(8).toString("hex");
  const tempPath = `${path}.${suffix}.tmp`;
  const content = JSON.stringify(creds, null, 2);

  try {
    await writeFile(tempPath, content, { mode: 0o600 }); // User read/write only
    await rename(tempPath, path);
  } catch (err) {
    // Clean up temp file on failure
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}

/**
 * Clear stored credentials (logout)
 */
export async function clearCredentials(): Promise<void> {
  const path = getCredentialsPath();

  if (existsSync(path)) {
    await unlink(path);
  }
}

/**
 * Debug logging helper
 */
function debugLog(message: string): void {
  if (process.env.JFP_DEBUG) {
    console.error(`[jfp] ${message}`);
  }
}

/**
 * Attempt to refresh the access token using the refresh token
 * Returns new credentials on success, null on failure
 */
async function refreshAccessToken(refreshToken: string): Promise<Credentials | null> {
  debugLog("Access token expired, attempting refresh...");

  try {
    const response = await fetch(`${PREMIUM_URL}/api/cli/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: refreshToken,
        client_id: "jfp-cli",
      }),
    });

    if (!response.ok) {
      debugLog(`Refresh failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_at: string;
      email: string;
      tier: "free" | "premium";
      user_id: string;
    };

    debugLog(`Refresh successful, new token expires: ${data.expires_at}`);

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? refreshToken, // Keep old refresh token if not provided
      expires_at: data.expires_at,
      email: data.email,
      tier: data.tier,
      user_id: data.user_id,
    };
  } catch (err) {
    // Network error - return null to fail gracefully
    debugLog(`Refresh error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Get access token for API calls
 * Automatically refreshes if token is expired and refresh token is available
 * Returns null if not logged in or refresh fails
 * Handles environment variable override (for CI/CD)
 */
export async function getAccessToken(): Promise<string | null> {
  // Environment variable takes precedence (for CI/CD)
  const envToken = process.env.JFP_TOKEN;
  if (envToken) {
    return envToken;
  }

  const creds = await loadCredentials();
  if (!creds) {
    return null;
  }

  // Return current token if not expired
  if (!isExpired(creds)) {
    return creds.access_token;
  }

  // Token expired - try to refresh
  if (creds.refresh_token) {
    const refreshed = await refreshAccessToken(creds.refresh_token);
    if (refreshed) {
      // Save new credentials
      await saveCredentials(refreshed);
      return refreshed.access_token;
    }
  }

  // No refresh token or refresh failed
  debugLog("Session expired. Please run 'jfp login' to sign in again.");
  return null;
}

/**
 * Check if user is currently logged in
 */
export async function isLoggedIn(): Promise<boolean> {
  const token = await getAccessToken();
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
export async function getCurrentUser(): Promise<{ email: string; tier: string; userId: string } | null> {
  // Trigger auto-refresh if needed (this may update the credentials file)
  await getAccessToken();

  // Load credentials (possibly refreshed)
  const creds = await loadCredentials();
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
  options: RequestInit = {}
): Promise<Response | null> {
  const token = await getAccessToken();

  if (!token) {
    debugLog("No valid token available for authenticated request");
    return null;
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
