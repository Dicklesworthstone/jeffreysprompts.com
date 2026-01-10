import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";
import { getPrompt, prompts } from "@jeffreysprompts/core/prompts";
import { generateSkillMd, computeSkillHash } from "@jeffreysprompts/core/export";
import chalk from "chalk";
import {
  readManifest,
  writeManifest,
  createEmptyManifest,
  upsertManifestEntry,
  checkSkillModification,
} from "../lib/manifest";
import type { SkillManifestEntry } from "@jeffreysprompts/core/export";
import { shouldOutputJson } from "../lib/utils";

interface InstallOptions {
  project?: boolean;
  all?: boolean;
  json?: boolean;
  force?: boolean;
}

export function installCommand(ids: string[], options: InstallOptions) {
  const targetRoot = options.project
    ? resolve(process.cwd(), ".claude/skills")
    : join(homedir(), ".config/claude/skills");

  if (options.all) {
    // Install all prompts
    ids = prompts.map((p) => p.id);
  }

  if (ids.length === 0) {
    console.error(chalk.red("Error: No prompts specified. Use <id> or --all"));
    process.exit(1);
  }

  // Load existing manifest or create a new one
  let manifest = readManifest(targetRoot) ?? createEmptyManifest();

  const installed: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const id of ids) {
    const prompt = getPrompt(id);
    if (!prompt) {
      console.warn(chalk.yellow(`Warning: Prompt '${id}' not found. Skipping.`));
      failed.push(id);
      continue;
    }

    // Check if this skill has been modified by the user
    const modCheck = checkSkillModification(targetRoot, prompt.id, manifest);

    if (!modCheck.canOverwrite && !options.force) {
      // User has modified this skill - skip unless --force is used
      if (!shouldOutputJson(options)) {
        console.log(
          `${chalk.yellow("⚠")} Skipping ${chalk.bold(prompt.id)} - user modifications detected. Use ${chalk.cyan("--force")} to overwrite.`
        );
      }
      skipped.push(id);
      continue;
    }

    try {
      const skillContent = generateSkillMd(prompt);
      const skillDir = join(targetRoot, prompt.id);
      const skillPath = join(skillDir, "SKILL.md");

      if (!existsSync(skillDir)) {
        mkdirSync(skillDir, { recursive: true });
      }

      writeFileSync(skillPath, skillContent);

      // Update manifest with the new entry
      const hash = computeSkillHash(skillContent);
      const entry: SkillManifestEntry = {
        id: prompt.id,
        kind: "prompt",
        version: prompt.version ?? "1.0.0",
        hash,
        updatedAt: new Date().toISOString(),
      };
      manifest = upsertManifestEntry(manifest, entry);

      installed.push(id);

      if (!shouldOutputJson(options)) {
        console.log(
          `${chalk.green("✓")} Installed ${chalk.bold(prompt.id)} to ${chalk.dim(skillPath)}`
        );
      }
    } catch (err) {
      console.error(chalk.red(`Failed to install '${id}': ${(err as Error).message}`));
      failed.push(id);
    }
  }

  // Write updated manifest
  if (installed.length > 0) {
    writeManifest(targetRoot, manifest);
  }

  if (shouldOutputJson(options)) {
    console.log(
      JSON.stringify(
        {
          success: failed.length === 0,
          installed,
          skipped,
          failed,
          targetDir: targetRoot,
        },
        null,
        2
      )
    );
  } else {
    console.log();
    if (installed.length > 0) {
      console.log(chalk.green(`Successfully installed ${installed.length} skill(s).`));
      console.log(chalk.dim("Restart Claude Code or run /refresh to see new skills."));
    }
    if (skipped.length > 0) {
      console.log(chalk.yellow(`Skipped ${skipped.length} skill(s) with user modifications.`));
    }
    if (failed.length > 0) {
      console.log(chalk.yellow(`Failed to install ${failed.length} skill(s).`));
      process.exit(1);
    }
  }
}