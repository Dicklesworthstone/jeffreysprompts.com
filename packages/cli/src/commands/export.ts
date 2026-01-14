import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { generateSkillMd } from "@jeffreysprompts/core/export/skills";
import { generatePromptMarkdown } from "@jeffreysprompts/core/export/markdown";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";

interface ExportOptions {
  format?: "skill" | "md";
  outputDir?: string;
  all?: boolean;
  stdout?: boolean;
  json?: boolean;
}

export async function exportCommand(ids: string[], options: ExportOptions) {
  const format = options.format || "skill";
  const outputDir = options.outputDir || process.cwd();
  
  // Load registry dynamically (SWR pattern)
  const registry = await loadRegistry();
  
  let promptsToExport = [...registry.prompts];
  
  if (!options.all) {
    if (ids.length === 0) {
       console.error(chalk.red("Error: No prompts specified. Use <id> or --all"));
       process.exit(1);
    }
    
    // Filter prompts by ID list
    const foundPrompts = [];
    for (const id of ids) {
      const p = registry.prompts.find(prompt => prompt.id === id);
      if(!p) {
           console.error(chalk.red(`Prompt not found: ${id}`));
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
      if (shouldOutputJson(options)) {
        console.log(JSON.stringify({ error: true, code: "fs_error", message }));
      } else {
        console.error(chalk.red(`Failed to create output directory: ${message}`));
      }
      process.exit(1);
    }
  }

  const results: {id: string, file: string}[] = [];

  const failed: { id: string; error: string }[] = [];

  for (const prompt of promptsToExport) {
    const content = format === "skill" ? generateSkillMd(prompt) : generatePromptMarkdown(prompt);

    if (options.stdout) {
      console.log(content);
      if (promptsToExport.length > 1) console.log("\n---\n");
    } else {
      const ext = format === "skill" ? "-SKILL.md" : ".md";
      const filename = join(outputDir, `${prompt.id}${ext}`);
      try {
        writeFileSync(filename, content);
        results.push({ id: prompt.id, file: filename });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        failed.push({ id: prompt.id, error: message });
        if (!shouldOutputJson(options)) {
          console.error(chalk.red(`Failed to write ${filename}: ${message}`));
        }
      }
    }
  }

  if (!options.stdout) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({
        success: failed.length === 0,
        exported: results,
        failed: failed.length > 0 ? failed : undefined,
      }, null, 2));
      if (failed.length > 0) {
        process.exit(1);
      }
    } else {
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
  }
}
