import { type Prompt } from "@jeffreysprompts/core/prompts";
import Table from "cli-table3";
import chalk from "chalk";
import { apiClient, isAuthError, requiresPremium } from "../lib/api-client";
import { isLoggedIn } from "../lib/credentials";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";
import {
  hasOfflineLibrary,
  normalizePromptCategory,
  readOfflineLibrary,
  readSyncMeta,
  formatSyncAge,
} from "../lib/offline";

interface ListOptions {
  category?: string;
  tag?: string;
  json?: boolean;
  mine?: boolean;
  saved?: boolean;
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

function normalizePromptPayload(payload: unknown): Prompt[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload as Prompt[];
  }
  if (typeof payload === "object" && payload !== null) {
    const data = payload as { prompts?: unknown };
    if (Array.isArray(data.prompts)) {
      return data.prompts as Prompt[];
    }
  }
  return [];
}

function mergePrompts(base: Prompt[], extras: Prompt[]): Prompt[] {
  if (!extras.length) return base;
  const merged = base.slice();
  const indexById = new Map(merged.map((prompt, index) => [prompt.id, index]));
  for (const prompt of extras) {
    const index = indexById.get(prompt.id);
    if (index === undefined) {
      indexById.set(prompt.id, merged.length);
      merged.push(prompt);
    } else {
      merged[index] = prompt;
    }
  }
  return merged;
}

function applyFilters(results: Prompt[], options: ListOptions): Prompt[] {
  let filtered = results;

  if (options.category) {
    filtered = filtered.filter((p) => p.category === options.category);
  }

  if (options.tag) {
    filtered = filtered.filter((p) => p.tags.includes(options.tag!));
  }

  return filtered;
}

interface FetchResult {
  prompts: Prompt[];
  offline?: boolean;
  offlineAge?: string;
}

/**
 * Convert offline library prompts to Prompt format
 */
function offlineLibraryToPrompts(): Prompt[] {
  const offlinePrompts = readOfflineLibrary();
  return offlinePrompts.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description || "",
    content: p.content,
    category: normalizePromptCategory(p.category),
    tags: p.tags || [],
    author: "",
    version: "1.0.0",
    created: p.saved_at,
  }));
}

/**
 * Check if error looks like a network error
 */
function isNetworkError(error: string | undefined): boolean {
  if (!error) return false;
  const errorLower = error.toLowerCase();
  return (
    errorLower.includes("network") ||
    errorLower.includes("fetch") ||
    errorLower.includes("econnrefused") ||
    errorLower.includes("timeout") ||
    errorLower.includes("enotfound")
  );
}

