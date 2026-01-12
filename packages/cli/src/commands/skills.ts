/**
 * Skills Commands
 *
 * CLI commands for the Skills marketplace (premium feature)
 * - jfp skills list: List skills from premium marketplace
 * - jfp skills install <id>: Install a skill from marketplace
 * - jfp skills export <id>: Export a skill as SKILL.md
 * - jfp skills create: Scaffold a new SKILL.md template
 */

import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import Table from "cli-table3";
import boxen from "boxen";
import chalk from "chalk";
import { apiClient, isAuthError, requiresPremium } from "../lib/api-client";
import { isLoggedIn, loadCredentials } from "../lib/credentials";
import { shouldOutputJson, isSafeSkillId } from "../lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface Skill {
  id: string;
  name: string;
  description: string;
  tool?: string;
  category?: string;
  author?: string;
  version?: string;
  downloads?: number;
  rating?: number;
  created_at?: string;
  updated_at?: string;
  is_mine?: boolean;
  is_installed?: boolean;
}

export interface SkillDetail extends Skill {
  content: string;
  when_to_use?: string[];
  tips?: string[];
  examples?: string[];
}

export interface SkillsListResponse {
  skills: Skill[];
  total: number;
  page?: number;
  limit?: number;
}

export interface SkillInstallResponse {
  installed: boolean;
  skill_id: string;
  skill_name: string;
  installed_at: string;
}

export interface SkillExportResponse {
  skill_id: string;
  skill_name: string;
  content: string;
  format: string;
}

// ============================================================================
// Options Types
// ============================================================================

export interface SkillsListOptions {
  tool?: string;
  category?: string;
  mine?: boolean;
  search?: string;
  limit?: number;
  json?: boolean;
}

export interface SkillsInstallOptions {
  json?: boolean;
  force?: boolean;
}

export interface SkillsExportOptions {
  json?: boolean;
  stdout?: boolean;
  output?: string;
}

export interface SkillsCreateOptions {
  name?: string;
  description?: string;
  tool?: string;
  output?: string;
  json?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

/**
 * Check if user is logged in and show appropriate message if not
 */
async function requireAuth(options: { json?: boolean }): Promise<boolean> {
  const loggedIn = await isLoggedIn();

  if (!loggedIn) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "You must be logged in to access skills", {
        hint: "Run 'jfp login' to sign in",
      });
    } else {
      console.log(chalk.yellow("You must be logged in to access skills"));
      console.log(chalk.dim("Run 'jfp login' to sign in to JeffreysPrompts Premium"));
    }
    process.exit(1);
  }

  return true;
}

/**
 * Check if user has premium tier
 */
async function requirePremiumTier(options: { json?: boolean }): Promise<boolean> {
  const creds = await loadCredentials();

  if (creds?.tier !== "premium") {
    if (shouldOutputJson(options)) {
      writeJsonError("premium_required", "Skills marketplace requires a premium subscription", {
        hint: "Visit jeffreysprompts.com/premium to upgrade",
      });
    } else {
      console.log(chalk.yellow("Skills marketplace requires a premium subscription"));
      console.log(chalk.dim("Visit jeffreysprompts.com/premium to upgrade"));
    }
    process.exit(1);
  }

  return true;
}

/**
 * Handle common API errors
 */
function handleApiError(
  response: { ok: boolean; status: number; error?: string },
  options: { json?: boolean },
  context: string
): never {
  if (isAuthError(response)) {
    if (shouldOutputJson(options)) {
      writeJsonError("auth_expired", "Session expired. Please run 'jfp login' again.");
    } else {
      console.log(chalk.yellow("Session expired. Please run 'jfp login' again."));
    }
    process.exit(1);
  }

  if (requiresPremium(response)) {
    if (shouldOutputJson(options)) {
      writeJsonError("premium_required", `${context} requires a premium subscription`);
    } else {
      console.log(chalk.yellow(`${context} requires a premium subscription`));
    }
    process.exit(1);
  }

  if (shouldOutputJson(options)) {
    writeJsonError("api_error", response.error || `Failed to ${context.toLowerCase()}`);
  } else {
    console.log(chalk.red(`Failed to ${context.toLowerCase()}: ${response.error || "Unknown error"}`));
  }
  process.exit(1);
}

// ============================================================================
// Commands
// ============================================================================

/**
 * List skills from the marketplace
 */
