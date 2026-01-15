import { type Prompt } from "@jeffreysprompts/core/prompts";
import {
  renderPrompt,
  getMissingVariables,
  extractVariables,
} from "@jeffreysprompts/core/template/render";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import {
  parseVariables,
  promptForVariable,
  processVariableValue,
} from "../lib/variables";
import { loadRegistry } from "../lib/registry-loader";
import { copyToClipboard } from "../lib/clipboard";

interface CopyOptions {
  fill?: boolean;
  json?: boolean;
}

export async function copyCommand(id: string, options: CopyOptions) {
  // Load registry dynamically (SWR pattern)
  const registry = await loadRegistry();
  const prompt = registry.prompts.find((p) => p.id === id);

  if (!prompt) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({ error: "not_found", message: `Prompt not found: ${id}` }));
    } else {
      console.error(chalk.red(`Prompt not found: ${id}`));
    }
    process.exit(1);
    return;
  }

  // Parse CLI variables
  let variables = parseVariables(process.argv);

  // Process variable values based on their types
  const processedVars: Record<string, string> = {};
  for (const [name, value] of Object.entries(variables)) {
    const varDef = prompt.variables?.find((v) => v.name === name);
    try {
      processedVars[name] = processVariableValue(value, varDef);
    } catch (err) {
      if (shouldOutputJson(options)) {
        console.log(JSON.stringify({ error: "variable_error", message: (err as Error).message }));
      } else {
        console.error(chalk.red((err as Error).message));
      }
      process.exit(1);
    }
  }
  variables = processedVars;

  // Interactive fill mode: prompt for missing variables
  if (options.fill && prompt.variables?.length) {
    const contentVars = extractVariables(prompt.content);
    const promptVars = prompt.variables.filter((v) => contentVars.includes(v.name));

    for (const varDef of promptVars) {
      if (variables[varDef.name] === undefined || variables[varDef.name] === "") {
        try {
          const value = await promptForVariable(varDef, variables[varDef.name]);
          variables[varDef.name] = value;
        } catch {
          if (shouldOutputJson(options)) {
            console.log(JSON.stringify({ error: "cancelled", message: "User cancelled input" }));
          } else {
            console.error(chalk.yellow("\nCancelled."));
          }
          process.exit(130);
        }
      }
    }
  }

  // Check for missing required variables
  const missing = getMissingVariables(prompt, variables);
  if (missing.length > 0) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({
        error: "missing_variables",
        message: `Missing required variables: ${missing.join(", ")}`,
        missing,
        hint: options.fill
          ? "Required variables cannot be empty"
          : "Use --fill to prompt interactively or provide --VAR=value flags",
      }));
    } else {
      console.error(chalk.red(`Missing required variables: ${missing.join(", ")}`));
      if (!options.fill) {
        console.log(chalk.dim("Use --fill to prompt interactively or provide --VAR=value flags"));
      }
    }
    process.exit(1);
  }

  // Render the prompt
  const rendered = renderPrompt(prompt, variables);

  // Copy to clipboard
  const success = await copyToClipboard(rendered);

  if (shouldOutputJson(options)) {
    if (success) {
      console.log(JSON.stringify({
        success: true,
        id: prompt.id,
        title: prompt.title,
        characters: rendered.length,
        message: `Copied "${prompt.title}" to clipboard`,
      }));
    } else {
      console.log(JSON.stringify({
        success: false,
        error: "clipboard_failed",
        message: "Failed to copy to clipboard - no clipboard tool available",
        fallback: rendered,
      }));
      process.exit(1);
    }
  } else {
    if (success) {
      console.log(chalk.green(`✓ Copied "${prompt.title}" to clipboard`));
      console.log(chalk.dim(`  ${rendered.length} characters`));
    } else {
      console.error(chalk.yellow("Clipboard tool not found. Outputting to stdout:"));
      console.log();
      console.log(rendered);
    }
  }
}
