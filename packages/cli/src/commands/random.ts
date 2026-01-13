/**
 * Random prompt command - get a random prompt for discovery
 */

import { type Prompt } from "@jeffreysprompts/core/prompts";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";

interface RandomOptions {
  category?: string;
  tag?: string;
  json?: boolean;
  copy?: boolean;
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

function writeJsonError(code: string, message: string): void {
  writeJson({ error: true, code, message });
}

/**
 * Get a random prompt, optionally filtered by category or tag
 */
export async function randomCommand(options: RandomOptions): Promise<void> {
  // Load registry dynamically (SWR pattern)
  const registry = await loadRegistry();
  let candidates = registry.prompts;

  // Apply category filter
  if (options.category) {
    candidates = candidates.filter((p) => p.category === options.category);
    if (candidates.length === 0) {
      if (shouldOutputJson(options)) {
        writeJsonError("no_prompts", `No prompts found in category: ${options.category}`);
      } else {
        console.error(chalk.red(`No prompts found in category: ${options.category}`));
      }
      process.exit(1);
    }
  }

  // Apply tag filter
  if (options.tag) {
    candidates = candidates.filter((p) => p.tags.includes(options.tag!));
    if (candidates.length === 0) {
      if (shouldOutputJson(options)) {
        writeJsonError("no_prompts", `No prompts found with tag: ${options.tag}`);
      } else {
        console.error(chalk.red(`No prompts found with tag: ${options.tag}`));
      }
      process.exit(1);
    }
  }

  // Pick a random prompt
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const prompt = candidates[randomIndex];

  // Copy to clipboard if requested
  if (options.copy) {
    try {
      const { spawn } = await import("child_process");
      const { platform } = await import("os");

      const clipboardCmd =
        platform() === "darwin"
          ? "pbcopy"
          : platform() === "win32"
            ? "clip"
            : "xclip";
      const args = platform() === "win32" ? [] : platform() === "linux" ? ["-selection", "clipboard"] : [];

      const proc = spawn(clipboardCmd, args, { stdio: ["pipe", "ignore", "ignore"] });
      proc.stdin?.write(prompt.content);
      proc.stdin?.end();

      await new Promise<void>((resolve) => {
        proc.on("close", () => resolve());
        proc.on("error", () => resolve());
      });

      if (!shouldOutputJson(options)) {
        console.log(chalk.green("✓ Copied to clipboard"));
      }
    } catch {
      if (!shouldOutputJson(options)) {
        console.log(chalk.yellow("⚠ Could not copy to clipboard"));
      }
    }
  }

  if (shouldOutputJson(options)) {
    writeJson({ prompt, copied: options.copy ?? false });
    return;
  }

  // Pretty print the prompt
  console.log();
  console.log(chalk.bold.cyan(`🎲 ${prompt.title}`));
  console.log(chalk.dim(`   ${prompt.description}`));
  console.log();
  console.log(chalk.dim("─".repeat(60)));
  console.log();

  // Show truncated content preview
  const contentLines = prompt.content.split("\n");
  const previewLines = contentLines.slice(0, 10);
  for (const line of previewLines) {
    console.log(chalk.white(`   ${line}`));
  }
  if (contentLines.length > 10) {
    console.log(chalk.dim(`   ... (${contentLines.length - 10} more lines)`));
  }

  console.log();
  console.log(chalk.dim("─".repeat(60)));
  console.log();
  console.log(`   ${chalk.green("Category:")} ${prompt.category}`);
  console.log(`   ${chalk.green("Tags:")}     ${prompt.tags.join(", ")}`);
  console.log(`   ${chalk.green("ID:")}       ${prompt.id}`);
  console.log();
  console.log(chalk.dim(`   Tip: Run ${chalk.cyan(`jfp copy ${prompt.id}`)} to copy the full prompt`));
  console.log(chalk.dim(`        Run ${chalk.cyan(`jfp random`)} again for another random prompt`));
  console.log();
}
