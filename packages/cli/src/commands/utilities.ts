/**
 * Utility CLI commands: categories, tags, open, doctor, about
 */

import { type Prompt } from "@jeffreysprompts/core/prompts";
import chalk from "chalk";
import boxen from "boxen";
import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { platform } from "os";
import { getHomeDir } from "../lib/config";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";

interface JsonOptions {
  json?: boolean;
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
