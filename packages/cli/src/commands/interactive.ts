import { select, search, Separator } from "@inquirer/prompts";
import { prompts, getPrompt, type Prompt } from "@jeffreysprompts/core/prompts";
import { searchPrompts } from "@jeffreysprompts/core/search";
import { generateSkillMd, generatePromptMarkdown } from "@jeffreysprompts/core/export";
import chalk from "chalk";
import boxen from "boxen";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { getHomeDir } from "../lib/config";
import {
  readManifest,
  writeManifest,
  createEmptyManifest,
  upsertManifestEntry,
  checkSkillModification,
} from "../lib/manifest";
import { computeSkillHash } from "@jeffreysprompts/core/export";
import { resolveSafeChildPath, isSafeSkillId } from "../lib/utils";
import type { SkillManifestEntry } from "@jeffreysprompts/core/export";

interface InteractiveOptions {
  // No options yet, placeholder for future
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try native clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Try pbcopy (macOS) or xclip (Linux) via Bun.spawn
    const { spawn } = await import("bun");

    // Try pbcopy first (macOS)
    try {
      const proc = spawn(["pbcopy"], { stdin: "pipe" });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      if (proc.exitCode === 0) return true;
    } catch {
      // pbcopy not available
    }

    // Try xclip (Linux)
    try {
      const proc = spawn(["xclip", "-selection", "clipboard"], { stdin: "pipe" });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      if (proc.exitCode === 0) return true;
    } catch {
      // xclip not available
    }

    // Try xsel (Linux)
    try {
      const proc = spawn(["xsel", "--clipboard", "--input"], { stdin: "pipe" });
      proc.stdin.write(text);
      proc.stdin.end();
      await proc.exited;
      if (proc.exitCode === 0) return true;
    } catch {
      // xsel not available
    }

    return false;
  } catch {
    return false;
  }
}

function displayPrompt(prompt: Prompt): void {
  console.log(
    boxen(
      `${chalk.bold.cyan(prompt.title)}\n` +
        `${chalk.dim(prompt.description)}\n\n` +
        `${chalk.green("Category:")} ${prompt.category}\n` +
        `${chalk.green("Tags:")} ${prompt.tags.join(", ")}\n` +
        `${chalk.green("Author:")} ${prompt.author}\n` +
        `${chalk.dim("—".repeat(40))}\n\n` +
        prompt.content,
      {
        padding: 1,
        borderStyle: "round",
        borderColor: "cyan",
      }
    )
  );
}

async function installPrompt(prompt: Prompt, toProject: boolean): Promise<void> {
  const targetRoot = toProject
    ? resolve(process.cwd(), ".claude/skills")
    : join(getHomeDir(), ".config/claude/skills");

  if (!isSafeSkillId(prompt.id)) {
    console.log(chalk.red(`Error: Unsafe prompt id "${prompt.id}".`));
    return;
  }

  let manifest = readManifest(targetRoot) ?? createEmptyManifest();
  const modCheck = checkSkillModification(targetRoot, prompt.id, manifest);

  if (!modCheck.canOverwrite) {
    console.log(
      chalk.yellow(`Skill ${prompt.id} has user modifications. Use --force in regular install to overwrite.`)
    );
    return;
  }

  try {
    const skillContent = generateSkillMd(prompt);
    const skillDir = resolveSafeChildPath(targetRoot, prompt.id);
    const skillPath = join(skillDir, "SKILL.md");

    if (!existsSync(skillDir)) {
      mkdirSync(skillDir, { recursive: true });
    }

    writeFileSync(skillPath, skillContent);

    const hash = computeSkillHash(skillContent);
    const entry: SkillManifestEntry = {
      id: prompt.id,
      kind: "prompt",
      version: prompt.version ?? "1.0.0",
      hash,
      updatedAt: new Date().toISOString(),
    };
    manifest = upsertManifestEntry(manifest, entry);
    writeManifest(targetRoot, manifest);

    const location = toProject ? "project" : "personal";
    console.log(chalk.green(`✓ Installed ${chalk.bold(prompt.id)} to ${location} skills`));
    console.log(chalk.dim(`  ${skillPath}`));
  } catch (err) {
    console.log(chalk.red(`Failed to install: ${(err as Error).message}`));
  }
}

async function exportToMd(prompt: Prompt): Promise<void> {
  const md = generatePromptMarkdown(prompt);
  const filename = `${prompt.id}.md`;
  writeFileSync(filename, md);
  console.log(chalk.green(`✓ Exported to ${chalk.bold(filename)}`));
}

async function promptAction(prompt: Prompt): Promise<"back" | "exit"> {
  const action = await select({
    message: `${chalk.cyan(prompt.title)} - Choose an action:`,
    choices: [
      { name: "📋 Copy to clipboard", value: "copy" },
      { name: "👁️  View full prompt", value: "view" },
      { name: "📥 Install to personal skills", value: "install-personal" },
      { name: "📥 Install to project skills", value: "install-project" },
      { name: "📄 Export as markdown", value: "export-md" },
      new Separator(),
      { name: "← Back to search", value: "back" },
      { name: "✕ Exit", value: "exit" },
    ],
  });

  switch (action) {
    case "copy": {
      const copied = await copyToClipboard(prompt.content);
      if (copied) {
        console.log(chalk.green("✓ Copied to clipboard"));
      } else {
        console.log(chalk.yellow("Could not copy to clipboard. Content:"));
        console.log(prompt.content);
      }
      break;
    }
    case "view":
      displayPrompt(prompt);
      break;
    case "install-personal":
      await installPrompt(prompt, false);
      break;
    case "install-project":
      await installPrompt(prompt, true);
      break;
    case "export-md":
      await exportToMd(prompt);
      break;
    case "back":
      return "back";
    case "exit":
      return "exit";
  }

  // Continue with same prompt actions
  return promptAction(prompt);
}

export async function interactiveCommand(_options: InteractiveOptions): Promise<void> {
  console.log(chalk.bold.cyan("\n🎯 JeffreysPrompts Interactive Mode"));
  console.log(chalk.dim("Type to search, use arrow keys to select, Enter to choose\n"));

  while (true) {
    try {
      // Search/select a prompt
      const selectedId = await search<string>({
        message: "Search prompts:",
        source: async (input) => {
          if (!input || input.trim().length === 0) {
            // Show all prompts when no input
            return prompts.slice(0, 20).map((p) => ({
              name: `${p.title} ${chalk.dim(`[${p.category}]`)}`,
              value: p.id,
              description: p.description,
            }));
          }

          // Use BM25 search
          const results = searchPrompts(input.trim(), { limit: 15 });
          return results.map(({ prompt: p, score }) => ({
            name: `${p.title} ${chalk.dim(`[${p.category}]`)} ${chalk.dim(`(${score.toFixed(1)})`)}`,
            value: p.id,
            description: p.description,
          }));
        },
      });

      const prompt = getPrompt(selectedId);
      if (!prompt) {
        console.log(chalk.red("Prompt not found"));
        continue;
      }

      const result = await promptAction(prompt);
      if (result === "exit") {
        console.log(chalk.dim("\nGoodbye! 👋\n"));
        break;
      }
      // "back" continues the loop to search again
    } catch (err) {
      // Handle Ctrl+C or other interrupts
      if ((err as Error).message?.includes("User force closed")) {
        console.log(chalk.dim("\n\nGoodbye! 👋\n"));
        break;
      }
      throw err;
    }
  }
}
