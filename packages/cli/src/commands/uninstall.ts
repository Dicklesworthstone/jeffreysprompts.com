import { existsSync, rmSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";
import chalk from "chalk";
import {
  readManifest,
  writeManifest,
  removeManifestEntry,
  findManifestEntry,
} from "../lib/manifest";
import { isSafeSkillId, resolveSafeChildPath } from "../lib/utils";

interface UninstallOptions {
  project?: boolean;
  json?: boolean;
  confirm?: boolean;
}

export function uninstallCommand(ids: string[], options: UninstallOptions) {
  const targetRoot = options.project
    ? resolve(process.cwd(), ".claude/skills")
    : join(homedir(), ".config/claude/skills");

  if (ids.length === 0) {
    console.error(chalk.red("Error: No skill IDs specified"));
    process.exit(1);
  }

  for (const id of ids) {
    if (!isSafeSkillId(id)) {
      console.error(
        chalk.red(`Error: Invalid skill ID "${id}". Use kebab-case (a-z, 0-9, -).`)
      );
      process.exit(2);
    }
  }

  // In non-interactive mode, require --confirm
  const isTTY = process.stdout.isTTY;
  if (!isTTY && !options.confirm) {
    console.error(
      chalk.red("Error: Non-interactive mode requires --confirm flag")
    );
    process.exit(1);
  }

  // Load existing manifest
  let manifest = readManifest(targetRoot);

  const removed: string[] = [];
  const notFound: string[] = [];
  const failed: string[] = [];

  for (const id of ids) {
    let skillDir: string;
    try {
      skillDir = resolveSafeChildPath(targetRoot, id);
    } catch (error) {
      console.error(chalk.red((error as Error).message));
      failed.push(id);
      continue;
    }

    // Check if skill exists in manifest or on disk
    const manifestEntry = manifest ? findManifestEntry(manifest, id) : null;
    const dirExists = existsSync(skillDir);

    if (!manifestEntry && !dirExists) {
      if (!options.json) {
        console.warn(chalk.yellow("Warning: Skill '" + id + "' not found. Skipping."));
      }
      notFound.push(id);
      continue;
    }

    try {
      // Remove the skill directory
      if (dirExists) {
        rmSync(skillDir, { recursive: true, force: true });
      }

      // Remove from manifest
      if (manifest && manifestEntry) {
        manifest = removeManifestEntry(manifest, id);
      }

      removed.push(id);

      if (!options.json) {
        console.log(chalk.green("✓") + " Uninstalled " + chalk.bold(id));
      }
    } catch (err) {
      console.error(chalk.red("Failed to uninstall '" + id + "': " + (err as Error).message));
      failed.push(id);
    }
  }

  // Write updated manifest
  if (manifest && removed.length > 0) {
    writeManifest(targetRoot, manifest);
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          success: failed.length === 0,
          removed,
          notFound,
          failed,
          targetDir: targetRoot,
        },
        null,
        2
      )
    );
  } else {
    console.log();
    if (removed.length > 0) {
      console.log(chalk.green("Successfully uninstalled " + removed.length + " skill(s)."));
    }
    if (notFound.length > 0) {
      console.log(chalk.yellow(notFound.length + " skill(s) not found."));
    }
    if (failed.length > 0) {
      console.log(chalk.red("Failed to uninstall " + failed.length + " skill(s)."));
      process.exit(1);
    }
  }
}
