import { prompts } from "@jeffreysprompts/core/prompts";
import Table from "cli-table3";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";

interface ListOptions {
  category?: string;
  tag?: string;
  json?: boolean;
}

export function listCommand(options: ListOptions) {
  let results = prompts;

  if (options.category) {
    results = results.filter((p) => p.category === options.category);
  }

  if (options.tag) {
    results = results.filter((p) => p.tags.includes(options.tag!));
  }

  if (shouldOutputJson(options)) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  const table = new Table({
    head: ["ID", "Title", "Category", "Tags"],
    style: { head: ["cyan"] },
  });

  for (const prompt of results) {
    table.push([
      prompt.id,
      prompt.title,
      chalk.green(prompt.category),
      prompt.tags.slice(0, 3).join(", "),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`
Found ${results.length} prompts`));
}
