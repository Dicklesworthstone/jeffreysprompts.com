/**
 * Utility CLI commands: categories, tags, open, doctor, about
 */

import {
  findDuplicateCandidates,
  suggestPromptMetadata,
} from "@jeffreysprompts/core/prompts";
import chalk from "chalk";
import boxen from "boxen";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { platform } from "os";
import { getHomeDir } from "../lib/config";
import { isLoggedIn, loadCredentials } from "../lib/credentials";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";

interface JsonOptions {
  json?: boolean;
}

interface TagSuggestOptions {
  json?: boolean;
  limit?: string;
  similar?: string;
  threshold?: string;
}

interface DedupeOptions {
  json?: boolean;
  minScore?: string;
  limit?: string;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseTagMappings(
  value: string | undefined
): Record<string, string> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const mappings: Record<string, string> = {};
    for (const [alias, canonical] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof alias !== "string" || typeof canonical !== "string") continue;
      const trimmedAlias = alias.trim();
      const trimmedCanonical = canonical.trim();
      if (!trimmedAlias || !trimmedCanonical) continue;
      mappings[trimmedAlias] = trimmedCanonical;
    }
    return Object.keys(mappings).length > 0 ? mappings : undefined;
  } catch {
    return undefined;
  }
}

async function requirePremium(options: { json?: boolean }, action: string): Promise<void> {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    if (shouldOutputJson(options)) {
      console.log(
        JSON.stringify({
          error: true,
          code: "not_authenticated",
          message: `${action} requires login.`,
          hint: "Run 'jfp login' to sign in",
        })
      );
    } else {
      console.log(chalk.yellow(`${action} requires login.`));
      console.log(chalk.dim("Run 'jfp login' to sign in to JeffreysPrompts Premium"));
    }
    process.exit(1);
  }

  const creds = await loadCredentials();
  if (creds?.tier === "premium") return;

  if (shouldOutputJson(options)) {
    console.log(
      JSON.stringify({
        error: true,
        code: "premium_required",
        message: `${action} requires a JeffreysPrompts Pro subscription.`,
        hint: "Visit https://pro.jeffreysprompts.com/pricing to upgrade",
      })
    );
  } else {
    console.log(chalk.yellow(`${action} requires a JeffreysPrompts Pro subscription.`));
    console.log(chalk.dim("Upgrade at https://pro.jeffreysprompts.com/pricing"));
    console.log(chalk.dim("Run 'jfp login' after upgrading."));
  }
  process.exit(1);
}

/**
 * List all categories with prompt counts
 */
export async function categoriesCommand(options: JsonOptions): Promise<void> {
  const registry = await loadRegistry();
  const prompts = registry.prompts;
  
  // Count prompts per category
  const counts: Record<string, number> = {};
  const categories = new Set<string>();
  
  for (const prompt of prompts) {
    counts[prompt.category] = (counts[prompt.category] ?? 0) + 1;
    categories.add(prompt.category);
  }
  
  const sortedCategories = [...categories].sort();

  if (shouldOutputJson(options)) {
    const data = sortedCategories.map((cat) => ({
      name: cat,
      count: counts[cat] ?? 0,
    }));
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(chalk.bold.cyan("\nCategories\n"));
  for (const cat of sortedCategories) {
    const count = counts[cat] ?? 0;
    console.log(`  ${chalk.yellow(cat.padEnd(16))} ${chalk.dim(`(${count} prompts)`)}`);
  }
  console.log();
}

/**
 * List all tags with prompt counts
 */
export async function tagsCommand(options: JsonOptions): Promise<void> {
  const registry = await loadRegistry();
  const prompts = registry.prompts;

  // Count prompts per tag
  const counts: Record<string, number> = {};
  const tags = new Set<string>();
  
  for (const prompt of prompts) {
    for (const tag of prompt.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1;
      tags.add(tag);
    }
  }

  // Sort tags by count (descending)
  const sortedTags = [...tags].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b));

  if (shouldOutputJson(options)) {
    const data = sortedTags.map((tag) => ({
      name: tag,
      count: counts[tag] ?? 0,
    }));
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(chalk.bold.cyan("\nTags\n"));
  for (const tag of sortedTags) {
    const count = counts[tag] ?? 0;
    console.log(`  ${chalk.green("#" + tag.padEnd(20))} ${chalk.dim(`(${count})`)}`);
  }
  console.log();
}

