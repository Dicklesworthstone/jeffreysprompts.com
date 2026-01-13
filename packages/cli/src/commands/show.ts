import boxen from "boxen";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";

interface ShowOptions {
  json?: boolean;
  raw?: boolean;
}

export async function showCommand(id: string, options: ShowOptions) {
  // Load registry dynamically (SWR pattern)
  const registry = await loadRegistry();
  const prompt = registry.prompts.find((p) => p.id === id);

  if (!prompt) {
    if (shouldOutputJson(options)) {
      // NOTE: Error schema is { error: "not_found" } only - no message field
      // This is a stable API contract (see json-schema-golden.test.ts)
      console.log(JSON.stringify({ error: "not_found" }));
    } else {
      console.error(chalk.red(`Prompt not found: ${id}`));
    }
    process.exit(1);
  }

  if (shouldOutputJson(options)) {
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
