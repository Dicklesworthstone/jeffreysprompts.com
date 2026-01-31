import { mkdirSync } from "fs";
import { join } from "path";
import { generatePromptMarkdown } from "@jeffreysprompts/core/export/markdown";
import chalk from "chalk";
import { exitWithDeprecatedSkillCommand, shouldOutputJson, atomicWriteFileSync } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";

interface ExportOptions {
  format?: string;
  outputDir?: string;
  all?: boolean;
  stdout?: boolean;
  json?: boolean;
}

export async function exportCommand(ids: string[], options: ExportOptions) {
  const format = (options.format || "md").toLowerCase();
  const outputDir = options.outputDir || process.cwd();
  const jsonOutput = options.json === true || (!process.stdout.isTTY && !options.stdout);

  const writeJsonError = (code: string, message: string, extra: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({ error: true, code, message, ...extra }, null, 2));
  };

  if (format === "skill") {
    exitWithDeprecatedSkillCommand(
      options,
      "Skill export moved to jsm. Run: jsm --help"
    );
  }
  if (format !== "md") {
    if (jsonOutput) {
      writeJsonError("invalid_format", `Unsupported format: ${format}`, { supported: ["md"] });
    } else {
      console.error(chalk.red(`Unsupported format: ${format}. Supported: md`));
    }
    process.exit(1);
  }
  
  // Load registry dynamically (SWR pattern)
  const registry = await loadRegistry();
  
  let promptsToExport = [...registry.prompts];
  
  if (!options.all) {
    if (ids.length === 0) {
      if (jsonOutput) {
        writeJsonError("missing_ids", "No prompts specified. Use <id> or --all");
      } else {
        console.error(chalk.red("Error: No prompts specified. Use <id> or --all"));
      }
      process.exit(1);
    }
    
    // Filter prompts by ID list
    const foundPrompts = [];
    for (const id of ids) {
      const p = registry.prompts.find(prompt => prompt.id === id);
      if (!p) {
        if (jsonOutput) {
          writeJsonError("not_found", `Prompt not found: ${id}`, { id });
        } else {
          console.error(chalk.red(`Prompt not found: ${id}`));
        }
        process.exit(1);
      }
      foundPrompts.push(p);
    }
    promptsToExport = foundPrompts;
  }

  // Ensure output directory exists if we are writing files
  if (!options.stdout) {
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (jsonOutput) {
        writeJsonError("fs_error", message);
      } else {
        console.error(chalk.red(`Failed to create output directory: ${message}`));
      }
      process.exit(1);
    }
  }

  const results: Array<{ id: string; file?: string; content?: string }> = [];

  const failed: { id: string; error: string }[] = [];

  for (const [index, prompt] of promptsToExport.entries()) {
    const content = generatePromptMarkdown(prompt);

    if (options.stdout) {
      if (jsonOutput) {
        results.push({ id: prompt.id, content });
      } else {
        console.log(content);
        if (index < promptsToExport.length - 1) {
          console.log("\n---\n");
        }
      }
    } else {
      const filename = join(outputDir, `${prompt.id}.md`);
      try {
        atomicWriteFileSync(filename, content);
        results.push({ id: prompt.id, file: filename });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failed.push({ id: prompt.id, error: message });
        if (!jsonOutput) {
          console.error(chalk.red(`Failed to write ${filename}: ${message}`));
        }
      }
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({
      success: failed.length === 0,
      format,
      stdout: options.stdout ?? false,
      exported: results,
      failed: failed.length > 0 ? failed : undefined,
    }, null, 2));
    if (!options.stdout && failed.length > 0) {
      process.exit(1);
    }
    return;
  }

  if (options.stdout) {
    return;
  }

  if (results.length > 0) {
    console.log(chalk.green(`Exported ${results.length} file(s):`));
    for (const res of results) {
      console.log(`  ✓ ${res.file}`);
    }
  }
  if (failed.length > 0) {
    console.log(chalk.red(`Failed to export ${failed.length} file(s).`));
    process.exit(1);
  }
}