/**
 * Suggest tags, categories, and descriptions for a prompt (Premium)
 */
export async function tagsSuggestCommand(
  id: string | undefined,
  options: TagSuggestOptions
): Promise<void> {
  if (!id) {
    if (shouldOutputJson(options)) {
      console.log(
        JSON.stringify({ error: true, code: "missing_prompt", message: "Provide a prompt id to suggest tags for." })
      );
    } else {
      console.error(chalk.red("Missing prompt id. Example: jfp tags suggest idea-wizard"));
    }
    process.exit(1);
  }

  await requirePremium(options, "Tag suggestions");

  const maxTags = parseNumber(options.limit, 6);
  const maxSimilar = parseNumber(options.similar, 5);
  const threshold = parseNumber(options.threshold, 0.35);

  if (!Number.isFinite(maxTags) || maxTags <= 0) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({ error: true, code: "invalid_limit", message: "Invalid --limit value." }));
    } else {
      console.error(chalk.red("Invalid --limit value. Provide a positive number."));
    }
    process.exit(1);
  }

  if (!Number.isFinite(maxSimilar) || maxSimilar <= 0) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({ error: true, code: "invalid_similar", message: "Invalid --similar value." }));
    } else {
      console.error(chalk.red("Invalid --similar value. Provide a positive number."));
    }
    process.exit(1);
  }

  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({ error: true, code: "invalid_threshold", message: "Invalid --threshold value." }));
    } else {
      console.error(chalk.red("Invalid --threshold value. Provide a number between 0 and 1."));
    }
    process.exit(1);
  }

  const registry = await loadRegistry();
  const prompt = registry.prompts.find((p) => p.id === id);

  if (!prompt) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({ error: true, code: "prompt_not_found", message: `Prompt not found: ${id}` }));
    } else {
      console.error(chalk.red(`Prompt not found: ${id}`));
    }
    process.exit(1);
  }

  const tagMappings = parseTagMappings(process.env.JFP_TAG_MAPPINGS);
  const suggestions = suggestPromptMetadata(prompt, registry.prompts, {
    maxTagSuggestions: maxTags,
    maxSimilar,
    similarityThreshold: threshold,
    tagMappings,
  });

  if (shouldOutputJson(options)) {
    console.log(
      JSON.stringify(
        {
          promptId: prompt.id,
          promptTitle: prompt.title,
          suggestions: {
            tags: suggestions.tags,
            categories: suggestions.categories,
            descriptions: suggestions.descriptions,
          },
          similar: suggestions.similar.map((item) => ({
            id: item.prompt.id,
            title: item.prompt.title,
            score: item.score,
            sharedTags: item.sharedTags,
            sharedTokens: item.sharedTokens,
            titleMatch: item.titleMatch,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(chalk.bold.cyan(`\nTag suggestions for ${prompt.title}\n`));

  if (suggestions.tags.length === 0) {
    console.log(chalk.dim("No tag suggestions found."));
  } else {
    for (const tag of suggestions.tags) {
      console.log(`  ${chalk.green("#" + tag.tag)} ${chalk.dim(tag.reasons.join(" | "))}`);
    }
  }

  if (suggestions.categories.length > 0) {
    const top = suggestions.categories[0];
    console.log(chalk.bold.cyan("\nCategory suggestion\n"));
    console.log(`  ${chalk.yellow(top.category)} ${chalk.dim(top.reasons.join(" | "))}`);
  }

  if (suggestions.descriptions.length > 0) {
    console.log(chalk.bold.cyan("\nDescription suggestions\n"));
    for (const desc of suggestions.descriptions) {
      console.log(`  ${chalk.white(desc.description)} ${chalk.dim(desc.reason)}`);
    }
  }

  if (suggestions.similar.length > 0) {
    console.log(chalk.bold.cyan("\nMost similar prompts\n"));
    for (const item of suggestions.similar) {
      console.log(
        `  ${chalk.cyan(item.score.toFixed(3))} ${item.prompt.title} ${chalk.dim(item.sharedTags.join(", "))}`
      );
    }
  }

  console.log();
}

/**
 * Scan for duplicate prompts (Premium)
 */
export async function dedupeScanCommand(options: DedupeOptions): Promise<void> {
  await requirePremium(options, "Duplicate scanning");

  const minScore = parseNumber(options.minScore, 0.85);
  const maxPairs = parseNumber(options.limit, 50);

  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 1) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({ error: true, code: "invalid_min_score", message: "Invalid --min-score value." }));
    } else {
      console.error(chalk.red("Invalid --min-score value. Provide a number between 0 and 1."));
    }
    process.exit(1);
  }

  if (!Number.isFinite(maxPairs) || maxPairs <= 0) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({ error: true, code: "invalid_limit", message: "Invalid --limit value." }));
    } else {
      console.error(chalk.red("Invalid --limit value. Provide a positive number."));
    }
    process.exit(1);
  }

  const registry = await loadRegistry();
  const tagMappings = parseTagMappings(process.env.JFP_TAG_MAPPINGS);
  const duplicates = findDuplicateCandidates(registry.prompts, {
    minScore,
    maxPairs,
    tagMappings,
  });

  if (shouldOutputJson(options)) {
    console.log(
      JSON.stringify(
        duplicates.map((candidate) => ({
          promptA: { id: candidate.promptA.id, title: candidate.promptA.title },
          promptB: { id: candidate.promptB.id, title: candidate.promptB.title },
          score: candidate.score,
          reasons: candidate.reasons,
          sharedTags: candidate.sharedTags,
          sharedTokens: candidate.sharedTokens,
          titleMatch: candidate.titleMatch,
        })),
        null,
        2
      )
    );
    return;
  }

  console.log(chalk.bold.cyan("\nDuplicate scan results\n"));
  if (duplicates.length === 0) {
    console.log(chalk.dim("No duplicates detected with current threshold."));
    console.log();
    return;
  }

  for (const candidate of duplicates) {
    const score = candidate.score.toFixed(3);
    console.log(`  ${chalk.cyan(score)} ${candidate.promptA.title} <-> ${candidate.promptB.title}`);
    if (candidate.reasons.length > 0) {
      console.log(`    ${chalk.dim(candidate.reasons.join(" | "))}`);
    }
  }

  console.log();
}

