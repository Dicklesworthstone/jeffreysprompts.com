#!/usr/bin/env bun
// jfp.ts - Jeffrey's Prompts CLI
// Thin wrapper that imports from @jeffreysprompts/cli

import { cac } from "cac";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";
import {
  prompts,
  getPrompt,
  categories,
  tags,
} from "@jeffreysprompts/core";
import { searchPrompts } from "@jeffreysprompts/core/search/engine";
import { generateSkillMd } from "@jeffreysprompts/core/export/skills";
import { generatePromptMarkdown } from "@jeffreysprompts/core/export/markdown";
import { renderPrompt } from "@jeffreysprompts/core/template/render";

const VERSION = "1.0.0";

const cli = cac("jfp");

// Detect if running in TTY (interactive) or piped
const isTTY = process.stdout.isTTY;

// Format output based on mode
function output(data: unknown, forceJson = false): void {
  if (forceJson || !isTTY) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    if (typeof data === "string") {
      console.log(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

// Quick-start help (shown when no args)
function showQuickStart(): void {
  const help = `
jfp — Jeffrey's Prompts CLI

QUICK START:
  jfp list                    List all prompts
  jfp search "idea"           BM25 search
  jfp show idea-wizard        View full prompt
  jfp install idea-wizard     Install as Claude Code skill

ADD --json TO ANY COMMAND FOR MACHINE-READABLE OUTPUT

EXPLORE:
  jfp i                       Interactive browser (fzf-style)

MORE: jfp help | Docs: jeffreysprompts.com
`.trim();
  console.log(help);
}

// List command
cli
  .command("list", "List all prompts")
  .option("--json", "Output as JSON")
  .option("--category <cat>", "Filter by category")
  .option("--tag <tag>", "Filter by tag")
  .option("--featured", "Show only featured prompts")
  .option("--limit <n>", "Maximum number of results")
  .action((options) => {
    let result = [...prompts];

    if (options.category) {
      result = result.filter((p) => p.category === options.category);
    }
    if (options.tag) {
      result = result.filter((p) => p.tags.includes(options.tag));
    }
    if (options.featured) {
      result = result.filter((p) => p.featured);
    }
    if (options.limit) {
      result = result.slice(0, parseInt(options.limit, 10));
    }

    if (options.json || !isTTY) {
      output(
        result.map(({ id, title, description, category, tags, featured }) => ({
          id,
          title,
          description,
          category,
          tags,
          featured,
        })),
        true
      );
    } else {
      // Compact table: ID | Category | Tags (up to 3) | Description
      console.log("ID".padEnd(22) + "Category".padEnd(14) + "Tags".padEnd(25) + "Description");
      console.log("─".repeat(80));
      for (const p of result) {
        const tagStr = p.tags.slice(0, 3).join(", ") + (p.tags.length > 3 ? "..." : "");
        const desc = p.description.length > 25 ? p.description.slice(0, 22) + "..." : p.description;
        console.log(
          `${p.id.padEnd(22)}${p.category.padEnd(14)}${tagStr.padEnd(25)}${desc}`
        );
      }
      console.log(`\n${result.length} prompt(s) found`);
    }
  });

// Search command
cli
  .command("search <query>", "Search prompts")
  .option("--json", "Output as JSON")
  .option("--limit <n>", "Max results", { default: 20 })
  .action((query, options) => {
    const limit = parseInt(options.limit, 10);
    const results = searchPrompts(query, { limit });

    if (options.json || !isTTY) {
      output(
        {
          query,
          count: results.length,
          results: results.map((r) => ({
            id: r.prompt.id,
            score: r.score,
            title: r.prompt.title,
            description: r.prompt.description,
          })),
        },
        true
      );
    } else {
      if (results.length === 0) {
        console.log(`No results for "${query}"`);
      } else {
        console.log(`Search: "${query}" (${results.length} result${results.length !== 1 ? "s" : ""})\n`);
        results.forEach((r, i) => {
          console.log(`${String(i + 1).padStart(2)}. ${r.prompt.id.padEnd(20)} [${r.score.toFixed(2)}] ${r.prompt.title}`);
        });
      }
    }
  });

// Show command
cli
  .command("show <id>", "Show a prompt")
  .option("--json", "Output as JSON")
  .option("--raw", "Output just the prompt content")
  .action((id, options) => {
    const prompt = getPrompt(id);

    if (!prompt) {
      console.error(`Prompt not found: ${id}`);
      process.exit(1);
    }

    if (options.raw) {
      console.log(prompt.content);
    } else if (options.json || !isTTY) {
      output(prompt, true);
    } else {
      // Markdown-style human output
      console.log(`# ${prompt.title}\n`);
      console.log(`> ${prompt.description}\n`);
      console.log(`**Category:** ${prompt.category}`);
      console.log(`**Tags:** ${prompt.tags.join(", ")}`);
      console.log(`**Author:** ${prompt.author}${prompt.twitter ? ` (${prompt.twitter})` : ""}`);
      console.log(`**Version:** ${prompt.version}`);
      if (prompt.difficulty) console.log(`**Difficulty:** ${prompt.difficulty}`);
      console.log("\n---\n");
      console.log("## Prompt\n");
      console.log("```");
      console.log(prompt.content);
      console.log("```");

      if (prompt.whenToUse && prompt.whenToUse.length > 0) {
        console.log("\n## When to Use\n");
        for (const use of prompt.whenToUse) {
          console.log(`- ${use}`);
        }
      }

      if (prompt.tips && prompt.tips.length > 0) {
        console.log("\n## Tips\n");
        for (const tip of prompt.tips) {
          console.log(`- ${tip}`);
        }
      }

      if (prompt.examples && prompt.examples.length > 0) {
        console.log("\n## Examples\n");
        for (const example of prompt.examples) {
          console.log(`- ${example}`);
        }
      }
    }
  });

// Export command
cli
  .command("export [...ids]", "Export prompts to files")
  .option("--format <format>", "Format: skill or md", { default: "skill" })
  .option("--all", "Export all prompts")
  .option("--stdout", "Print to stdout instead of files")
  .option("--json", "Output as JSON")
  .action((ids, options) => {
    // Determine prompts to export
    let promptsToExport: typeof prompts = [];
    if (options.all) {
      promptsToExport = [...prompts];
    } else {
      if (!ids || ids.length === 0) {
        console.error("Error: Provide prompt IDs or use --all");
        process.exit(1);
      }
      for (const id of ids) {
        const p = getPrompt(id);
        if (!p) {
          console.error(`Error: Prompt not found: ${id}`);
          process.exit(1);
        }
        promptsToExport.push(p);
      }
    }

    const exported: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const prompt of promptsToExport) {
      const content = options.format === "skill"
        ? generateSkillMd(prompt)
        : generatePromptMarkdown(prompt);

      if (options.stdout) {
        console.log(content);
        if (promptsToExport.length > 1) console.log("\n---\n");
      } else {
        const ext = options.format === "skill" ? "-SKILL.md" : ".md";
        const filename = `${prompt.id}${ext}`;
        try {
          writeFileSync(filename, content);
          exported.push(filename);
        } catch (err) {
          errors.push({ id: prompt.id, error: String(err) });
        }
      }
    }

    if (!options.stdout) {
      if (options.json || !isTTY) {
        output({ exported, errors }, true);
      } else {
        if (exported.length > 0) {
          console.log(`Exported ${exported.length} file(s):`);
          for (const f of exported) {
            console.log(`  ✓ ${f}`);
          }
        }
        if (errors.length > 0) {
          console.error(`Failed to export ${errors.length} file(s):`);
          for (const e of errors) {
            console.error(`  ✗ ${e.id}: ${e.error}`);
          }
          process.exit(1);
        }
      }
    }
  });

// Render command - renders prompt with variable substitution
cli
  .command("render <id>", "Render prompt with variables")
  .option("--context <path>", "Append file content as context")
  .option("--stdin", "Read context from stdin")
  .option("--max-context <bytes>", "Max context size in bytes", { default: "204800" })
  .action(async (id, options) => {
    const prompt = getPrompt(id);

    if (!prompt) {
      console.error(`Prompt not found: ${id}`);
      process.exit(1);
    }

    // Parse --VAR=value from process.argv
    const variables: Record<string, string> = {};
    for (const arg of process.argv) {
      const match = arg.match(/^--([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        variables[match[1]] = match[2];
      }
    }

    // Read context from file or stdin
    let context = "";
    const maxContext = parseInt(options.maxContext, 10);

    if (options.stdin) {
      // Read from stdin
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      context = Buffer.concat(chunks).toString("utf-8");
    } else if (options.context) {
      if (!existsSync(options.context)) {
        console.error(`Context file not found: ${options.context}`);
        process.exit(1);
      }
      context = readFileSync(options.context, "utf-8");
    }

    // Truncate context if needed
    let truncated = false;
    if (context.length > maxContext) {
      context = context.slice(0, maxContext);
      truncated = true;
    }

    // Render the prompt
    let rendered = renderPrompt(prompt, variables);

    // Append context if provided
    if (context) {
      rendered += "\n\n---\n\n## Context\n\n" + context;
      if (truncated) {
        rendered += `\n\n[Context truncated to ${maxContext} bytes]`;
      }
    }

    console.log(rendered);
  });

// Install command
cli
  .command("install [...ids]", "Install prompts as Claude Code skills")
  .option("--all", "Install all prompts")
  .option("--project", "Install to project directory (.claude/skills)")
  .option("--json", "Output as JSON")
  .action((ids, options) => {
    // Determine target directory
    let targetBaseDir: string;
    if (options.project) {
      targetBaseDir = resolve(process.cwd(), ".claude", "skills");
    } else {
      targetBaseDir = join(homedir(), ".config", "claude", "skills");
    }

    // Determine prompts to install
    let promptsToInstall: typeof prompts = [];
    if (options.all) {
      promptsToInstall = [...prompts];
    } else {
      if (!ids || ids.length === 0) {
        console.error("Error: Provide prompt IDs or use --all");
        process.exit(1);
      }
      for (const id of ids) {
        const p = getPrompt(id);
        if (!p) {
          console.error(`Error: Prompt not found: ${id}`);
          process.exit(1);
        }
        promptsToInstall.push(p);
      }
    }

    const installed = [];
    const errors = [];

    for (const prompt of promptsToInstall) {
      try {
        const skillDir = join(targetBaseDir, prompt.id);
        const skillFile = join(skillDir, "SKILL.md");

        mkdirSync(skillDir, { recursive: true });
        writeFileSync(skillFile, generateSkillMd(prompt));
        installed.push(prompt.id);
      } catch (err) {
        errors.push({ id: prompt.id, error: String(err) });
      }
    }

    if (options.json) {
      output({ installed, errors }, true);
    } else {
      if (installed.length > 0) {
        console.log(`Installed ${installed.length} skill(s) to ${targetBaseDir}`);
        for (const id of installed) {
          console.log(`  ✓ ${id}`);
        }
      }
      if (errors.length > 0) {
        console.error(`Failed to install ${errors.length} skill(s):`);
        for (const e of errors) {
          console.error(`  ✗ ${e.id}: ${e.error}`);
        }
        process.exit(1);
      }
    }
  });

// Interactive command (placeholder)
cli
  .command("i", "Interactive browser")
  .action(() => {
    console.log("Interactive mode not yet implemented in this version.");
    console.log("Please use 'jfp list' and 'jfp search' for now.");
  });

// Categories command
cli
  .command("categories", "List categories")
  .option("--json", "Output as JSON")
  .action((options) => {
    if (options.json) {
      output(categories, true);
    } else {
      for (const cat of categories) {
        console.log(cat);
      }
    }
  });

// Tags command
cli
  .command("tags", "List tags")
  .option("--json", "Output as JSON")
  .action((options) => {
    if (options.json) {
      output(tags, true);
    } else {
      for (const tag of tags) {
        console.log(tag);
      }
    }
  });

// Default command (no args)
cli.command("", "Show quick-start help").action(() => {
  showQuickStart();
});

// Help and version
cli.help();
cli.version(VERSION);

// Parse and run
cli.parse();
