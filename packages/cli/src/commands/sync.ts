/**
 * Sync Command
 *
 * Syncs the user's premium library to local cache for offline access.
 * Requires authentication and premium subscription.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import boxen from "boxen";
import ora from "ora";
import { apiClient, isAuthError, isPermissionError } from "../lib/api-client";
import { isLoggedIn, getCurrentUser } from "../lib/credentials";
import { getConfigDir } from "../lib/config";
import { shouldOutputJson } from "../lib/utils";

export interface SyncOptions {
  force?: boolean;
  status?: boolean;
  json?: boolean;
}

interface SyncedPrompt {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  saved_at: string;
}

interface SyncResponse {
  prompts: SyncedPrompt[];
  total: number;
  last_modified: string;
}

interface SyncMeta {
  lastSync: string;
  promptCount: number;
  version: string;
}

function getLibraryDir(): string {
  return join(getConfigDir(), "library");
}

function getLibraryPath(): string {
  return join(getLibraryDir(), "prompts.json");
}

function getMetaPath(): string {
  return join(getLibraryDir(), "sync.meta.json");
}

function readMeta(): SyncMeta | null {
  const metaPath = getMetaPath();
  if (!existsSync(metaPath)) return null;
  try {
    return JSON.parse(readFileSync(metaPath, "utf-8")) as SyncMeta;
  } catch {
    return null;
  }
}

function writeMeta(meta: SyncMeta): void {
  const libraryDir = getLibraryDir();
  mkdirSync(libraryDir, { recursive: true });
  writeFileSync(getMetaPath(), JSON.stringify(meta, null, 2));
}

function writeLibrary(prompts: SyncedPrompt[]): void {
  const libraryDir = getLibraryDir();
  mkdirSync(libraryDir, { recursive: true });
  writeFileSync(getLibraryPath(), JSON.stringify(prompts, null, 2));
}

function readLibrary(): SyncedPrompt[] {
  const libraryPath = getLibraryPath();
  if (!existsSync(libraryPath)) return [];
  try {
    return JSON.parse(readFileSync(libraryPath, "utf-8")) as SyncedPrompt[];
  } catch {
    return [];
  }
}

function formatAge(isoDate: string | undefined | null): string {
  if (!isoDate) return "never";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "unknown";
  const ms = Date.now() - date.getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return `${Math.floor(ms / 60000)} min ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours ago`;
  return `${Math.floor(ms / 86400000)} days ago`;
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

/**
 * Show sync status
 */
async function showStatus(options: SyncOptions): Promise<void> {
  const meta = readMeta();
  const prompts = readLibrary();
  const user = await getCurrentUser();
  const loggedIn = await isLoggedIn();

  if (shouldOutputJson(options)) {
    writeJson({
      synced: meta !== null,
      lastSync: meta?.lastSync ?? null,
      promptCount: prompts.length,
      libraryPath: getLibraryPath(),
      authenticated: loggedIn,
      user: user ? { email: user.email, tier: user.tier } : null,
    });
    return;
  }

  let content = chalk.bold.cyan("Library Sync Status") + "\n\n";

  // Auth status
  content += chalk.green("Authentication:") + "\n";
  if (!loggedIn) {
    content += `  Status: ${chalk.yellow("Not logged in")}\n`;
    content += `  ${chalk.dim("Run 'jfp login' to sign in")}\n`;
  } else {
    content += `  Status: ${chalk.green("Authenticated")}\n`;
    if (user?.email) {
      content += `  Email: ${user.email}\n`;
    }
    if (user?.tier) {
      content += `  Tier: ${user.tier}\n`;
    }
  }

  // Sync status
  content += "\n" + chalk.green("Library:") + "\n";
  if (meta) {
    content += `  Last sync: ${formatAge(meta.lastSync)} (${meta.lastSync})\n`;
    content += `  Prompts: ${prompts.length}\n`;
    content += `  Path: ${chalk.dim(getLibraryDir())}\n`;
  } else {
    content += `  Status: ${chalk.yellow("Never synced")}\n`;
    content += `  Path: ${chalk.dim(getLibraryDir())}\n`;
  }

  console.log(boxen(content, {
    padding: 1,
    borderStyle: "round",
    borderColor: "cyan",
  }));

  if (!meta) {
    console.log(chalk.dim("\nRun 'jfp sync' to download your library."));
  }
}

