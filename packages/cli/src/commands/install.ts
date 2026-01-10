import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";
import { getPrompt, prompts } from "@jeffreysprompts/core/prompts";
import { getBundle, generateBundleSkillMd } from "@jeffreysprompts/core/prompts/bundles";
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
import { isSafeSkillId, resolveSafeChildPath, shouldOutputJson } from "../lib/utils";

interface InstallOptions {
  project?: boolean;
  all?: boolean;
  bundle?: string;
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

  // Handle bundle installation
  if (options.bundle) {
    const bundle = getBundle(options.bundle);
    if (!bundle) {
      if (shouldOutputJson(options)) {
        console.log(JSON.stringify({ error: "bundle_not_found", id: options.bundle }));
      } else {
        console.error(chalk.red("Bundle not found: " + options.bundle));
      }
      process.exit(1);
    }

    if (!isSafeSkillId(bundle.id)) {
      console.error(chalk.red("Error: Unsafe bundle id. Refusing to write files."));
      process.exit(1);
    }

    try {
      const skillContent = generateBundleSkillMd(bundle);
      const skillDir = resolveSafeChildPath(targetRoot, bundle.id);
      const skillPath = join(skillDir, "SKILL.md");

      if (!existsSync(skillDir)) {
        mkdirSync(skillDir, { recursive: true });
      }

      writeFileSync(skillPath, skillContent);

      // Update manifest
      let manifest = readManifest(targetRoot) ?? createEmptyManifest();
      const hash = computeSkillHash(skillContent);
      const entry: SkillManifestEntry = {
        id: bundle.id,
        kind: "bundle",
        version: bundle.version,
        hash,
        updatedAt: new Date().toISOString(),
      };
      manifest = upsertManifestEntry(manifest, entry);
      writeManifest(targetRoot, manifest);

      if (shouldOutputJson(options)) {
        console.log(JSON.stringify({
          success: true,
          installed: [bundle.id],
          type: "bundle",
          prompts: bundle.promptIds,
          targetDir: targetRoot,
        }, null, 2));
      } else {
        console.log(chalk.green("✓") + " Installed bundle " + chalk.bold(bundle.title) + " to " + chalk.dim(skillPath));
        console.log(chalk.dim("  Contains " + bundle.promptIds.length + " prompts: " + bundle.promptIds.join(", ")));
        console.log();
        console.log(chalk.dim("Restart Claude Code or run /refresh to see new skills."));
      }
    } catch (err) {
      if (shouldOutputJson(options)) {
        console.log(JSON.stringify({ error: "install_failed", message: (err as Error).message }));
      } else {
        console.error(chalk.red("Failed to install bundle: " + (err as Error).message));
      }
      process.exit(1);
    }
    return;
  }

  if (ids.length === 0) {
    console.error(chalk.red("Error: No prompts specified. Use <id>, --all, or --bundle <id>"));
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
    if (!isSafeSkillId(prompt.id)) {
      console.error(
        chalk.red(`Error: Unsafe prompt id "${prompt.id}". Refusing to write files.`)
      );
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
      const skillDir = resolveSafeChildPath(targetRoot, prompt.id);
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
    try {
      writeManifest(targetRoot, manifest);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (shouldOutputJson(options)) {
        console.log(JSON.stringify({
          success: false,
          installed,
          skipped,
          failed,
          error: `Failed to write manifest: ${message}`,
          targetDir: targetRoot,
        }, null, 2));
      } else {
        console.error(chalk.red(`Failed to write manifest: ${message}`));
        console.log(chalk.yellow("Skills were installed but manifest may be out of sync."));
      }
      process.exit(1);
    }
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
    if (failed.length > 0) {
      process.exit(1);
    }
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
