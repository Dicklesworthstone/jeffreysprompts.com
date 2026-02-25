import Table from "cli-table3";
import boxen from "boxen";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";

interface BundlesListOptions {
  json?: boolean;
}

interface BundleShowOptions {
  json?: boolean;
}

/**
 * List all available bundles
 */
export async function bundlesCommand(options: BundlesListOptions) {
  const registry = await loadRegistry();
  const bundles = registry.bundles;

  if (shouldOutputJson(options)) {
    const output = bundles.map((bundle) => ({
      id: bundle.id,
      title: bundle.title,
      description: bundle.description,
      version: bundle.version,
      promptCount: bundle.promptIds.length,
      featured: bundle.featured || false,
      author: bundle.author,
    }));
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  const table = new Table({
    head: ["ID", "Title", "Prompts", "Featured"],
    style: { head: ["cyan"] },
  });

  for (const bundle of bundles) {
    table.push([
      bundle.id,
      bundle.title,
      chalk.yellow(bundle.promptIds.length.toString()),
      bundle.featured ? chalk.green("★") : chalk.dim("—"),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim("\nFound " + bundles.length + " bundles. Use \"jfp bundle <id>\" for details."));
}

/**
 * Show detailed information about a bundle
 */
export async function bundleShowCommand(id: string, options: BundleShowOptions) {
  const registry = await loadRegistry();
  const bundle = registry.bundles.find((b) => b.id === id);

  if (!bundle) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({ error: "not_found", message: `Bundle not found: ${id}` }));
    } else {
      console.error(chalk.red("Bundle not found: " + id));
      console.log(chalk.dim("\nAvailable bundles:"));
      for (const b of registry.bundles) {
        console.log(chalk.dim("  - " + b.id));
      }
    }
    process.exit(1);
  }

  // We need to resolve prompt objects from IDs
  // Since getBundlePrompts relies on the global 'getPrompt', we must map manually or inject dependencies
  // But getBundlePrompts imports 'getPrompt' which uses static registry.
  // We must implement lookup against our dynamic registry.prompts list.
  
  const promptsMap = new Map(registry.prompts.map(p => [p.id, p]));
  const prompts = bundle.promptIds
    .map(id => promptsMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  if (shouldOutputJson(options)) {
    console.log(JSON.stringify({
      ...bundle,
      prompts: prompts.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
      })),
    }, null, 2));
    return;
  }

  // Build formatted output
  let content = chalk.bold.cyan(bundle.title) + " " + chalk.dim("v" + bundle.version) + "\n";
  content += chalk.dim(bundle.description) + "\n\n";

  content += chalk.green("Author:") + " " + bundle.author + "\n";
  content += chalk.green("Updated:") + " " + bundle.updatedAt + "\n";
  if (bundle.featured) {
    content += chalk.green("Featured:") + " " + chalk.yellow("★ Yes") + "\n";
  }

  content += "\n" + chalk.dim("─".repeat(50)) + "\n\n";

  // Included prompts
  content += chalk.bold("Included Prompts") + " (" + prompts.length + ")\n\n";
  for (const prompt of prompts) {
    content += "  " + chalk.cyan("•") + " " + chalk.bold(prompt.title) + "\n";
    content += "    " + chalk.dim(prompt.description) + "\n";
    content += "    " + chalk.dim("Category: " + prompt.category + " | Tags: " + prompt.tags.slice(0, 3).join(", ")) + "\n\n";
  }

  // Workflow if present
  if (bundle.workflow) {
    content += chalk.dim("─".repeat(50)) + "\n\n";
    content += chalk.bold("Workflow") + "\n\n";
    content += bundle.workflow + "\n";
  }

  // When to use if present
  if (bundle.whenToUse && bundle.whenToUse.length > 0) {
    content += "\n" + chalk.bold("When to Use") + "\n\n";
    for (const use of bundle.whenToUse) {
      content += "  " + chalk.green("→") + " " + use + "\n";
    }
  }

  console.log(
    boxen(content, {
      padding: 1,
      borderStyle: "round",
      borderColor: "cyan",
    })
  );

  console.log(chalk.dim("\nExport prompts with: jfp export <prompt-id>"));
}
