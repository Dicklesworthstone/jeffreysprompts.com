/**
 * Collections Command
 *
 * Manage user collections (premium feature)
 * - jfp collections: List all user collections
 * - jfp collections <name>: Show prompts in a collection
 * - jfp collections <name> --add <prompt-id>: Add prompt to collection
 */

import Table from "cli-table3";
import boxen from "boxen";
import chalk from "chalk";
import { apiClient, requiresPremium, isAuthError } from "../lib/api-client";
import { isLoggedIn, loadCredentials } from "../lib/credentials";
import { shouldOutputJson } from "../lib/utils";
import { getPrompt } from "@jeffreysprompts/core/prompts";

export interface CollectionItem {
  id: string;
  name: string;
  description?: string;
  promptCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionDetail extends CollectionItem {
  prompts: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
  }>;
}

interface CollectionsListOptions {
  json?: boolean;
}

interface CollectionShowOptions {
  json?: boolean;
  add?: string; // Prompt ID to add to collection
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

/**
 * Check if user is logged in and show appropriate message if not
 * Returns false if not logged in (and command should exit)
 */
async function requireAuth(options: { json?: boolean }): Promise<boolean> {
  const loggedIn = await isLoggedIn();

  if (!loggedIn) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "You must be logged in to use collections", {
        hint: "Run 'jfp login' to sign in",
      });
    } else {
      console.log(chalk.yellow("You must be logged in to use collections"));
      console.log(chalk.dim("Run 'jfp login' to sign in to JeffreysPrompts Premium"));
    }
    process.exit(1);
  }

  return true;
}

/**
 * Check if user has premium tier
 * Returns false if free tier (and command should exit)
 */
async function requirePremium(options: { json?: boolean }): Promise<boolean> {
  const creds = await loadCredentials();

  if (creds?.tier !== "premium") {
    if (shouldOutputJson(options)) {
      writeJsonError("premium_required", "Collections require a premium subscription", {
        hint: "Visit jeffreysprompts.com/premium to upgrade",
      });
    } else {
      console.log(chalk.yellow("Collections require a premium subscription"));
      console.log(chalk.dim("Visit jeffreysprompts.com/premium to upgrade"));
    }
    process.exit(1);
  }

  return true;
}

/**
 * List all user collections
 */
export async function collectionsCommand(options: CollectionsListOptions): Promise<void> {
  await requireAuth(options);
  await requirePremium(options);

  const response = await apiClient.get<CollectionItem[]>("/cli/collections");

  if (!response.ok) {
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
        writeJsonError("premium_required", "Collections require a premium subscription");
      } else {
        console.log(chalk.yellow("Collections require a premium subscription"));
      }
      process.exit(1);
    }

    if (shouldOutputJson(options)) {
      writeJsonError("api_error", response.error || "Failed to fetch collections");
    } else {
      console.log(chalk.red("Failed to fetch collections: " + (response.error || "Unknown error")));
    }
    process.exit(1);
  }

  const collections = response.data || [];

  if (shouldOutputJson(options)) {
    writeJson({ collections, count: collections.length });
    return;
  }

  if (collections.length === 0) {
    console.log(chalk.dim("You don't have any collections yet."));
    console.log(chalk.dim("Create a collection at jeffreysprompts.com or use 'jfp collections <name> --add <prompt-id>'"));
    return;
  }

  const table = new Table({
    head: ["Name", "Prompts", "Updated"],
    style: { head: ["cyan"] },
  });

  for (const collection of collections) {
    table.push([
      chalk.bold(collection.name),
      chalk.yellow(collection.promptCount.toString()),
      chalk.dim(new Date(collection.updatedAt).toLocaleDateString()),
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`\nFound ${collections.length} collections. Use "jfp collections <name>" for details.`));
}

/**
 * Show collection details or add prompt to collection
 */
