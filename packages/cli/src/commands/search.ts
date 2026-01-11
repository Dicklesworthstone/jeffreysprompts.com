/**
 * Search Command
 *
 * Search prompts with optional personal prompts integration for authenticated users.
 *
 * Flags:
 * - --mine: Search only personal prompts (requires auth)
 * - --saved: Search only saved prompts (requires auth)
 * - --all: Search everything (public + personal, default for premium users)
 * - --local: Search only local registry (default for free/unauthenticated users)
 */

import { searchPrompts, type SearchResult } from "@jeffreysprompts/core/search";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import { apiClient, isAuthError } from "../lib/api-client";
import { isLoggedIn, loadCredentials } from "../lib/credentials";
import {
  hasOfflineLibrary,
  searchOfflineLibrary,
  readSyncMeta,
  formatSyncAge,
  type SyncedPrompt,
} from "../lib/offline";

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

interface SearchOptions {
  json?: boolean;
  limit?: string | number;
  mine?: boolean;
  saved?: boolean;
  all?: boolean;
  local?: boolean;
}

interface PersonalPromptResult {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  source: "mine" | "saved" | "collection";
  score: number;
}

interface MergedSearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  score: number;
  source: "local" | "mine" | "saved" | "collection";
  matchedFields?: string[];
}

/**
 * Search local registry
 */
function searchLocal(query: string, limit: number): MergedSearchResult[] {
  const results = searchPrompts(query, { limit });
  return results.map((r) => ({
    id: r.prompt.id,
    title: r.prompt.title,
    description: r.prompt.description,
    category: r.prompt.category,
    tags: r.prompt.tags,
    score: r.score,
    source: "local" as const,
    matchedFields: r.matchedFields,
  }));
}

/**
 * Search the offline library cache
 */
function searchOffline(query: string, limit: number): MergedSearchResult[] {
  const prompts = searchOfflineLibrary(query, limit);
  return prompts.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description || "",
    category: p.category || "uncategorized",
    tags: p.tags || [],
    score: 1, // Offline results don't have scores, use 1
    source: "saved" as const, // Offline library is saved prompts
  }));
}

/**
 * Search personal prompts via API with offline fallback
 */
