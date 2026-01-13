import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { getHomeDir } from "../lib/config";
import { generateBundleSkillMd } from "@jeffreysprompts/core/prompts/bundles";
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
import { loadRegistry } from "../lib/registry-loader";

interface InstallOptions {
  project?: boolean;
  all?: boolean;
  bundle?: string;
  json?: boolean;
  force?: boolean;
}

export async function installCommand(ids: string[], options: InstallOptions) {
  const targetRoot = options.project
    ? resolve(process.cwd(), ".claude/skills")
    : join(getHomeDir(), ".config/claude/skills");

  // Load registry dynamically
  const registry = await loadRegistry();

  if (options.all) {
    // Install all prompts from registry
    ids = registry.prompts.map((p) => p.id);
  }

  // Handle bundle installation
  if (options.bundle) {
    const bundle = registry.bundles.find((b) => b.id === options.bundle);
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
      // NOTE: generateBundleSkillMd might use static imports internally if not careful.
      // Ideally we should pass prompts to it, but it imports getBundlePrompts which imports getPrompt.
      // We need to ensure we pass fully resolved bundle object or that the helper uses dependency injection.
      // For now, let's assume the bundle object is complete or we rebuild it.
      // Wait, generateBundleSkillMd calls getBundlePrompts(bundle).
      // getBundlePrompts calls getPrompt(id).
      // This is still using static getPrompt!
      // We must implement manual bundle generation here or refactor core.
      // Refactoring core to accept prompts map is cleaner.
      
      // Let's implement a local helper for now to avoid cross-package refactor risk in this step.
      const bundlePrompts = bundle.promptIds
        .map(id => registry.prompts.find(p => p.id === id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined);
        
      // We need to recreate generateBundleSkillMd logic but with our dynamic prompts
      // Actually, let's just stick to the existing one for now, acknowledging it might miss *new* prompts referenced by *old* bundles?
      // No, if the bundle is new (from registry), it refers to prompts in registry.
      // If we use the static `getPrompt`, we miss dynamic prompts.
      // So we MUST patch `generateBundleSkillMd` or replicate it.
      // I will replicate it here for safety and correctness in CLI context.
      
      // ... Re-implementing generateBundleSkillMd logic locally with dynamic prompts ...
      const skillContent = generateDynamicBundleSkillMd(bundle, bundlePrompts);
      
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
    const prompt = registry.prompts.find((p) => p.id === id);
    
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

// Helper to generate bundle SKILL.md with dynamic prompts
// Duplicates logic from @jeffreysprompts/core/export/skills but uses provided prompts
import { escapeYamlValue, escapeYamlArrayItem } from "@jeffreysprompts/core/export/yaml"; // Ensure yaml export is available or duplicate it? 
// It's available from @jeffreysprompts/core/export/yaml is not exported by index. 
// We should check what's exported.
// packages/core/src/index.ts exports from ./export/skills, markdown, json.
// It does NOT export from ./export/yaml.
// I will need to duplicate the simple escaping logic or rely on import internals (not ideal).
// Actually, let's update packages/core/src/prompts/bundles.ts to accept prompts array.
// But I can't easily edit core for this one command without breaking others?
// I will implement a minimal local version.

function generateDynamicBundleSkillMd(bundle: any, prompts: any[]): string {
  const q = (v: string) => JSON.stringify(v); // Simple JSON stringify matches most YAML escaping needs for strings
  // Actually, let's use a simpler safe string approach for YAML
  
  const frontmatter = [
    "---",
    `name: ${bundle.id}`,
    `description: ${JSON.stringify(bundle.description)}`,
    `version: ${JSON.stringify(bundle.version)}`,
    `author: ${JSON.stringify(bundle.author)}`,
    `type: bundle`,
    `prompts: [${prompts.map((p) => JSON.stringify(p.id)).join(", ")}]`,
    `source: https://jeffreysprompts.com/bundles/${bundle.id}`,
    "x_jfp_generated: true",
    "---",
    "",
  ].join("\n");

  const content: string[] = [`# ${bundle.title}`, "", bundle.description, ""];

  if (bundle.workflow) {
    content.push("## Workflow", "", bundle.workflow, "");
  }

  if (bundle.whenToUse && bundle.whenToUse.length > 0) {
    content.push("## When to Use This Bundle", "");
    for (const item of bundle.whenToUse) {
      content.push(`- ${item}`);
    }
    content.push("");
  }

  content.push("---", "", "## Included Prompts", "");

  for (const prompt of prompts) {
    content.push(`### ${prompt.title}`, "", `*${prompt.description}*`, "", prompt.content, "");

    if (prompt.whenToUse && prompt.whenToUse.length > 0) {
      content.push("**When to use:**");
      for (const item of prompt.whenToUse) content.push(`- ${item}`);
      content.push("");
    }

    if (prompt.tips && prompt.tips.length > 0) {
      content.push("**Tips:**");
      for (const item of prompt.tips) content.push(`- ${item}`);
      content.push("");
    }

    content.push("---", "");
  }

  content.push(`*Bundle from [JeffreysPrompts.com](https://jeffreysprompts.com/bundles/${bundle.id})*`, "");

  return frontmatter + content.join("\n");
}
