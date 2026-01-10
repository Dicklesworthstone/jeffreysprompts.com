import { existsSync, readFileSync } from "fs";
import { getPrompt } from "@jeffreysprompts/core/prompts";
import { renderPrompt } from "@jeffreysprompts/core/template/render";
import chalk from "chalk";

interface RenderOptions {
  context?: string;
  stdin?: boolean;
  maxContext?: string;
  json?: boolean;
}

// Parse --VAR=value args from raw argv (since cac doesn't handle dynamic flags well)
function parseVariables(args: string[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const arg of args) {
    const match = arg.match(/^--([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  }
  return vars;
}

export async function renderCommand(id: string, options: RenderOptions) {
  const prompt = getPrompt(id);
  if (!prompt) {
    console.error(chalk.red(`Prompt not found: ${id}`));
    process.exit(1);
  }

  const variables = parseVariables(process.argv);
  
  let context = "";
  const maxContext = parseInt(options.maxContext || "204800", 10);

  if (options.stdin) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    context = Buffer.concat(chunks).toString("utf-8");
  } else if (options.context) {
    if (!existsSync(options.context)) {
      console.error(chalk.red(`Context file not found: ${options.context}`));
      process.exit(1);
    }
    context = readFileSync(options.context, "utf-8");
  }

  let truncated = false;
  if (context.length > maxContext) {
    context = context.slice(0, maxContext);
    truncated = true;
  }

  let rendered = renderPrompt(prompt, variables);

  if (context) {
    rendered += "\n\n---\n\n## Context\n\n" + context;
    if (truncated) {
      rendered += `\n\n[Context truncated to ${maxContext} bytes]`
    }
  }

  if (options.json) {
    console.log(JSON.stringify({ id: prompt.id, rendered }, null, 2));
  } else {
    console.log(rendered);
  }
}
