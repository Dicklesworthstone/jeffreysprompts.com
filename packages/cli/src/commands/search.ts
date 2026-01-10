import { searchPrompts } from "@jeffreysprompts/core/search";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";

interface SearchOptions {
  json?: boolean;
}

export function searchCommand(query: string, options: SearchOptions) {
  const results = searchPrompts(query, { limit: 10 });

  if (shouldOutputJson(options)) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log(chalk.yellow("No prompts found."));
    return;
  }

  console.log(chalk.bold(`Found ${results.length} matches for "${query}":\n`));

  for (const { prompt, score, matchedFields } of results) {
    console.log(`${chalk.cyan.bold(prompt.title)} ${chalk.dim(`(${prompt.id})`)}`);
    console.log(`${chalk.green(prompt.category)} • ${prompt.description}`);
    console.log(chalk.dim(`Match score: ${score.toFixed(2)}`));
    console.log();
  }
}