/**
 * Sync the user's premium library to local cache
 */
export async function syncCommand(options: SyncOptions = {}): Promise<void> {
  // Handle --status flag
  if (options.status) {
    return showStatus(options);
  }

  // Step 1: Check if user is authenticated
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "Please log in to sync your library", {
        hint: "Run 'jfp login' to sign in",
      });
    } else {
      console.error(chalk.yellow("Please log in to sync your library"));
      console.log(chalk.dim("Run 'jfp login' to sign in"));
    }
    process.exit(1);
  }

  // Step 2: Check if user has premium tier
  const user = await getCurrentUser();
  if (user && user.tier !== "premium") {
    if (shouldOutputJson(options)) {
      writeJsonError("requires_premium", "Library sync requires a premium subscription", {
        tier: user.tier,
      });
    } else {
      console.error(chalk.yellow("Library sync requires a premium subscription"));
      console.log(chalk.dim("Visit https://pro.jeffreysprompts.com to upgrade"));
    }
    process.exit(1);
  }

  // Step 3: Get current meta for incremental sync (unless --force)
  const meta = options.force ? null : readMeta();
  const spinner = shouldOutputJson(options) ? null : ora("Syncing library...").start();

  try {
    // Build query params for incremental sync
    const params = new URLSearchParams();
    if (meta?.lastSync && !options.force) {
      params.set("since", meta.lastSync);
    }

    const endpoint = `/cli/library${params.toString() ? `?${params}` : ""}`;
    const response = await apiClient.get<SyncResponse>(endpoint);

    if (!response.ok) {
      spinner?.fail("Sync failed");

      // Handle auth errors
      if (isAuthError(response)) {
        if (shouldOutputJson(options)) {
          writeJsonError("session_expired", "Your session has expired. Please log in again.", {
            hint: "Run 'jfp login' to sign in",
          });
        } else {
          console.error(chalk.yellow("Your session has expired. Please log in again."));
          console.log(chalk.dim("Run 'jfp login' to sign in"));
        }
        process.exit(1);
      }

      // Handle permission errors
      if (isPermissionError(response)) {
        if (shouldOutputJson(options)) {
          writeJsonError("requires_premium", "Library sync requires a premium subscription");
        } else {
          console.error(chalk.yellow("Library sync requires a premium subscription"));
          console.log(chalk.dim("Visit https://pro.jeffreysprompts.com to upgrade"));
        }
        process.exit(1);
      }

      // Other errors
      if (shouldOutputJson(options)) {
        writeJsonError("sync_failed", response.error || "Failed to sync library");
      } else {
        console.error(chalk.red("Failed to sync:"), response.error);
      }
      process.exit(1);
    }

    const data = response.data!;

    // Merge with existing prompts for incremental sync
    let allPrompts: SyncedPrompt[];
    if (options.force) {
      allPrompts = data.prompts;
    } else {
      const existing = readLibrary();
      const existingIds = new Set(existing.map((p) => p.id));
      const newPrompts = data.prompts.filter((p) => !existingIds.has(p.id));
      allPrompts = [...existing, ...newPrompts];
    }

    // Save to local cache
    writeLibrary(allPrompts);
    writeMeta({
      lastSync: new Date().toISOString(),
      promptCount: allPrompts.length,
      version: "1.0.0",
    });

    spinner?.succeed("Library synced");

    if (shouldOutputJson(options)) {
      writeJson({
        synced: true,
        newPrompts: data.prompts.length,
        totalPrompts: allPrompts.length,
        force: options.force ?? false,
        syncedAt: new Date().toISOString(),
      });
    } else {
      if (options.force) {
        console.log(chalk.green(`\nDownloaded ${allPrompts.length} prompts to local library`));
      } else if (data.prompts.length === 0) {
        console.log(chalk.dim("\nLibrary is already up to date"));
      } else {
        console.log(chalk.green(`\nSynced ${data.prompts.length} new prompts (${allPrompts.length} total)`));
      }
      console.log(chalk.dim(`Location: ${getLibraryDir()}`));
    }
  } catch (err) {
    spinner?.fail("Sync failed");
    if (shouldOutputJson(options)) {
      writeJsonError("sync_failed", err instanceof Error ? err.message : "Unknown error");
    } else {
      console.error(chalk.red("Sync failed:"), err instanceof Error ? err.message : err);
    }
    process.exit(1);
  }
}
