import { searchPrompts, semanticRerank, type SearchResult, type RankedResult } from "@jeffreysprompts/core/search";
import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";

interface SuggestOptions {
  json?: boolean;
  limit?: number;
  semantic?: boolean;
}

interface SuggestOutput {
  task: string;
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    relevance: number;
    matchedFields: string[];
    tip: string;
  }>;
  total: number;
}

/**
 * jfp suggest <task> - Suggest prompts for a task
 *
 * Uses BM25 search to find relevant prompts for a task description.
 * With --semantic flag, applies MiniLM reranking for better semantic matching.
 * Falls back to hash-based embeddings if the model is unavailable.
 * Returns scored results with explanations of why they match.
 */
export async function suggestCommand(task: string, options: SuggestOptions) {
  const limit = options.limit || 3;

  if (!task.trim()) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({ error: "empty_task", message: "Please provide a task description" }));
    } else {
      console.error(chalk.red("Please provide a task description."));
      console.log(chalk.dim("Example: jfp suggest \"improve documentation for my API\""));
    }
    process.exit(1);
  }

  // Search using BM25 - get more results if semantic reranking will be applied
  const searchLimit = options.semantic ? Math.max(limit * 3, 10) : limit;
  let results = searchPrompts(task, { limit: searchLimit });

  // Apply semantic reranking if requested
  if (options.semantic && results.length > 0) {
    if (!shouldOutputJson(options)) {
      console.log(chalk.dim("Applying semantic reranking..."));
    }

    // Convert to RankedResult format for semantic rerank
    const rankedResults: RankedResult[] = results.map((r) => ({
      id: r.prompt.id,
      score: r.score,
      text: `${r.prompt.title} ${r.prompt.description} ${r.prompt.tags.join(" ")}`,
    }));

    // Apply semantic reranking with hash fallback
    const reranked = await semanticRerank(task, rankedResults, {
      topN: searchLimit,
      fallback: "hash",
    });

    // Map back to SearchResult format, maintaining the reranked order
    const rerankedIds = reranked.map((r) => r.id);
    const resultById = new Map(results.map((r) => [r.prompt.id, r]));

    results = rerankedIds
      .map((id, idx) => {
        const original = resultById.get(id);
        if (!original) return null;
        return {
          ...original,
          score: reranked[idx].score, // Use semantic score
        };
      })
      .filter((r): r is SearchResult => r !== null)
      .slice(0, limit);
  } else {
    // Just trim to requested limit
    results = results.slice(0, limit);
  }

  if (shouldOutputJson(options)) {
    const output: SuggestOutput = {
      task,
      suggestions: results.map((r) => formatSuggestion(r, task)),
      total: results.length,
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  // Human-readable output
  if (results.length === 0) {
    console.log(chalk.yellow("No relevant prompts found for this task."));
    console.log(chalk.dim("Try a different task description or use 'jfp list' to see all prompts."));
    return;
  }

  console.log(chalk.bold.cyan(`Prompts for: "${task}"\n`));

  for (let i = 0; i < results.length; i++) {
    const { prompt, score, matchedFields } = results[i];
    const relevancePercent = Math.min(100, Math.round(score * 20));
    const relevanceBar = getRelevanceBar(relevancePercent);

    // Header: rank, title, relevance
    console.log(
      chalk.bold.white(`${i + 1}. ${prompt.title}`) +
      chalk.dim(` (${prompt.id})`)
    );

    // Relevance visualization
    console.log(
      chalk.dim("   Relevance: ") +
      relevanceBar +
      chalk.dim(` ${relevancePercent}%`)
    );

    // Category and description
    console.log(
      chalk.dim("   ") +
      chalk.green(`[${prompt.category}]`) +
      chalk.dim(" ") +
      prompt.description
    );

    // Why this prompt matches
    const tip = generateTip(prompt, task, matchedFields);
    console.log(chalk.dim("   → ") + chalk.italic(tip));

    console.log();
  }

  // Footer with usage hint
  console.log(chalk.dim("─".repeat(50)));
  console.log(chalk.dim("Use ") + chalk.cyan("jfp show <id>") + chalk.dim(" to view full prompt"));
  console.log(chalk.dim("Use ") + chalk.cyan("jfp copy <id>") + chalk.dim(" to copy to clipboard"));
}

/**
 * Generate a visual relevance bar
 */
function getRelevanceBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;

  let color: (s: string) => string;
  if (percent >= 70) {
    color = chalk.green;
  } else if (percent >= 40) {
    color = chalk.yellow;
  } else {
    color = chalk.red;
  }

  return color("█".repeat(filled)) + chalk.dim("░".repeat(empty));
}

/**
 * Generate a contextual tip explaining why this prompt matches
 */
function generateTip(
  prompt: { title: string; category: string; tags: string[]; description: string },
  task: string,
  matchedFields: string[]
): string {
  const taskLower = task.toLowerCase();

  // Check for keyword matches to provide specific tips
  if (taskLower.includes("idea") || taskLower.includes("brainstorm") || taskLower.includes("improve")) {
    if (prompt.category === "ideation") {
      return "Great for generating and evaluating improvement ideas";
    }
  }

  if (taskLower.includes("doc") || taskLower.includes("readme") || taskLower.includes("documentation")) {
    if (prompt.category === "documentation") {
      return "Helps maintain clear, up-to-date documentation";
    }
  }

  if (taskLower.includes("cli") || taskLower.includes("tool") || taskLower.includes("automat")) {
    if (prompt.category === "automation") {
      return "Creates agent-friendly tools and automation";
    }
  }

  if (taskLower.includes("test") || taskLower.includes("spec")) {
    if (prompt.category === "testing") {
      return "Helps write comprehensive tests";
    }
  }

  if (taskLower.includes("bug") || taskLower.includes("fix") || taskLower.includes("debug")) {
    if (prompt.category === "debugging") {
      return "Systematic approach to finding and fixing issues";
    }
  }

  if (taskLower.includes("refactor") || taskLower.includes("clean") || taskLower.includes("improve code")) {
    if (prompt.category === "refactoring") {
      return "Helps restructure code for clarity and maintainability";
    }
  }

  // Generic tips based on matched fields
  if (matchedFields.includes("title")) {
    return `Directly relevant - matches "${prompt.title.toLowerCase()}"`;
  }

  if (matchedFields.includes("tags") && prompt.tags.length > 0) {
    return `Tagged with: ${prompt.tags.slice(0, 3).join(", ")}`;
  }

  if (matchedFields.includes("description")) {
    return prompt.description.length > 60
      ? prompt.description.slice(0, 57) + "..."
      : prompt.description;
  }

  // Default tip based on category
  const categoryTips: Record<string, string> = {
    ideation: "Helps generate creative solutions",
    documentation: "Maintains clear documentation",
    automation: "Streamlines repetitive tasks",
    refactoring: "Improves code structure",
    testing: "Ensures code quality",
    debugging: "Identifies and fixes issues",
    workflow: "Optimizes your process",
    communication: "Improves clarity in writing",
  };

  return categoryTips[prompt.category] || `${prompt.category} prompt`;
}

/**
 * Format a suggestion for JSON output
 */
function formatSuggestion(result: SearchResult, task: string): SuggestOutput["suggestions"][0] {
  return {
    id: result.prompt.id,
    title: result.prompt.title,
    description: result.prompt.description,
    category: result.prompt.category,
    relevance: Math.round(result.score * 100) / 100,
    matchedFields: result.matchedFields,
    tip: generateTip(result.prompt, task, result.matchedFields),
  };
}
