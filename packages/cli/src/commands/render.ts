import { existsSync, openSync, readSync, closeSync, statSync } from "fs";
import { type Prompt } from "@jeffreysprompts/core/prompts";
import {
  renderPrompt,
  getMissingVariables,
  extractVariables,
  getDynamicDefaults,
} from "@jeffreysprompts/core/template";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import {
  parseVariables,
  promptForVariable,
  processVariableValue,
} from "../lib/variables";
import { loadRegistry } from "../lib/registry-loader";

interface RenderOptions {
  context?: string;
  stdin?: boolean;
  maxContext?: string;
  fill?: boolean;
  json?: boolean;
}

// Default max context size (200KB)
const DEFAULT_MAX_CONTEXT = 204800;

export async function renderCommand(id: string, options: RenderOptions) {
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

  const promptData = prompt;

  // Parse CLI variables
  let variables = parseVariables(process.argv);

  // Inject dynamic defaults (CWD, PROJECT_NAME)
  const defaults = getDynamicDefaults(process.cwd());
  variables = { ...defaults, ...variables };

  // Process variable values based on their types
  const processedVars: Record<string, string> = {};
  for (const [name, value] of Object.entries(variables)) {
    const varDef = promptData.variables?.find((v) => v.name === name);
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
  if (options.fill && promptData.variables?.length) {
    const contentVars = extractVariables(promptData.content);
    const promptVars = promptData.variables.filter((v) => contentVars.includes(v.name));

    for (const varDef of promptVars) {
      if (variables[varDef.name] === undefined || variables[varDef.name] === "") {
        try {
          const value = await promptForVariable(varDef, variables[varDef.name]);
          variables[varDef.name] = value;
        } catch (err) {
          // User cancelled (Ctrl+C)
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
  const missing = getMissingVariables(promptData, variables);
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

  // Handle context
  let context = "";
  const parsedMax = Number.parseInt(options.maxContext || String(DEFAULT_MAX_CONTEXT), 10);
  const maxContext = Number.isFinite(parsedMax) ? parsedMax : DEFAULT_MAX_CONTEXT;
  let contextSource = "";

  if (options.stdin) {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const STDIN_TIMEOUT_MS = 30000; // 30 second timeout for stdin
    // Allow slightly more than maxContext to detect truncation, but cap memory usage
    const readLimit = maxContext + 1024;

    // Create a timeout promise that rejects if stdin takes too long
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("stdin_timeout")), STDIN_TIMEOUT_MS);
    });

    // Read stdin with timeout protection and size limit
    const readStdin = async () => {
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
        totalBytes += chunk.length;
        // Early termination once we have enough data (prevents memory exhaustion)
        if (totalBytes >= readLimit) {
          break;
        }
      }
    };

    try {
      await Promise.race([readStdin(), timeoutPromise]);
    } catch (err) {
      if (err instanceof Error && err.message === "stdin_timeout") {
        if (shouldOutputJson(options)) {
          console.log(JSON.stringify({ error: "stdin_timeout", message: "Timed out waiting for stdin input (30s)" }));
        } else {
          console.error(chalk.red("Timed out waiting for stdin input (30s). Did you mean to pipe content?"));
        }
        process.exit(1);
      }
      throw err;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
    context = Buffer.concat(chunks).toString("utf-8");
    contextSource = "stdin";
  } else if (options.context) {
    if (!existsSync(options.context)) {
      if (shouldOutputJson(options)) {
        console.log(JSON.stringify({ error: "file_not_found", message: `Context file not found: ${options.context}` }));
      } else {
        console.error(chalk.red(`Context file not found: ${options.context}`));
      }
      process.exit(1);
    }
    
    // Read file carefully to avoid memory exhaustion
    try {
      const fd = openSync(options.context, "r");
      try {
        const stats = statSync(options.context);
        // Read up to maxContext + 1 to detect truncation
        const bytesToRead = Math.min(stats.size, maxContext + 1);
        const buffer = Buffer.alloc(bytesToRead);
        const bytesRead = readSync(fd, buffer, 0, bytesToRead, 0);
        context = buffer.slice(0, bytesRead).toString("utf-8");
        contextSource = options.context;
      } finally {
        closeSync(fd);
      }
    } catch (err) {
      if (shouldOutputJson(options)) {
        console.log(JSON.stringify({ error: "read_error", message: `Failed to read context file: ${(err as Error).message}` }));
      } else {
        console.error(chalk.red(`Failed to read context file: ${(err as Error).message}`));
      }
      process.exit(1);
    }
  }

  let truncated = false;
  if (context.length > maxContext) {
    context = context.slice(0, maxContext);
    truncated = true;
  }

  // Render the prompt with variables
  let rendered = renderPrompt(promptData, variables);

  // Append context if provided
  if (context) {
    rendered += "\n\n---\n\n## Context\n\n" + context;
    if (truncated) {
      const note = contextSource === "stdin"
        ? `[Context truncated to ${maxContext} characters]`
        : `[Context from ${contextSource} truncated to ${maxContext} characters]`;
      rendered += `\n\n${note}`;
    }
  }

  // Output
  if (shouldOutputJson(options)) {
    console.log(JSON.stringify({
      id: promptData.id,
      title: promptData.title,
      rendered,
      variables: Object.keys(variables).length > 0 ? variables : undefined,
      context: context ? { source: contextSource, truncated, characters: context.length } : undefined,
    }, null, 2));
  } else {
    console.log(rendered);
  }
}
