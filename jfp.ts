#!/usr/bin/env bun
// jfp.ts - Jeffrey's Prompts CLI
// Thin wrapper that imports from @jeffreysprompts/cli

import { cac } from "cac";
import { mkdirSync, writeFileSync, existsSync } from "fs";
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
  .option("--limit <n>", "Max results", { default: 10 })
  .action((query, options) => {
    const results = searchPrompts(query, { limit: options.limit });

    if (options.json) {
      output(
        results.map((r) => ({
          id: r.prompt.id,
          title: r.prompt.title,
          score: r.score,
          matchedFields: r.matchedFields,
        })),
        true
      );
    } else {
      for (const r of results) {
        console.log(`${r.prompt.id.padEnd(20)} ${r.score.toFixed(2).padStart(6)} ${r.prompt.title}`);
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
    } else if (options.json) {
      output(prompt, true);
    } else {
      console.log(`# ${prompt.title}\n`);
      console.log(`${prompt.description}\n`);
      console.log(`Category: ${prompt.category}`);
      console.log(`Tags: ${prompt.tags.join(", ")}`);
      console.log(`Author: ${prompt.author}\n`);
      console.log("---\n");
      console.log(prompt.content);
    }
  });

// Export command
cli
  .command("export <id>", "Export a prompt")
  .option("--format <format>", "Format: skill or md", { default: "skill" })
  .action((id, options) => {
    const prompt = getPrompt(id);

    if (!prompt) {
      console.error(`Prompt not found: ${id}`);
      process.exit(1);
    }

    if (options.format === "skill") {
      console.log(generateSkillMd(prompt));
    } else {
      console.log(generatePromptMarkdown(prompt));
    }
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
