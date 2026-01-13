import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { getHomeDir } from "../lib/config";
import { generateSkillMd, computeSkillHash } from "@jeffreysprompts/core/export";
import chalk from "chalk";
import {
  readManifest,
  writeManifest,
  upsertManifestEntry,
  checkSkillModification,
  isJfpGenerated,
} from "../lib/manifest";
import type { SkillManifestEntry } from "@jeffreysprompts/core/export";
import { resolveSafeChildPath, shouldOutputJson } from "../lib/utils";
import { loadRegistry, type LoadedRegistry } from "../lib/registry-loader";

interface UpdateOptions {
  project?: boolean;
  personal?: boolean;
  dryRun?: boolean;
  diff?: boolean;
  force?: boolean;
  json?: boolean;
}

interface UpdateResult {
  id: string;
  action: "updated" | "skipped" | "unchanged" | "failed";
  reason?: string;
  oldVersion?: string;
  newVersion?: string;
  diff?: string;
}

function generateSimpleDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const diff: string[] = [];

  // Simple line-by-line diff
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined && newLine !== undefined) {
      diff.push(chalk.green("+ " + newLine));
    } else if (oldLine !== undefined && newLine === undefined) {
      diff.push(chalk.red("- " + oldLine));
    } else if (oldLine !== newLine) {
      diff.push(chalk.red("- " + oldLine));
      diff.push(chalk.green("+ " + newLine));
    }
  }

  if (diff.length === 0) {
    return "(no changes)";
  }

  return diff.slice(0, 50).join("\n") + (diff.length > 50 ? "\n... (truncated)" : "");
}

function updateLocation(
  targetRoot: string,
  options: UpdateOptions,
  registry: LoadedRegistry
): UpdateResult[] {
  const results: UpdateResult[] = [];
  const manifest = readManifest(targetRoot);

  if (!manifest || manifest.entries.length === 0) {
    return results;
  }

  let updatedManifest = manifest;
  let hasUpdates = false;

  for (const entry of manifest.entries) {
    // Find prompt in dynamic registry
    const prompt = registry.prompts.find(p => p.id === entry.id);

    if (!prompt) {
      // Prompt no longer exists in registry
      results.push({
        id: entry.id,
        action: "skipped",
        reason: "Prompt no longer in registry",
      });
      continue;
    }

    let skillDir: string;
    try {
      skillDir = resolveSafeChildPath(targetRoot, entry.id);
    } catch {
      results.push({
        id: entry.id,
        action: "skipped",
        reason: "Invalid skill ID in manifest",
      });
      continue;
    }
    const skillPath = join(skillDir, "SKILL.md");

    if (!existsSync(skillPath)) {
      results.push({
        id: entry.id,
        action: "skipped",
        reason: "SKILL.md not found on disk",
      });
      continue;
    }

    // Check if this is JFP-generated
    if (!isJfpGenerated(skillPath) && !options.force) {
      results.push({
        id: entry.id,
        action: "skipped",
        reason: "Not JFP-generated (use --force to update)",
      });
      continue;
    }

    // Check for user modifications
    const modCheck = checkSkillModification(targetRoot, entry.id, manifest);
    if (modCheck.wasModified && !options.force) {
      results.push({
        id: entry.id,
        action: "skipped",
        reason: "User modifications detected (use --force to overwrite)",
      });
      continue;
    }

    // Generate new content and compare
    const newContent = generateSkillMd(prompt);
    const newHash = computeSkillHash(newContent);

    if (newHash === entry.hash) {
      results.push({
        id: entry.id,
        action: "unchanged",
        oldVersion: entry.version,
        newVersion: prompt.version || "1.0.0",
      });
      continue;
    }

    // There are changes
    const oldContent = readFileSync(skillPath, "utf-8");

    if (options.dryRun) {
      const result: UpdateResult = {
        id: entry.id,
        action: "updated",
        oldVersion: entry.version,
        newVersion: prompt.version || "1.0.0",
        reason: "Would update (dry-run)",
      };

      if (options.diff) {
        result.diff = generateSimpleDiff(oldContent, newContent);
      }

      results.push(result);
    } else {
      // Actually update
      try {
        if (!existsSync(skillDir)) {
          mkdirSync(skillDir, { recursive: true });
        }
        writeFileSync(skillPath, newContent);

        const newEntry: SkillManifestEntry = {
          id: prompt.id,
          kind: "prompt",
          version: prompt.version || "1.0.0",
          hash: newHash,
          updatedAt: new Date().toISOString(),
        };
        updatedManifest = upsertManifestEntry(updatedManifest, newEntry);
        hasUpdates = true;

        results.push({
          id: entry.id,
          action: "updated",
          oldVersion: entry.version,
          newVersion: prompt.version || "1.0.0",
        });
      } catch (err) {
        results.push({
          id: entry.id,
          action: "failed",
          reason: (err as Error).message,
        });
      }
    }
  }

  // Write updated manifest if there were changes
  if (hasUpdates && !options.dryRun) {
    writeManifest(targetRoot, updatedManifest);
  }

  return results;
}

