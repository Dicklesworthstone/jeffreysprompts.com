import { getPrompt } from "@jeffreysprompts/core/prompts";
import boxen from "boxen";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";

interface ShowOptions {
  json?: boolean;
  raw?: boolean;
}

export function showCommand(id: string, options: ShowOptions) {
  const prompt = getPrompt(id);

  if (!prompt) {
    if (options.json) {
      console.log(JSON.stringify({ error: "not_found" }));
    } else {
      console.error(chalk.red(`Prompt not found: ${id}`));
    }
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(prompt, null, 2));
    return;
  }

  if (options.raw) {
    console.log(prompt.content);
    return;
  }

  console.log(
    boxen(
      `${chalk.bold.cyan(prompt.title)}
` +
        `${chalk.dim(prompt.description)}

` +
        `${chalk.green("Category:")} ${prompt.category}
` +
        `${chalk.green("Tags:")} ${prompt.tags.join(", ")}
` +
        `${chalk.green("Author:")} ${prompt.author}
` +
        `${chalk.dim("—".repeat(40))}

` +
        prompt.content,
      {
        padding: 1,
        borderStyle: "round",
        borderColor: "cyan",
      }
    )
  );
}
