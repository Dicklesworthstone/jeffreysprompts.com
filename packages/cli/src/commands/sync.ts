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
  acquireSyncLock,
  releaseSyncLock,
} from "../lib/offline";

export interface SyncOptions {
  force?: boolean;
  status?: boolean;
  json?: boolean;
}

export type VaultCompatAction = "sync" | "status" | string | undefined;

interface PromptsPage {
  prompts: unknown[];
  pagination?: {
    hasMore?: boolean;
    total?: number;
  };
}

const PROMPTS_PAGE_LIMIT = 100;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizePromptsPage(payload: unknown): PromptsPage | null {
  if (!isRecord(payload)) return null;

  if (Array.isArray(payload.prompts)) {
    return {
      prompts: payload.prompts,
      pagination: isRecord(payload.pagination)
        ? {
            hasMore: payload.pagination.hasMore === true,
            total:
              typeof payload.pagination.total === "number"
                ? payload.pagination.total
                : undefined,
          }
        : undefined,
    };
  }

  if (payload.ok === true && isRecord(payload.data)) {
    return normalizePromptsPage(payload.data);
  }

  return null;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tags = value.filter((tag): tag is string => typeof tag === "string");
  return tags.length > 0 ? tags : undefined;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toSyncedPrompt(prompt: unknown): SyncedPrompt | null {
  if (!isRecord(prompt)) return null;

  if (
    typeof prompt.id !== "string" ||
    typeof prompt.title !== "string" ||
    typeof prompt.content !== "string"
  ) {
    return null;
  }

  const savedAt =
    normalizeOptionalString(prompt.saved_at) ??
    normalizeOptionalString(prompt.updated_at) ??
    normalizeOptionalString(prompt.updatedAt) ??
    normalizeOptionalString(prompt.created_at) ??
    normalizeOptionalString(prompt.createdAt);

  if (!savedAt) return null;

  return {
    id: prompt.id,
    title: prompt.title,
    content: prompt.content,
    saved_at: savedAt,
    description: normalizeOptionalString(prompt.description),
    category: normalizeOptionalString(prompt.category),
    tags: normalizeTags(prompt.tags),
  };
}

function summarizePromptChanges(
  existing: SyncedPrompt[],
  incoming: SyncedPrompt[]
): { changedPrompts: number; newPrompts: number } {
  const existingById = new Map(existing.map((prompt) => [prompt.id, prompt]));
  let changedCount = 0;
  let newCount = 0;

  for (const prompt of incoming) {
    const previous = existingById.get(prompt.id);
    if (!previous) {
      newCount += 1;
      changedCount += 1;
    } else if (JSON.stringify(previous) !== JSON.stringify(prompt)) {
      changedCount += 1;
    }
  }

  return { changedPrompts: changedCount, newPrompts: newCount };
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

  // Step 3: Acquire sync lock to prevent concurrent sync operations
  if (!acquireSyncLock()) {
    if (shouldOutputJson(options)) {
      writeJsonError("sync_in_progress", "Another sync operation is in progress. Please wait and try again.");
    } else {
      console.error(chalk.yellow("Another sync operation is in progress. Please wait and try again."));
    }
    process.exit(1);
  }

  // Step 4: Fetch the canonical prompt listing and refresh the local snapshot.
  const spinner = shouldOutputJson(options) ? null : ora("Syncing library...").start();

  try {
    const incomingPrompts: SyncedPrompt[] = [];
    let page = 1;
    let expectedTotal: number | undefined;

    while (true) {
      const endpoint = `/cli/prompts?page=${page}&limit=${PROMPTS_PAGE_LIMIT}`;
      const response = await apiClient.get<unknown>(endpoint);

      if (!response.ok) {
        spinner?.fail("Sync failed");

        // Handle auth errors
        if (isAuthError(response)) {
          releaseSyncLock();
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
          releaseSyncLock();
          if (shouldOutputJson(options)) {
            writeJsonError("requires_premium", "Library sync requires a premium subscription");
          } else {
            console.error(chalk.yellow("Library sync requires a premium subscription"));
            console.log(chalk.dim("Visit https://pro.jeffreysprompts.com/pricing to upgrade"));
          }
          process.exit(1);
        }

        // Other errors
        releaseSyncLock();
        if (shouldOutputJson(options)) {
          writeJsonError("sync_failed", response.error || "Failed to sync library");
        } else {
          console.error(chalk.red("Failed to sync:"), response.error);
        }
        process.exit(1);
      }

      const parsedPage = normalizePromptsPage(response.data);
      if (!parsedPage) {
        spinner?.fail("Sync failed");
        releaseSyncLock();
        if (shouldOutputJson(options)) {
          writeJsonError("invalid_sync_payload", "Sync response is missing prompts array.");
        } else {
          console.error(chalk.red("Sync failed:"), "Sync response is missing prompts array.");
        }
        process.exit(1);
        return;
      }

      const normalizedPrompts = parsedPage.prompts.map(toSyncedPrompt);
      const validPrompts = normalizedPrompts.filter(
        (prompt): prompt is SyncedPrompt => prompt !== null
      );
      const invalidCount = normalizedPrompts.length - validPrompts.length;
      if (invalidCount > 0) {
        spinner?.fail("Sync failed");
        releaseSyncLock();
        if (shouldOutputJson(options)) {
          writeJsonError(
            "invalid_sync_payload",
            `Sync response contains ${invalidCount} invalid prompt(s).`
          );
        } else {
          console.error(
            chalk.red("Sync failed:"),
            `Sync response contains ${invalidCount} invalid prompt(s).`
          );
        }
        process.exit(1);
        return;
      }

      incomingPrompts.push(...validPrompts);
      expectedTotal = parsedPage.pagination?.total ?? expectedTotal;

      if (!parsedPage.pagination?.hasMore) {
        break;
      }

      page += 1;
      if (page > 1000) {
        spinner?.fail("Sync failed");
        releaseSyncLock();
        if (shouldOutputJson(options)) {
          writeJsonError("invalid_sync_payload", "Sync pagination exceeded the safety limit.");
        } else {
          console.error(chalk.red("Sync failed:"), "Sync pagination exceeded the safety limit.");
        }
        process.exit(1);
        return;
      }
    }

    const existingPrompts = readOfflineLibrary();
    const { changedPrompts, newPrompts } = summarizePromptChanges(
      existingPrompts,
      incomingPrompts
    );

    // Save to local cache
    const syncedAt = new Date().toISOString();
    writeLibrary(incomingPrompts);
    writeMeta({
      lastSync: syncedAt,
      promptCount: incomingPrompts.length,
      version: "1.0.0",
    });

    spinner?.succeed("Library synced");

    if (shouldOutputJson(options)) {
      writeJson({
        synced: true,
        changedPrompts,
        newPrompts,
        totalPrompts: incomingPrompts.length,
        expectedTotal: expectedTotal ?? incomingPrompts.length,
        force: options.force ?? false,
        syncedAt,
      });
    } else {
      if (options.force) {
        console.log(chalk.green(`\nDownloaded ${incomingPrompts.length} prompts to local library`));
      } else if (changedPrompts === 0) {
        console.log(chalk.dim("\nLibrary is already up to date"));
      } else {
        console.log(chalk.green(`\nSynced ${changedPrompts} changed prompts (${incomingPrompts.length} total)`));
      }
      console.log(chalk.dim(`Location: ${getLibraryDir()}`));
    }
  } catch (err) {
    spinner?.fail("Sync failed");
    releaseSyncLock();
    if (shouldOutputJson(options)) {
      writeJsonError("sync_failed", err instanceof Error ? err.message : "Unknown error");
    } else {
      console.error(chalk.red("Sync failed:"), err instanceof Error ? err.message : err);
    }
    process.exit(1);
  }

  // Release the lock on success
  releaseSyncLock();
}

export async function vaultSyncCompatCommand(
  action: VaultCompatAction,
  options: SyncOptions = {}
): Promise<void> {
  if (action === "sync") {
    return syncCommand(options);
  }

  if (action === "status") {
    return syncCommand({ ...options, status: true });
  }

  const message =
    action === undefined
      ? "The vault command namespace is obsolete. Run 'jfp sync' to refresh your local prompt cache."
      : `The vault ${action} command is not available in this CLI build. Run 'jfp sync' to refresh your local prompt cache.`;

  if (shouldOutputJson(options)) {
    writeJsonError("deprecated_command", message, { replacement: "jfp sync" });
  } else {
    console.error(chalk.yellow(message));
  }
  process.exit(1);
}