export async function updateCommand(options: UpdateOptions) {
  const personalDir = join(getHomeDir(), ".config/claude/skills");
  const projectDir = resolve(process.cwd(), ".claude/skills");

  // Load registry dynamically
  const registry = await loadRegistry();

  // Determine which locations to update
  const updatePersonal = options.personal || (!options.project && !options.personal);
  const updateProject = options.project || (!options.project && !options.personal);

  const allResults: Array<UpdateResult & { location: "personal" | "project" }> = [];

  if (updatePersonal) {
    const results = updateLocation(personalDir, options, registry);
    allResults.push(...results.map((r) => ({ ...r, location: "personal" as const })));
  }

  if (updateProject) {
    const results = updateLocation(projectDir, options, registry);
    allResults.push(...results.map((r) => ({ ...r, location: "project" as const })));
  }

  const updated = allResults.filter((r) => r.action === "updated");
  const skipped = allResults.filter((r) => r.action === "skipped");
  const unchanged = allResults.filter((r) => r.action === "unchanged");
  const failed = allResults.filter((r) => r.action === "failed");

  if (shouldOutputJson(options)) {
    console.log(
      JSON.stringify(
        {
          success: failed.length === 0,
          dryRun: options.dryRun || false,
          updated: updated.map((r) => ({
            id: r.id,
            location: r.location,
            oldVersion: r.oldVersion,
            newVersion: r.newVersion,
            ...(r.diff ? { diff: r.diff } : {}),
          })),
          skipped: skipped.map((r) => ({
            id: r.id,
            location: r.location,
            reason: r.reason,
          })),
          unchanged: unchanged.map((r) => ({
            id: r.id,
            location: r.location,
          })),
          failed: failed.map((r) => ({
            id: r.id,
            location: r.location,
            reason: r.reason,
          })),
          locations: {
            personal: updatePersonal ? personalDir : null,
            project: updateProject ? projectDir : null,
          },
        },
        null,
        2
      )
    );
    return;
  }

  // Human-readable output
  if (allResults.length === 0) {
    console.log(chalk.dim("No installed skills found."));
    console.log(chalk.dim("\nInstall skills with: " + chalk.cyan("jfp install <id>")));
    return;
  }

  const prefix = options.dryRun ? chalk.blue("[dry-run] ") : "";

  // Report updates
  for (const result of updated) {
    const location = result.location === "personal" ? chalk.blue("personal") : chalk.green("project");
    console.log(
      prefix +
        chalk.green("✓") +
        " " +
        chalk.bold(result.id) +
        " " +
        chalk.dim(result.oldVersion + " → " + result.newVersion) +
        " [" + location + "]"
    );

    if (options.diff && result.diff) {
      console.log(result.diff);
      console.log();
    }
  }

  // Report skipped
  for (const result of skipped) {
    const location = result.location === "personal" ? chalk.blue("personal") : chalk.green("project");
    console.log(
      chalk.yellow("⚠") +
        " " +
        chalk.bold(result.id) +
        " " +
        chalk.dim(result.reason || "") +
        " [" + location + "]"
    );
  }

  // Report unchanged
  if (!options.dryRun && unchanged.length > 0 && (updated.length > 0 || skipped.length > 0)) {
    console.log(chalk.dim("\n" + unchanged.length + " skill(s) already up to date."));
  }

  // Report failed
  for (const result of failed) {
    console.log(chalk.red("✗") + " " + chalk.bold(result.id) + ": " + result.reason);
  }

  // Summary
  console.log();
  if (updated.length > 0) {
    const verb = options.dryRun ? "would be updated" : "updated";
    console.log(chalk.green(updated.length + " skill(s) " + verb + "."));
  }
  if (skipped.length > 0) {
    console.log(chalk.yellow(skipped.length + " skill(s) skipped."));
  }
  if (unchanged.length > 0 && updated.length === 0 && skipped.length === 0) {
    console.log(chalk.dim("All skills are up to date."));
  }

  if (!options.dryRun && updated.length > 0) {
    console.log(chalk.dim("Restart Claude Code or run /refresh to see updated skills."));
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}