/**
 * Open prompt in browser
 */
export async function openCommand(id: string): Promise<void> {
  const registry = await loadRegistry();
  const prompt = registry.prompts.find((p) => p.id === id);

  if (!prompt) {
    console.error(chalk.red(`Prompt not found: ${id}`));
    process.exit(1);
  }

  const url = `https://jeffreysprompts.com/prompts/${prompt.id}`;

  // Platform-specific browser open command
  // Note: On Windows, 'start' is a shell built-in, so we use cmd.exe
  // The empty string after 'start' prevents it from treating the URL as window title
  const isWindows = platform() === "win32";
  const cmd = platform() === "darwin" ? "open" : isWindows ? "cmd" : "xdg-open";
  const args = isWindows ? ["/c", "start", "", url] : [url];

  try {
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
    console.log(chalk.green(`Opening ${chalk.bold(prompt.title)} in browser...`));
    console.log(chalk.dim(url));
  } catch {
    console.log(chalk.yellow("Could not open browser. Visit:"));
    console.log(url);
  }
}

interface DoctorResult {
  check: string;
  status: "ok" | "warning" | "error";
  message: string;
  path?: string;
}

/**
 * Check environment for common issues
 */
export async function doctorCommand(options: JsonOptions): Promise<void> {
  const registry = await loadRegistry();
  const results: DoctorResult[] = [];

  // Check personal skills directory
  const personalSkillsDir = join(getHomeDir(), ".config", "claude", "skills");
  if (existsSync(personalSkillsDir)) {
    results.push({
      check: "Personal skills directory",
      status: "ok",
      message: "Directory exists",
      path: personalSkillsDir,
    });
  } else {
    results.push({
      check: "Personal skills directory",
      status: "warning",
      message: "Directory does not exist (will be created on first install)",
      path: personalSkillsDir,
    });
  }

  // Check project skills directory
  const projectSkillsDir = join(process.cwd(), ".claude", "skills");
  if (existsSync(projectSkillsDir)) {
    results.push({
      check: "Project skills directory",
      status: "ok",
      message: "Directory exists",
      path: projectSkillsDir,
    });
  } else {
    results.push({
      check: "Project skills directory",
      status: "warning",
      message: "Directory does not exist in current project",
      path: projectSkillsDir,
    });
  }

  // Check clipboard availability
  const clipboardCmd =
    platform() === "darwin"
      ? "pbcopy"
      : platform() === "win32"
        ? "clip"
        : "xclip";

  try {
    // Use 'where' on Windows, 'which' on Unix
    const whichCmd = platform() === "win32" ? "where" : "which";
    const which = spawn(whichCmd, [clipboardCmd]);
    const hasClipboard = await new Promise<boolean>((resolve) => {
      which.on("close", (code) => resolve(code === 0));
      which.on("error", () => resolve(false));
    });

    results.push({
      check: "Clipboard command",
      status: hasClipboard ? "ok" : "warning",
      message: hasClipboard ? `${clipboardCmd} available` : `${clipboardCmd} not found`,
    });
  } catch {
    results.push({
      check: "Clipboard command",
      status: "warning",
      message: "Could not check clipboard availability",
    });
  }

  // Check Bun availability
  try {
    const whichCmd = platform() === "win32" ? "where" : "which";
    const which = spawn(whichCmd, ["bun"]);
    const hasBun = await new Promise<boolean>((resolve) => {
      which.on("close", (code) => resolve(code === 0));
      which.on("error", () => resolve(false));
    });

    if (hasBun) {
      // Check version
      const bunVer = spawn("bun", ["--version"]);
      let version = "";
      bunVer.stdout.on("data", (data) => {
        version += data.toString().trim();
      });
      await new Promise<void>((resolve) => bunVer.on("close", () => resolve()));
      
      results.push({
        check: "Bun runtime",
        status: "ok",
        message: `Available (v${version})`,
      });
    } else {
      results.push({
        check: "Bun runtime",
        status: "ok", // Not required for binary
        message: "Not found (optional for binary usage)",
      });
    }
  } catch {
    // Ignore check errors
  }

  // Check registry
  results.push({
    check: "Prompt registry",
    status: "ok",
    message: `${registry.prompts.length} prompts loaded`,
  });

  if (shouldOutputJson(options)) {
    console.log(JSON.stringify({ results }, null, 2));
    return;
  }

  console.log(chalk.bold.cyan("\nJFP Doctor\n"));
  for (const result of results) {
    const icon =
      result.status === "ok"
        ? chalk.green("✓")
        : result.status === "warning"
          ? chalk.yellow("⚠")
          : chalk.red("✗");
    console.log(`  ${icon} ${chalk.bold(result.check)}`);
    console.log(`    ${chalk.dim(result.message)}`);
    if (result.path) {
      console.log(`    ${chalk.dim(result.path)}`);
    }
  }
  console.log();
}