async function searchPersonal(
  query: string,
  options: { mine?: boolean; saved?: boolean; all?: boolean },
  limit: number
): Promise<{ results: MergedSearchResult[]; error?: string; offline?: boolean }> {
  try {
    const endpoints: Array<{ endpoint: string; source: "mine" | "saved" | "collection" }> = [];

    if (options.mine || options.all) {
      endpoints.push({ endpoint: "/cli/search/mine", source: "mine" });
    }
    if (options.saved || options.all) {
      endpoints.push({ endpoint: "/cli/search/saved", source: "saved" });
    }

    // Fetch all endpoints concurrently
    const responses = await Promise.all(
      endpoints.map(async ({ endpoint, source }) => {
        const response = await apiClient.get<PersonalPromptResult[]>(
          `${endpoint}?q=${encodeURIComponent(query)}`
        );
        return { response, source };
      })
    );

    const results: MergedSearchResult[] = [];
    let hasNetworkError = false;

    for (const { response, source } of responses) {
      if (response.ok && response.data) {
        for (const prompt of response.data) {
          results.push({
            id: prompt.id,
            title: prompt.title,
            description: prompt.description,
            category: prompt.category,
            tags: prompt.tags || [],
            score: prompt.score || 0,
            source,
          });
        }
      } else if (isAuthError(response)) {
        return { results: [], error: "auth_expired" };
      } else {
        // Check if this looks like a network error
        const errorMsg = response.error?.toLowerCase() || "";
        if (
          errorMsg.includes("network") ||
          errorMsg.includes("fetch") ||
          errorMsg.includes("econnrefused") ||
          errorMsg.includes("timeout") ||
          response.status === 0
        ) {
          hasNetworkError = true;
        }
      }
    }

    // If we got network errors and have an offline library, use it
    if (hasNetworkError && results.length === 0 && hasOfflineLibrary()) {
      const offlineResults = searchOffline(query, limit);
      const meta = readSyncMeta();
      return {
        results: offlineResults,
        error: `offline (synced ${formatSyncAge(meta?.lastSync)})`,
        offline: true,
      };
    }

    return { results };
  } catch (err) {
    // Network error - try offline fallback
    if (hasOfflineLibrary()) {
      const offlineResults = searchOffline(query, limit);
      const meta = readSyncMeta();
      return {
        results: offlineResults,
        error: `offline (synced ${formatSyncAge(meta?.lastSync)})`,
        offline: true,
      };
    }
    return { results: [], error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Merge and dedupe results, sorting by score
 */
function mergeResults(
  local: MergedSearchResult[],
  personal: MergedSearchResult[],
  limit: number
): MergedSearchResult[] {
  // Create a map to dedupe by ID, keeping highest score
  const merged = new Map<string, MergedSearchResult>();

  // Add local results first
  for (const result of local) {
    merged.set(result.id, result);
  }

  // Add personal results, marking as personal if new or higher score
  for (const result of personal) {
    const existing = merged.get(result.id);
    if (!existing || result.score > existing.score) {
      merged.set(result.id, result);
    }
  }

  // Sort by score descending and limit
  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function searchCommand(query: string, options: SearchOptions): Promise<void> {
  const limit = options.limit !== undefined ? Number(options.limit) : 10;
  if (!Number.isFinite(limit) || limit <= 0) {
    if (shouldOutputJson(options)) {
      writeJsonError("invalid_limit", "Invalid --limit value. Provide a positive number.");
    } else {
      console.error(chalk.red("Invalid --limit value. Provide a positive number."));
    }
    process.exit(1);
  }

  const loggedIn = await isLoggedIn();
  const creds = loggedIn ? await loadCredentials() : null;
  const isPremium = creds?.tier === "premium";

  // Determine search mode
  const searchMine = options.mine === true;
  const searchSaved = options.saved === true;
  const wantsLocalOnly = options.local === true;
  const searchAllExplicit = options.all === true;
  const searchAll = searchAllExplicit || (isPremium && !searchMine && !searchSaved && !wantsLocalOnly);

  // If user requests personal search without being logged in
  if ((searchMine || searchSaved || searchAllExplicit) && !loggedIn) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "You must be logged in to search personal prompts", {
        hint: "Run 'jfp login' to sign in",
      });
    } else {
      console.log(chalk.yellow("You must be logged in to search personal prompts"));
      console.log(chalk.dim("Run 'jfp login' to sign in to JeffreysPrompts Premium"));
    }
    process.exit(1);
  }

  // If user requests personal search without premium tier
  if ((searchMine || searchSaved || searchAllExplicit) && loggedIn && !isPremium) {
    if (shouldOutputJson(options)) {
      writeJsonError("premium_required", "Personal prompt search requires a premium subscription", {
        hint: "Visit jeffreysprompts.com/premium to upgrade",
      });
    } else {
      console.log(chalk.yellow("Personal prompt search requires a premium subscription"));
      console.log(chalk.dim("Visit jeffreysprompts.com/premium to upgrade"));
    }
    process.exit(1);
  }

  // Determine what to search
  const shouldSearchLocal =
    wantsLocalOnly || searchAll || (!searchMine && !searchSaved && !searchAll);
  const shouldSearchPersonal = isPremium && (searchMine || searchSaved || searchAll) && !wantsLocalOnly;

  let localResults: MergedSearchResult[] = [];
  let personalResults: MergedSearchResult[] = [];
  let personalError: string | undefined;
  let isOfflineMode = false;

  // Search local registry
  if (shouldSearchLocal) {
    localResults = searchLocal(query, limit * 2); // Get more for merging
  }

  // Search personal prompts if applicable
  if (shouldSearchPersonal) {
    const { results, error, offline } = await searchPersonal(
      query,
      {
        mine: searchMine || searchAll,
        saved: searchSaved || searchAll,
        all: searchAll,
      },
      limit
    );
    personalResults = results;
    personalError = error;
    isOfflineMode = offline === true;
  }

  const authExpired = personalError === "auth_expired";
  if (authExpired && (searchMine || searchSaved || searchAllExplicit)) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "Session expired. Please run 'jfp login' again.");
    } else {
      console.log(chalk.yellow("Session expired. Please run 'jfp login' again."));
    }
    process.exit(1);
  }

  // Merge results
  const results = mergeResults(localResults, personalResults, limit);

  // Output results
  if (shouldOutputJson(options)) {
    const output: {
      results: MergedSearchResult[];
      query: string;
      authenticated: boolean;
      offline?: boolean;
      warning?: string;
    } = {
      results,
      query,
      authenticated: loggedIn,
    };

    if (isOfflineMode) {
      output.offline = true;
      output.warning = personalError;
    } else if (personalError && !authExpired) {
      output.warning = `Personal search failed: ${personalError}`;
    }
    if (authExpired) {
      output.warning = "Personal search unavailable (session expired). Showing local results only.";
    }

    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Human-readable output
  if (isOfflineMode) {
    console.log(chalk.cyan(`📡 Offline mode: ${personalError}\n`));
  } else if (authExpired) {
    console.log(chalk.yellow("Warning: Personal search unavailable (session expired). Showing local results only.\n"));
  } else if (personalError) {
    console.log(chalk.yellow(`Warning: Personal search unavailable (${personalError})\n`));
  }

  if (results.length === 0) {
    console.log(chalk.yellow("No prompts found."));
    return;
  }

  const sourceLabel = (source: string) => {
    switch (source) {
      case "mine":
        return chalk.magenta("[personal]");
      case "saved":
        return chalk.blue("[saved]");
      case "collection":
        return chalk.green("[collection]");
      default:
        return "";
    }
  };

  console.log(chalk.bold(`Found ${results.length} matches for "${query}":\n`));

  for (const result of results) {
    const label = result.source !== "local" ? ` ${sourceLabel(result.source)}` : "";
    console.log(`${chalk.cyan.bold(result.title)} ${chalk.dim(`(${result.id})`)}${label}`);
    console.log(`${chalk.green(result.category)} • ${result.description}`);
    console.log(chalk.dim(`Match score: ${result.score.toFixed(2)}`));
    if (result.matchedFields && result.matchedFields.length > 0) {
      console.log(chalk.dim(`Matched: ${result.matchedFields.join(", ")}`));
    }
    console.log();
  }

  if (!loggedIn) {
    console.log(chalk.dim("Tip: Log in with 'jfp login' to search your personal prompts too"));
  }
}