export async function skillsListCommand(options: SkillsListOptions): Promise<void> {
  await requireAuth(options);
  await requirePremiumTier(options);

  // Build query params
  const params = new URLSearchParams();
  if (options.tool) params.set("tool", options.tool);
  if (options.category) params.set("category", options.category);
  if (options.mine) params.set("mine", "true");
  if (options.search) params.set("search", options.search);
  if (options.limit) params.set("limit", options.limit.toString());

  const queryString = params.toString();
  const endpoint = `/cli/skills${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient.get<SkillsListResponse>(endpoint);

  if (!response.ok) {
    handleApiError(response, options, "Fetching skills");
  }

  const data = response.data!;
  const skills = data.skills || [];

  if (shouldOutputJson(options)) {
    writeJson({
      skills,
      total: data.total || skills.length,
      filters: {
        tool: options.tool || null,
        category: options.category || null,
        mine: options.mine || false,
        search: options.search || null,
      },
    });
    return;
  }

  if (skills.length === 0) {
    console.log(chalk.dim("No skills found matching your criteria."));
    if (options.search) {
      console.log(chalk.dim(`Try a different search term or remove filters.`));
    }
    return;
  }

  const table = new Table({
    head: ["Name", "Tool", "Category", "Downloads", "Rating"],
    style: { head: ["cyan"] },
  });

  for (const skill of skills) {
    const ratingStr = typeof skill.rating === "number" ? `${skill.rating.toFixed(1)}/5` : "-";
    const downloadsStr = skill.downloads?.toLocaleString() || "0";

    table.push([
      chalk.bold(skill.name),
      chalk.dim(skill.tool || "-"),
      skill.category || "-",
      chalk.yellow(downloadsStr),
      chalk.green(ratingStr),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`\nFound ${skills.length} skill(s). Use "jfp skills install <id>" to install.`));
}

/**
 * Install a skill from the marketplace
 */
export async function skillsInstallCommand(
  skillId: string,
  options: SkillsInstallOptions
): Promise<void> {
  if (!skillId?.trim()) {
    if (shouldOutputJson(options)) {
      writeJsonError("missing_argument", "Skill ID is required");
    } else {
      console.log(chalk.red("Skill ID is required"));
      console.log(chalk.dim("Usage: jfp skills install <id>"));
    }
    process.exit(1);
  }

  await requireAuth(options);
  await requirePremiumTier(options);

  // Record the installation on the server
  const response = await apiClient.post<SkillInstallResponse>(
    `/cli/skills/${encodeURIComponent(skillId)}/install`
  );

  if (!response.ok) {
    if (response.status === 404) {
      if (shouldOutputJson(options)) {
        writeJsonError("not_found", `Skill not found: ${skillId}`);
      } else {
        console.log(chalk.red(`Skill not found: ${skillId}`));
        console.log(chalk.dim("Use 'jfp skills list' to browse available skills"));
      }
      process.exit(1);
    }

    if (response.status === 409) {
      // Already installed
      if (shouldOutputJson(options)) {
        writeJson({
          installed: true,
          already_installed: true,
          skill_id: skillId,
          message: `Skill "${skillId}" is already installed`,
        });
      } else {
        console.log(chalk.yellow(`Skill "${skillId}" is already installed`));
      }
      return;
    }

    handleApiError(response, options, "Installing skill");
  }

  const data = response.data!;

  if (shouldOutputJson(options)) {
    writeJson({
      installed: true,
      skill_id: data.skill_id || skillId,
      skill_name: data.skill_name || skillId,
      installed_at: data.installed_at || new Date().toISOString(),
    });
  } else {
    console.log(chalk.green(`Installed skill: ${data.skill_name || skillId}`));
    console.log(chalk.dim(`Use 'jfp skills export ${skillId}' to download the SKILL.md file`));
  }
}

/**
 * Export a skill as SKILL.md
 */
export async function skillsExportCommand(
  skillId: string,
  options: SkillsExportOptions
): Promise<void> {
  if (!skillId?.trim()) {
    if (shouldOutputJson(options)) {
      writeJsonError("missing_argument", "Skill ID is required");
    } else {
      console.log(chalk.red("Skill ID is required"));
      console.log(chalk.dim("Usage: jfp skills export <id>"));
    }
    process.exit(1);
  }

  await requireAuth(options);
  await requirePremiumTier(options);

  const response = await apiClient.get<SkillExportResponse>(
    `/cli/skills/${encodeURIComponent(skillId)}/export`
  );

  if (!response.ok) {
    if (response.status === 404) {
      if (shouldOutputJson(options)) {
        writeJsonError("not_found", `Skill not found: ${skillId}`);
      } else {
        console.log(chalk.red(`Skill not found: ${skillId}`));
      }
      process.exit(1);
    }

    handleApiError(response, options, "Exporting skill");
  }

  const data = response.data!;
  const content = data.content;

  // Output to stdout
  if (options.stdout) {
    console.log(content);
    return;
  }

  // Validate skill ID for filename safety
  if (!isSafeSkillId(skillId)) {
    if (shouldOutputJson(options)) {
      writeJsonError("invalid_id", `Skill ID "${skillId}" contains unsafe characters for filenames`);
    } else {
      console.log(chalk.red(`Skill ID "${skillId}" contains unsafe characters for filenames`));
    }
    process.exit(1);
  }

  // Determine output path
  const outputPath = options.output || `${skillId}-SKILL.md`;

  try {
    writeFileSync(outputPath, content);

    if (shouldOutputJson(options)) {
      writeJson({
        exported: true,
        skill_id: data.skill_id || skillId,
        skill_name: data.skill_name || skillId,
        file: outputPath,
      });
    } else {
      console.log(chalk.green(`Exported skill to: ${outputPath}`));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (shouldOutputJson(options)) {
      writeJsonError("write_failed", `Failed to write file: ${message}`);
    } else {
      console.log(chalk.red(`Failed to write file: ${message}`));
    }
    process.exit(1);
  }
}

/**
 * Create a new skill template
 */
export async function skillsCreateCommand(options: SkillsCreateOptions): Promise<void> {
  const name = options.name || "my-skill";
  const description = options.description || "A custom skill for Claude Code";
  const tool = options.tool || "claude-code";

  // Sanitize name: lowercase, replace invalid chars with dash, collapse multiple dashes, trim dashes
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "skill";

  // Escape description for YAML (double-quote and escape internal quotes/newlines)
  const safeDescription = description
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");

  const template = `---
name: ${safeName}
description: "${safeDescription}"
version: 1.0.0
author: Your Name
tool: ${tool}
category: custom
tags: []
---

# ${name}

${description}

## Instructions

[Your skill instructions go here. Describe what this skill does and how Claude should use it.]

## When to Use

- [Describe when this skill should be activated]
- [Add more scenarios as needed]

## Examples

- Example 1: [Describe a use case]
- Example 2: [Describe another use case]

## Tips

- [Helpful tips for using this skill effectively]

---

*Created with JeffreysPrompts CLI*
`;

  // Output to stdout if --stdout is set (json mode can still use --output)
  if (!options.output && shouldOutputJson(options)) {
    writeJson({
      created: true,
      name: safeName,
      description,
      tool,
      content: template,
    });
    return;
  }

  // Determine output path
  const outputDir = options.output || join(process.cwd(), ".claude", "skills", safeName);
  const skillPath = join(outputDir, "SKILL.md");

  // Check if already exists
  if (existsSync(skillPath)) {
    if (shouldOutputJson(options)) {
      writeJsonError("already_exists", `Skill already exists at: ${skillPath}`, {
        hint: "Use --output to specify a different location",
      });
    } else {
      console.log(chalk.yellow(`Skill already exists at: ${skillPath}`));
      console.log(chalk.dim("Use --output to specify a different location"));
    }
    process.exit(1);
  }

  try {
    // Create directory if needed
    mkdirSync(outputDir, { recursive: true });

    // Write the skill file
    writeFileSync(skillPath, template);

    if (shouldOutputJson(options)) {
      writeJson({
        created: true,
        name: safeName,
        path: skillPath,
        directory: outputDir,
      });
    } else {
      console.log(
        boxen(
          chalk.green("Skill template created!") +
            "\n\n" +
            chalk.bold("Location: ") +
            skillPath +
            "\n\n" +
            chalk.dim("Next steps:") +
            "\n" +
            chalk.dim("1. Edit the SKILL.md file with your instructions") +
            "\n" +
            chalk.dim("2. Claude Code will automatically load it from .claude/skills/"),
          {
            padding: 1,
            borderStyle: "round",
            borderColor: "green",
          }
        )
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (shouldOutputJson(options)) {
      writeJsonError("create_failed", `Failed to create skill: ${message}`);
    } else {
      console.log(chalk.red(`Failed to create skill: ${message}`));
    }
    process.exit(1);
  }
}
