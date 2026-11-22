import boxen from "boxen";
import chalk from "chalk";
import { shouldOutputJson, writeJsonStdout, writeStdout } from "../lib/utils";
import { resolvePromptById } from "../lib/prompt-resolution";

interface ShowOptions {
  json?: boolean;
  raw?: boolean;
}

export async function showCommand(id: string, options: ShowOptions) {
  const resolved = await resolvePromptById(id);

  if (!resolved.prompt) {
    if (shouldOutputJson(options) && resolved.error === "not_found") {
      // NOTE: Error schema is { error: "not_found" } only - no message field
      // This is a stable API contract (see json-schema-golden.test.ts)
      await writeJsonStdout({ error: "not_found" });
    } else if (shouldOutputJson(options)) {
      await writeJsonStdout({
        error: true,
        code: resolved.error ?? "api_error",
        message: resolved.message ?? `Prompt unavailable: ${id}`,
      });
    } else {
      console.error(chalk.red(resolved.message ?? `Prompt unavailable: ${id}`));
    }
    process.exit(1);
    return;
  }

  const prompt = resolved.prompt;

  if (shouldOutputJson(options)) {
    await writeJsonStdout(prompt, true);
    return;
  }

  if (options.raw) {
    await writeStdout(prompt.content + "\n");
    return;
  }

  await writeStdout(
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
    ) + "\n"
  );
}