/**
 * Show about information with ASCII banner
 */
export async function aboutCommand(options: JsonOptions): Promise<void> {
  const registry = await loadRegistry();
  // Recalculate dynamic stats
  const categories = new Set(registry.prompts.map(p => p.category));
  const tags = new Set(registry.prompts.flatMap(p => p.tags));

  const info = {
    name: "jfp",
    description: "JeffreysPrompts CLI - Agent-optimized prompt access",
    version: "1.0.0",
    website: "https://jeffreysprompts.com",
    github: "https://github.com/Dicklesworthstone/jeffreysprompts.com",
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    prompts: registry.prompts.length,
    categories: categories.size,
    tags: tags.size,
  };

  if (shouldOutputJson(options)) {
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  const banner = `
       __  ______  ____
      / / / __/ /_/ __ \\
 __  / /_/ /_/ __/ /_/ /
/ /_/ / __/ /_/ ____/
\\____/_/  \\__/_/
`;

  console.log(
    boxen(
      chalk.cyan(banner) +
        "\n" +
        chalk.bold("JeffreysPrompts CLI\n") +
        chalk.dim("Agent-optimized prompt access\n\n") +
        `${chalk.green("Website:")} ${info.website}\n` +
        `${chalk.green("GitHub:")}  ${info.github}\n` +
        `${chalk.green("Author:")}  ${info.author} (${info.twitter})\n\n` +
        chalk.dim(`${info.prompts} prompts | ${info.categories} categories | ${info.tags} tags`),
      {
        padding: 1,
        borderStyle: "round",
        borderColor: "cyan",
      }
    )
  );
}
