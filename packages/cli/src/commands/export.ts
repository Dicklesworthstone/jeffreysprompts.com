import { writeFileSync } from "fs";
import { getPrompt, prompts } from "@jeffreysprompts/core/prompts";
import { generateSkillMd } from "@jeffreysprompts/core/export/skills";
import { generatePromptMarkdown } from "@jeffreysprompts/core/export/markdown";
import chalk from "chalk";

interface ExportOptions {
  format?: "skill" | "md";
  all?: boolean;
  stdout?: boolean;
  json?: boolean;
}

export function exportCommand(ids: string[], options: ExportOptions) {
  const format = options.format || "skill";
  
  let promptsToExport = [...prompts];
  if (!options.all) {
    if (ids.length === 0) {
       console.error(chalk.red("Error: No prompts specified. Use <id> or --all"));
       process.exit(1);
    }
    promptsToExport = ids.map(id => {
        const p = getPrompt(id);
        if(!p) {
             console.error(chalk.red(`Prompt not found: ${id}`));
             process.exit(1);
        }
        return p;
    });
  }

  const results: {id: string, file: string}[] = [];

  for (const prompt of promptsToExport) {
    const content = format === "skill" ? generateSkillMd(prompt) : generatePromptMarkdown(prompt);
    
    if (options.stdout) {
      console.log(content);
      if (promptsToExport.length > 1) console.log("\n---\n");
    } else {
      const ext = format === "skill" ? "-SKILL.md" : ".md";
      const filename = `${prompt.id}${ext}`;
      writeFileSync(filename, content);
      results.push({ id: prompt.id, file: filename });
    }
  }

  if (!options.stdout) {
    if (options.json) {
      console.log(JSON.stringify({ exported: results }, null, 2));
    } else {
      console.log(chalk.green(`Exported ${results.length} file(s):`));
      for (const res of results) {
        console.log(`  ✓ ${res.file}`);
      }
    }
  }
}
