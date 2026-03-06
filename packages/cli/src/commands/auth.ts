/**
 * Authentication Commands: logout and whoami
 *
 * logout - Clear stored credentials and optionally revoke token on server
 * whoami - Show current user info (email, tier, token expiry)
 */

import chalk from "chalk";
import boxen from "boxen";
import {
  loadCredentials,
  clearCredentials,
  getAccessToken,
} from "../lib/credentials";
import { apiClient } from "../lib/api-client";
import { shouldOutputJson } from "../lib/utils";

interface AuthCommandOptions {
  json?: boolean;
}

interface LogoutOptions extends AuthCommandOptions {
  revoke?: boolean;
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

/**
 * Show current user information
 */
export async function whoamiCommand(options: AuthCommandOptions = {}): Promise<void> {
  // Check for env var token first
  const envToken = process.env.JFP_TOKEN;
  if (envToken) {
    if (shouldOutputJson(options)) {
      writeJson({
        authenticated: true,
        source: "environment",
        message: "Authenticated via JFP_TOKEN environment variable",
        note: "User details not available with token-based auth",
      });
    } else {
      console.log(chalk.green("Authenticated via JFP_TOKEN environment variable"));
      console.log(chalk.dim("User details not available with token-based auth"));
    }
    return;
  }

  // Load credentials before refresh so we can distinguish between
  // "never logged in" and "session expired and refresh failed".
  const storedCreds = await loadCredentials();

  if (!storedCreds) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "Not logged in", { authenticated: false });
    } else {
      console.log(chalk.yellow("Not logged in"));
      console.log(chalk.dim("Run 'jfp login' to sign in to JeffreysPrompts Premium"));
    }
    process.exit(1);
  }

  const token = await getAccessToken();
  const creds = (await loadCredentials()) ?? storedCreds;

  if (!token) {
    const expiresAt = new Date(creds.expires_at);
    if (shouldOutputJson(options)) {
      writeJsonError("session_expired", "Session expired. Please run 'jfp login' again.", {
        authenticated: false,
        email: creds.email,
        tier: creds.tier,
        user_id: creds.user_id,
        expires_at: creds.expires_at,
        expired: true,
      });
    } else {
      console.log(chalk.yellow("Session expired"));
      console.log(chalk.dim(`  Email: ${creds.email}`));
      console.log(chalk.dim(`  Tier:  ${creds.tier}`));
      console.log(chalk.red(`  Token expired at ${expiresAt.toLocaleString()}`));
      console.log(chalk.dim("\nRun 'jfp login' to sign in again"));
    }
    process.exit(1);
  }

  const expiresAt = new Date(creds.expires_at);
  const expiresAtMs = expiresAt.getTime();
  const expiresIn = Number.isFinite(expiresAtMs) ? formatTimeUntil(expiresAt) : "unknown";
  const expiresInSeconds = Number.isFinite(expiresAtMs)
    ? Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
    : null;

  if (shouldOutputJson(options)) {
    writeJson({
      authenticated: true,
      email: creds.email,
      tier: creds.tier,
      user_id: creds.user_id,
      expires_at: creds.expires_at,
      expires_in: expiresInSeconds,
      expired: false,
      source: "credentials_file",
    });
    return;
  }

  console.log(
    boxen(
      chalk.green("Logged in\n\n") +
        `${chalk.dim("Email:")} ${chalk.bold(creds.email)}\n` +
        `${chalk.dim("Tier:")}  ${chalk.cyan(creds.tier)}\n` +
        `${chalk.dim("Expires:")} ${expiresIn}`,
      {
        padding: 1,
        borderStyle: "round",
        borderColor: "green",
      }
    )
  );
}

/**
 * Log out: clear credentials and optionally revoke token
 */
export async function logoutCommand(options: LogoutOptions = {}): Promise<void> {
  // Check if logged in via env var
  const envToken = process.env.JFP_TOKEN;
  if (envToken) {
    if (shouldOutputJson(options)) {
      writeJsonError("env_token", "Cannot logout when using JFP_TOKEN environment variable", {
        hint: "Unset the JFP_TOKEN environment variable to logout",
      });
    } else {
      console.log(chalk.yellow("Cannot logout when using JFP_TOKEN environment variable"));
      console.log(chalk.dim("Unset the JFP_TOKEN environment variable to logout"));
    }
    process.exit(1);
  }

  // Load credentials to check if logged in
  const creds = await loadCredentials();

  if (!creds) {
    if (shouldOutputJson(options)) {
      writeJson({
        logged_out: true,
        message: "Not logged in (nothing to do)",
      });
    } else {
      console.log(chalk.dim("Not logged in (nothing to do)"));
    }
    return;
  }

  const email = creds.email;

  // Optionally revoke token on server
  if (options.revoke) {
    if (!shouldOutputJson(options)) {
      console.log(chalk.dim("Revoking token on server..."));
    }

    try {
      const response = await apiClient.post("/cli/revoke");
      if (!response.ok) {
        // Log warning but continue with local logout
        if (!shouldOutputJson(options)) {
          console.log(chalk.yellow(`Warning: Could not revoke token on server (${response.error})`));
        }
      }
    } catch {
      // Network error - continue with local logout
      if (!shouldOutputJson(options)) {
        console.log(chalk.yellow("Warning: Could not reach server to revoke token"));
      }
    }
  }

  // Clear local credentials
  await clearCredentials();

  if (shouldOutputJson(options)) {
    writeJson({
      logged_out: true,
      email,
      revoked: options.revoke ?? false,
      message: `Logged out from ${email}`,
    });
  } else {
    console.log(chalk.green(`Logged out from ${email}`));
    if (options.revoke) {
      console.log(chalk.dim("Token revoked on server"));
    }
  }
}

/**
 * Format time until expiry in human-readable form
 */
function formatTimeUntil(date: Date): string {
  const diff = date.getTime() - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}, ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
