/**
 * Auto-Update Check
 *
 * Checks for CLI updates on startup (once per day) and notifies the user.
 * Runs asynchronously to not block CLI startup.
 */

import chalk from "chalk";
import { version } from "../../package.json";
import { loadConfig, saveConfig } from "./config";

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

function parseVersion(v: string): [number, number, number] {
  const clean = v.replace(/^v/, "");
  const parts = clean.split(".").map((p) => parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = parseVersion(a);
  const [bMajor, bMinor, bPatch] = parseVersion(b);

  if (aMajor !== bMajor) return aMajor < bMajor ? -1 : 1;
  if (aMinor !== bMinor) return aMinor < bMinor ? -1 : 1;
  if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;
  return 0;
}

function shouldCheck(lastCheck: string | null): boolean {
  if (!lastCheck) return true;
  const lastCheckDate = new Date(lastCheck);
  if (isNaN(lastCheckDate.getTime())) return true;
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

function recordCheck(config: ReturnType<typeof loadConfig>): void {
  const next = {
    ...config.updates,
    lastCheck: new Date().toISOString(),
  };
  saveConfig({ updates: next });
}

/**
 * Check for updates in the background and print a notification if available.
 * This function returns immediately and does not block.
 */
export function checkForUpdatesInBackground(): void {
  const config = loadConfig();

  // Skip if auto-check is disabled
  if (!config.updates.autoCheck) return;

  // Skip if we checked recently
  if (!shouldCheck(config.updates.lastCheck)) return;

  // Run check in background (don't await)
  (async () => {
    try {
      const latestVersion = await fetchLatestVersion();
      if (!latestVersion) return;

      // Record that we checked
      recordCheck(config);

      // Compare versions
      if (compareVersions(version, latestVersion) < 0) {
        // Don't pollute JSON output
        if (process.argv.includes("--json")) return;

        // Use setImmediate/setTimeout to print after CLI output settles
        setTimeout(() => {
          console.log();
          console.log(chalk.cyan("─".repeat(50)));
          console.log(
            chalk.cyan("📦 Update available: ") +
              chalk.yellow(version) +
              chalk.dim(" → ") +
              chalk.green(latestVersion)
          );
          console.log(chalk.dim("   Run 'jfp update-cli' to update"));
          console.log(chalk.cyan("─".repeat(50)));
        }, 100);
      }
    } catch {
      // Silently ignore errors - don't disrupt CLI usage
    }
  })();
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
    recordCheck(config);
  }

  return {
    currentVersion: version,
    latestVersion,
    hasUpdate: latestVersion !== null && compareVersions(version, latestVersion) < 0,
  };
}
