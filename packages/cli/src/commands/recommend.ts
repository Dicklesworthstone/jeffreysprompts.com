import chalk from "chalk";
import type { Prompt } from "@jeffreysprompts/core/prompts";
import {
  getForYouRecommendations,
  getRelatedRecommendations,
  type RecommendationResult,
} from "@jeffreysprompts/core/search";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";
import { hasOfflineLibrary, normalizePromptCategory, readOfflineLibrary } from "../lib/offline";
import { isLoggedIn, loadCredentials } from "../lib/credentials";

interface RecommendOptions {
  json?: boolean;
  limit?: number | string;
}

interface RecommendOutput {
  mode: "related" | "for_you" | "featured";
  seedId?: string;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    score: number;
    reasons: string[];
  }>;
  total: number;
  warning?: string;
}

function writeJson(payload: RecommendOutput): void {
  console.log(JSON.stringify(payload, null, 2));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ error: true, code, message, ...extra }, null, 2));
}

function parseLimit(value: RecommendOptions["limit"]): number {
  if (value === undefined) return 5;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function toPromptFromOffline(): Prompt[] {
  const offline = readOfflineLibrary();
  return offline.map((entry) => ({
    id: entry.id,
    title: entry.title,
    description: entry.description ?? "",
    content: entry.content,
    category: normalizePromptCategory(entry.category),
    tags: entry.tags ?? [],
    author: "",
    version: "1.0.0",
    created: entry.saved_at,
    featured: false,
  }));
}

function fallbackFeatured(prompts: Prompt[], limit: number): RecommendationResult[] {
  const featured = prompts.filter((p) => p.featured);
  const sorted = [...featured, ...prompts.filter((p) => !p.featured)]
    .slice(0, limit);
  return sorted.map((prompt) => ({
    prompt,
    score: prompt.featured ? 1 : 0.5,
    reasons: [prompt.featured ? "Featured prompt" : "Popular in the library"],
  }));
}

async function requireAuth(options: { json?: boolean }, env = process.env): Promise<void> {
  const loggedIn = await isLoggedIn(env);
  if (!loggedIn) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "You must be logged in to get recommendations", {
        hint: "Run 'jfp login' to sign in",
      });
    } else {
      console.log(chalk.yellow("You must be logged in to get recommendations"));
      console.log(chalk.dim("Run 'jfp login' to sign in to JeffreysPrompts Premium"));
    }
    process.exit(1);
  }
}

async function requirePremium(options: { json?: boolean }, env = process.env): Promise<void> {
  const creds = await loadCredentials(env);
  if (creds?.tier !== "premium") {
    if (shouldOutputJson(options)) {
      writeJsonError("premium_required", "Recommendations require a premium subscription", {
        hint: "Visit https://pro.jeffreysprompts.com/pricing to upgrade",
      });
    } else {
      console.log(chalk.yellow("Recommendations require a premium subscription"));
      console.log(chalk.dim("Visit https://pro.jeffreysprompts.com/pricing to upgrade"));
    }
    process.exit(1);
  }
}

export async function recommendCommand(
  seedId: string | undefined,
  options: RecommendOptions = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  await requireAuth(options, env);
  await requirePremium(options, env);

  const limit = parseLimit(options.limit);
  if (!Number.isFinite(limit) || limit <= 0) {
    if (shouldOutputJson(options)) {
      writeJsonError("invalid_limit", "Invalid --limit value. Provide a positive number.");
    } else {
      console.error(chalk.red("Invalid --limit value. Provide a positive number."));
    }
    process.exit(1);
  }

  const clampedLimit = Math.min(limit, 50);
  if (limit > clampedLimit && !shouldOutputJson(options)) {
    console.warn(chalk.yellow(`Warning: Limit capped to ${clampedLimit} for performance.`));
  }

  const registry = await loadRegistry();
  const prompts = registry.prompts;

  let mode: RecommendOutput["mode"] = "featured";
  let results: RecommendationResult[] = [];
  let warning: string | undefined;

  if (seedId) {
    const seed = prompts.find((prompt) => prompt.id === seedId);
    if (!seed) {
      if (shouldOutputJson(options)) {
        writeJsonError("prompt_not_found", `No prompt with id '${seedId}'`);
      } else {
        console.error(chalk.red(`No prompt with id '${seedId}'`));
      }
      process.exit(1);
    }
    mode = "related";
    results = getRelatedRecommendations(seed, prompts, { limit: clampedLimit });
  } else {
    const savedPrompts = toPromptFromOffline();
    const savedSignals = savedPrompts.map((prompt) => ({
      prompt,
      kind: "save" as const,
      occurredAt: prompt.created,
    }));
    if (savedSignals.length > 0) {
      mode = "for_you";
      results = getForYouRecommendations({ saved: savedSignals }, prompts, {
        limit: clampedLimit,
      });
    } else {
      mode = "featured";
      results = fallbackFeatured(prompts, clampedLimit);
      warning = hasOfflineLibrary()
        ? "No saved prompts found. Showing featured prompts instead."
        : "Run 'jfp sync' to enable personalized recommendations.";
    }
  }

  if (shouldOutputJson(options)) {
    writeJson({
      mode,
      seedId,
      recommendations: results.map((item) => ({
        id: item.prompt.id,
        title: item.prompt.title,
        description: item.prompt.description,
        category: item.prompt.category,
        score: item.score,
        reasons: item.reasons,
      })),
      total: results.length,
      ...(warning ? { warning } : {}),
    });
    return;
  }

  if (warning) {
    console.log(chalk.yellow(warning));
    console.log();
  }

  const heading =
    mode === "related"
      ? `Recommendations related to "${seedId}":`
      : mode === "for_you"
        ? "Recommendations for you:"
        : "Featured recommendations:";

  console.log(chalk.bold.cyan(`${heading}\n`));

  if (results.length === 0) {
    console.log(chalk.yellow("No recommendations available."));
    return;
  }

  for (const result of results) {
    const prompt = result.prompt;
    console.log(`${chalk.cyan.bold(prompt.title)} ${chalk.dim(`(${prompt.id})`)}`);
    console.log(`${chalk.green(prompt.category)} • ${prompt.description}`);
    if (result.reasons.length) {
      console.log(chalk.dim(`Reason: ${result.reasons.join("; ")}`));
    }
    console.log();
  }
}
