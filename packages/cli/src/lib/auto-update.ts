/**
 * Auto-Update Check
 *
 * Checks for CLI updates on startup (once per day) and notifies the user.
 * Runs asynchronously to not block CLI startup.
 */

import chalk from "chalk";
import { version } from "../../package.json";
import { loadConfig, saveConfig } from "./config";
import { compareVersions } from "./version";
import { spawn } from "child_process";

const GITHUB_OWNER = "Dicklesworthstone";
const GITHUB_REPO = "jeffreysprompts.com";
const RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// Check once per day (in milliseconds)
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface GithubRelease {
  tag_name: string;
  name: string;
  html_url: string;
}

function shouldCheck(lastCheck: string | null): boolean {
  if (!lastCheck) return true;
  const lastCheckDate = new Date(lastCheck);
  if (Number.isNaN(lastCheckDate.getTime())) return true;
  return Date.now() - lastCheckDate.getTime() > CHECK_INTERVAL_MS;
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(RELEASE_API, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": `jfp-cli/${version}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const release = (await response.json()) as GithubRelease;
    return release.tag_name.replace(/^v/, "");
  } catch {
    return null;
  }
}

/**
 * Check for updates in the background and print a notification if available.
 * This function returns immediately and does not block.
 * 
 * Strategy:
 * 1. Check if we have a cached update notification from previous run
 * 2. If check is due, spawn a detached process to check and update cache
 */
export function checkForUpdatesInBackground(): void {
  // Never run update checks in non-interactive contexts. This avoids spawning
  // background processes during tests/CI and prevents hanging piped/JSON runs.
  // Humans still get update notifications in normal TTY usage.
  if (process.argv.includes("--json") || process.argv.includes("serve") || !process.stdout.isTTY) {
    return;
  }

  const config = loadConfig();

  // Skip if auto-check is disabled
  if (!config.updates.autoCheck) return;

  // 1. Check for cached update info (instant)
  if (
    config.updates.latestKnownVersion &&
    compareVersions(version, config.updates.latestKnownVersion) < 0
  ) {
    // Use setImmediate to print after CLI output settles
    setTimeout(() => {
      console.log();
      console.log(chalk.cyan("─".repeat(50)));
      console.log(
        chalk.cyan("📦 Update available: ") +
          chalk.yellow(version) +
          chalk.dim(" → ") +
          chalk.green(config.updates.latestKnownVersion)
      );
      console.log(chalk.dim("   Run 'jfp update-cli' to update"));
      console.log(chalk.cyan("─".repeat(50)));
    }, 100);
  }

  // 2. Check if we need to refresh (spawn detached)
  if (shouldCheck(config.updates.lastCheck)) {
    try {
      const isDev = process.argv[0].endsWith("bun");
      const cmd = process.argv[0];
      const args = isDev 
        ? [process.argv[1], "update-check-internal"] 
        : ["update-check-internal"];

      // Spawn detached process that won't block the parent from exiting
      spawn(cmd, args, {
        detached: true,
        stdio: "ignore",
      }).unref();
    } catch {
      // Silently ignore spawning errors
    }
  }
}

/**
 * Check for updates synchronously and return info (for --version command enhancement)
 */
export async function checkForUpdates(): Promise<{
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
}> {
  const config = loadConfig();
  const latestVersion = await fetchLatestVersion();

  // Record check
  if (config.updates.autoCheck) {
    // Record manually since we did the work
    const next = {
      ...config.updates,
      lastCheck: new Date().toISOString(),
      latestKnownVersion: latestVersion ?? config.updates.latestKnownVersion,
    };
    saveConfig({ updates: next });
  }

  return {
    currentVersion: version,
    latestVersion,
    hasUpdate: latestVersion !== null && compareVersions(version, latestVersion) < 0,
  };
}