async function fetchPromptList(
  endpoint: string,
  options: ListOptions,
  contextLabel: string,
  allowFailure: boolean
): Promise<FetchResult> {
  try {
    const response = await apiClient.get<unknown>(endpoint);

    if (response.ok) {
      return { prompts: normalizePromptPayload(response.data) };
    }

    if (allowFailure) {
      // Check for network error and try offline fallback
      if (isNetworkError(response.error) && hasOfflineLibrary()) {
        const meta = readSyncMeta();
        if (!shouldOutputJson(options)) {
          console.log(chalk.cyan(`📡 Offline mode (synced ${formatSyncAge(meta?.lastSync)})`));
        }
        return {
          prompts: offlineLibraryToPrompts(),
          offline: true,
          offlineAge: formatSyncAge(meta?.lastSync),
        };
      }
      if (!shouldOutputJson(options)) {
        console.log(chalk.yellow(`Warning: Could not load ${contextLabel}. Showing public prompts only.`));
      }
      return { prompts: [] };
    }

    if (isAuthError(response)) {
      if (shouldOutputJson(options)) {
        writeJsonError("not_authenticated", "You must be logged in to list personal prompts");
      } else {
        console.log(chalk.yellow("You must be logged in to list personal prompts."));
        console.log(chalk.dim("Run 'jfp login' to sign in."));
      }
      process.exit(1);
    }

    if (requiresPremium(response)) {
      if (shouldOutputJson(options)) {
        writeJsonError("premium_required", "Listing personal prompts requires a Premium subscription");
      } else {
        console.log(chalk.yellow("Listing personal prompts requires a Premium subscription."));
        console.log(chalk.dim("Upgrade at https://pro.jeffreysprompts.com/pricing"));
      }
      process.exit(1);
    }

    // Check for network error with strict mode
    if (isNetworkError(response.error) && hasOfflineLibrary()) {
      const meta = readSyncMeta();
      if (!shouldOutputJson(options)) {
        console.log(chalk.cyan(`📡 Offline mode (synced ${formatSyncAge(meta?.lastSync)})`));
      }
      return {
        prompts: offlineLibraryToPrompts(),
        offline: true,
        offlineAge: formatSyncAge(meta?.lastSync),
      };
    }

    if (shouldOutputJson(options)) {
      writeJsonError("api_error", response.error || "Failed to load personal prompts", {
        status: response.status,
      });
    } else {
      console.log(chalk.red(`Failed to load ${contextLabel}: ${response.error || "Unknown error"}`));
    }
    process.exit(1);
  } catch (err) {
    // Network error - try offline fallback
    if (hasOfflineLibrary()) {
      const meta = readSyncMeta();
      if (!shouldOutputJson(options)) {
        console.log(chalk.cyan(`📡 Offline mode (synced ${formatSyncAge(meta?.lastSync)})`));
      }
      return {
        prompts: offlineLibraryToPrompts(),
        offline: true,
        offlineAge: formatSyncAge(meta?.lastSync),
      };
    }

    if (allowFailure) {
      if (!shouldOutputJson(options)) {
        console.log(chalk.yellow(`Warning: Could not load ${contextLabel}.`));
      }
      return { prompts: [] };
    }

    const errorMsg = err instanceof Error ? err.message : String(err);
    if (shouldOutputJson(options)) {
      writeJsonError("api_error", errorMsg);
    } else {
      console.log(chalk.red(`Failed to load ${contextLabel}: ${errorMsg}`));
    }
    process.exit(1);
  }
}

export async function listCommand(options: ListOptions) {
  // Load registry dynamically (SWR pattern)
  const registry = await loadRegistry();
  let results = registry.prompts;
  
  let isOfflineMode = false;
  let offlineAge: string | undefined;

  const wantsMine = options.mine === true;
  const wantsSaved = options.saved === true;
  const loggedIn = await isLoggedIn();

  if ((wantsMine || wantsSaved) && !loggedIn) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "You must be logged in to list personal prompts");
    } else {
      console.log(chalk.yellow("You must be logged in to list personal prompts."));
      console.log(chalk.dim("Run 'jfp login' to sign in."));
    }
    process.exit(1);
  }

  if (loggedIn) {
    if (wantsMine || wantsSaved) {
      const sources: Prompt[] = [];

      if (wantsMine) {
        const result = await fetchPromptList("/cli/prompts/mine", options, "your prompts", false);
        sources.push(...result.prompts);
        if (result.offline) {
          isOfflineMode = true;
          offlineAge = result.offlineAge;
        }
      }

      if (wantsSaved) {
        const result = await fetchPromptList("/cli/prompts/saved", options, "saved prompts", false);
        sources.push(...result.prompts);
        if (result.offline) {
          isOfflineMode = true;
          offlineAge = result.offlineAge;
        }
      }

      results = mergePrompts([], sources);
    } else {
      const result = await fetchPromptList(
        "/cli/prompts/mine",
        options,
        "your prompts",
        true
      );
      results = mergePrompts(results, result.prompts);
      if (result.offline) {
        isOfflineMode = true;
        offlineAge = result.offlineAge;
      }
    }
  }

  results = applyFilters(results, options);

  if (shouldOutputJson(options)) {
    const output: {
      prompts: Prompt[];
      count: number;
      offline?: boolean;
      offlineAge?: string;
    } = {
      prompts: results,
      count: results.length,
    };
    if (isOfflineMode) {
      output.offline = true;
      output.offlineAge = offlineAge;
    }
    writeJson(output);
    return;
  }

  const table = new Table({
    head: ["ID", "Title", "Category", "Tags"],
    style: { head: ["cyan"] },
  });

  for (const prompt of results) {
    table.push([
      prompt.id,
      prompt.title,
      chalk.green(prompt.category),
      prompt.tags.slice(0, 3).join(", "),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`\nFound ${results.length} prompts`));
}
