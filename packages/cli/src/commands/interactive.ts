import { select, search, Separator } from "@inquirer/prompts";
import { type Prompt } from "@jeffreysprompts/core/prompts";
import { searchPrompts, buildScorerIndex } from "@jeffreysprompts/core/search";
import { generatePromptMarkdown } from "@jeffreysprompts/core/export";
import chalk from "chalk";
import boxen from "boxen";
import { writeFileSync } from "fs";
import { loadRegistry } from "../lib/registry-loader";
import { copyToClipboard } from "../lib/clipboard";

interface InteractiveOptions {
  // No options yet, placeholder for future
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

async function exportToMd(prompt: Prompt): Promise<void> {
  const md = generatePromptMarkdown(prompt);
  const filename = `${prompt.id}.md`;
  writeFileSync(filename, md);
  console.log(chalk.green(`✓ Exported to ${chalk.bold(filename)}`));
}

async function promptAction(prompt: Prompt): Promise<"back" | "exit"> {
  while (true) {
    const action = await select({
      message: `${chalk.cyan(prompt.title)} - Choose an action:`,
      choices: [
        { name: "📋 Copy to clipboard", value: "copy" },
        { name: "👁️  View full prompt", value: "view" },
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
      case "export-md":
        await exportToMd(prompt);
        break;
      case "back":
        return "back";
      case "exit":
        return "exit";
    }
  }
}

export async function interactiveCommand(_options: InteractiveOptions): Promise<void> {
  // Load registry dynamically (SWR pattern)
  const registry = await loadRegistry();
  const dynamicPrompts = registry.prompts;
  
  // Build lookup map and search index
  const promptsMap = new Map(dynamicPrompts.map((p) => [p.id, p]));
  const searchIndex = buildScorerIndex(dynamicPrompts);

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
            return dynamicPrompts.slice(0, 20).map((p) => ({
              name: `${p.title} ${chalk.dim(`[${p.category}]`)}`,
              value: p.id,
              description: p.description,
            }));
          }

          const results = searchPrompts(input.trim(), {
            limit: 15,
            scorerIndex: searchIndex,
            promptsMap: promptsMap
          });
          
          return results.map(({ prompt: p, score }) => ({
            name: `${p.title} ${chalk.dim(`[${p.category}]`)} ${chalk.dim(`(${score.toFixed(1)})`)}`,
            value: p.id,
            description: p.description,
          }));
        },
      });

      const prompt = promptsMap.get(selectedId);
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