export async function collectionShowCommand(
  name: string,
  options: CollectionShowOptions
): Promise<void> {
  await requireAuth(options);
  await requirePremium(options);

  // Handle --add flag
  if (options.add) {
    return addToCollection(name, options.add, options);
  }

  // Fetch collection details
  const response = await apiClient.get<CollectionDetail>(`/cli/collections/${encodeURIComponent(name)}`);

  if (!response.ok) {
    if (response.status === 404) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_found", `Collection not found: ${name}`);
    } else {
      console.log(chalk.red(`Collection not found: ${name}`));
      console.log(chalk.dim("Use 'jfp collections' to list your collections"));
    }
    process.exit(1);
    }

    if (isAuthError(response)) {
      if (shouldOutputJson(options)) {
        writeJsonError("auth_expired", "Session expired. Please run 'jfp login' again.");
      } else {
        console.log(chalk.yellow("Session expired. Please run 'jfp login' again."));
      }
      process.exit(1);
    }

    if (shouldOutputJson(options)) {
      writeJsonError("api_error", response.error || "Failed to fetch collection");
    } else {
      console.log(chalk.red("Failed to fetch collection: " + (response.error || "Unknown error")));
    }
    process.exit(1);
  }

  const collection = response.data!;

  if (shouldOutputJson(options)) {
    const { prompts, ...meta } = collection;
    writeJson({
      collection: meta,
      items: prompts,
      count: prompts.length,
    });
    return;
  }

  // Build formatted output
  let content = chalk.bold.cyan(collection.name) + "\n";
  if (collection.description) {
    content += chalk.dim(collection.description) + "\n";
  }
  content += "\n";

  content += chalk.green("Prompts:") + " " + collection.promptCount + "\n";
  content += chalk.green("Updated:") + " " + new Date(collection.updatedAt).toLocaleDateString() + "\n";

  if (collection.prompts.length > 0) {
    content += "\n" + chalk.dim("─".repeat(50)) + "\n\n";
    content += chalk.bold("Prompts in Collection") + "\n\n";

    for (const prompt of collection.prompts) {
      content += "  " + chalk.cyan("•") + " " + chalk.bold(prompt.title) + "\n";
      content += "    " + chalk.dim(prompt.description) + "\n";
      content += "    " + chalk.dim("ID: " + prompt.id + " | Category: " + prompt.category) + "\n\n";
    }
  } else {
    content += "\n" + chalk.dim("This collection is empty.") + "\n";
  }

  console.log(
    boxen(content, {
      padding: 1,
      borderStyle: "round",
      borderColor: "cyan",
    })
  );

  console.log(chalk.dim("\nAdd a prompt: jfp collections " + name + " --add <prompt-id>"));
}

/**
 * Add a prompt to a collection
 */
async function addToCollection(
  collectionName: string,
  promptId: string,
  options: CollectionShowOptions
): Promise<void> {
  // First verify the prompt exists in the local registry
  const prompt = getPrompt(promptId);
  if (!prompt) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_found", `Prompt not found: ${promptId}`);
    } else {
      console.log(chalk.red(`Prompt not found: ${promptId}`));
      console.log(chalk.dim("Use 'jfp list' to see available prompts"));
    }
    process.exit(1);
  }

  const response = await apiClient.post<{ success: boolean; collection: string; promptId: string }>(
    `/cli/collections/${encodeURIComponent(collectionName)}/prompts`,
    { promptId }
  );

  if (!response.ok) {
    if (response.status === 404) {
      if (shouldOutputJson(options)) {
        writeJsonError("not_found", `Collection not found: ${collectionName}`, {
          hint: "The collection will be created if it doesn't exist",
        });
      } else {
        console.log(chalk.red(`Collection not found: ${collectionName}`));
      }
      process.exit(1);
    }

    if (response.status === 409) {
      // Already in collection
      if (shouldOutputJson(options)) {
        writeJson({
          added: false,
          already_exists: true,
          collection: collectionName,
          prompt_id: promptId,
          prompt_title: prompt.title,
          message: `Prompt "${prompt.title}" is already in collection "${collectionName}"`,
        });
      } else {
        console.log(chalk.yellow(`Prompt "${prompt.title}" is already in collection "${collectionName}"`));
      }
      return;
    }

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
        writeJsonError("premium_required", "Adding to collections requires a premium subscription");
      } else {
        console.log(chalk.yellow("Adding to collections requires a premium subscription"));
      }
      process.exit(1);
    }

    if (shouldOutputJson(options)) {
      writeJsonError("api_error", response.error || "Failed to add prompt to collection");
    } else {
      console.log(chalk.red("Failed to add prompt: " + (response.error || "Unknown error")));
    }
    process.exit(1);
  }

  if (shouldOutputJson(options)) {
    writeJson({
      added: true,
      collection: collectionName,
      prompt_id: promptId,
      prompt_title: prompt.title,
      message: `Added "${prompt.title}" to collection "${collectionName}"`,
    });
  } else {
    console.log(chalk.green(`Added "${prompt.title}" to collection "${collectionName}"`));
  }
}
