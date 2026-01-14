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

import { searchPrompts, buildIndex, type SearchResult, type BM25Index } from "@jeffreysprompts/core/search";
import { type Prompt } from "@jeffreysprompts/core/prompts";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import { apiClient, isAuthError } from "../lib/api-client";
import { isLoggedIn, loadCredentials } from "../lib/credentials";
import {
  hasOfflineLibrary,
  normalizePromptCategory,
  searchOfflineLibrary,
  readSyncMeta,
  formatSyncAge,
  type SyncedPrompt,
} from "../lib/offline";
import { loadRegistry } from "../lib/registry-loader";

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
function searchLocal(
  query: string,
  limit: number,
  index: BM25Index,
  promptsMap: Map<string, Prompt>
): MergedSearchResult[] {
  const results = searchPrompts(query, { limit, index, promptsMap });
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
  const results = searchOfflineLibrary(query, limit);
  return results.map(({ prompt: p, score }) => ({
    id: p.id,
    title: p.title,
    description: p.description || "",
    category: normalizePromptCategory(p.category),
    tags: p.tags || [],
    score: score,
    source: "saved" as const, // Offline library is saved prompts
  }));
}

// ... searchPersonal ...

// ... mergeResults ...

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

  // Load registry dynamically
  const registry = await loadRegistry();
  const prompts = registry.prompts;
  
  // Build lookup map and search index
  const promptsMap = new Map(prompts.map((p) => [p.id, p]));
  const searchIndex = buildIndex(prompts);

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
    localResults = searchLocal(query, limit * 2, searchIndex, promptsMap); // Get more for merging
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
