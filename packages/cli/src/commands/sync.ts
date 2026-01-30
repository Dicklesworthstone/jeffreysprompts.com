/**
 * Sync Command
 *
 * Syncs the user's premium library to local cache for offline access.
 * Requires authentication and premium subscription.
 */

import { atomicWriteFileSync } from "../lib/utils";
import chalk from "chalk";
import boxen from "boxen";
import ora from "ora";
import { apiClient, isAuthError, isPermissionError } from "../lib/api-client";
import { isLoggedIn, getCurrentUser } from "../lib/credentials";
import { shouldOutputJson } from "../lib/utils";
import {
  type SyncedPrompt,
  type SyncMeta,
  getLibraryDir,
  getLibraryPath,
  getMetaPath,
  readOfflineLibrary,
  readSyncMeta,
  formatSyncAge,
} from "../lib/offline";

export interface SyncOptions {
  force?: boolean;
  status?: boolean;
  json?: boolean;
}

interface SyncResponse {
  prompts: SyncedPrompt[];
  total: number;
  last_modified: string;
}

function writeMeta(meta: SyncMeta): void {
  const content = JSON.stringify(meta, null, 2);
  atomicWriteFileSync(getMetaPath(), content);
}

function writeLibrary(prompts: SyncedPrompt[]): void {
  const content = JSON.stringify(prompts, null, 2);
  atomicWriteFileSync(getLibraryPath(), content);
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
  const meta = readSyncMeta();
  const prompts = readOfflineLibrary();
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
    content += `  Last sync: ${formatSyncAge(meta.lastSync)} (${meta.lastSync})\n`;
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
      console.log(chalk.dim("Visit https://pro.jeffreysprompts.com/pricing to upgrade"));
    }
    process.exit(1);
  }

  // Step 3: Get current meta for incremental sync (unless --force)
  const meta = options.force ? null : readSyncMeta();
  const spinner = shouldOutputJson(options) ? null : ora("Syncing library...").start();

  try {
    // Build query params for incremental sync
    const params = new URLSearchParams();
    if (meta?.lastSync && !options.force) {
      params.set("since", meta.lastSync);
    }

    const endpoint = `/cli/sync${params.toString() ? `?${params}` : ""}`;
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
          console.log(chalk.dim("Visit https://pro.jeffreysprompts.com/pricing to upgrade"));
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
      const existing = readOfflineLibrary();
      // Create a map of server prompts for efficient lookup
      const serverPromptMap = new Map(data.prompts.map((p) => [p.id, p]));
      // Update existing prompts with server versions, keep others unchanged
      const mergedExisting = existing.map((p) => serverPromptMap.get(p.id) ?? p);
      // Add any new prompts that weren't in existing
      const existingIds = new Set(existing.map((p) => p.id));
      const newPrompts = data.prompts.filter((p) => !existingIds.has(p.id));
      allPrompts = [...mergedExisting, ...newPrompts];
    }

    // Save to local cache
    const syncedAt = data.last_modified || new Date().toISOString();
    writeLibrary(allPrompts);
    writeMeta({
      lastSync: syncedAt,
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
        syncedAt,
      });
    } else {
      if (options.force) {
        console.log(chalk.green(`\nDownloaded ${allPrompts.length} prompts to local library`));
      } else if (data.prompts.length === 0) {
        console.log(chalk.dim("\nLibrary is already up to date"));
      } else {
        console.log(chalk.green(`\nSynced ${data.prompts.length} prompts (${allPrompts.length} total)`));
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
