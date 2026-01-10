// packages/core/src/prompts/registry.ts
// Single source of truth for all prompts

import type { Prompt, PromptCategory } from "./types";

// The prompts array - this IS the data (TypeScript-native, no markdown parsing)
export const prompts: Prompt[] = [
  {
    id: "idea-wizard",
    title: "The Idea Wizard",
    description: "Generate 30 improvement ideas, rigorously evaluate each, distill to the very best 5",
    category: "ideation",
    tags: ["brainstorming", "improvement", "evaluation", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 500,
    created: "2025-01-09",
    content: `Come up with your very best ideas for improving this project.

First generate a list of 30 ideas (brief one-liner for each).

Then go through each one systematically and critically evaluate it, rejecting the ones that are not excellent choices for good reasons and keeping the ones that pass your scrutiny.

Then, for each idea that passed your test, explain in detail exactly what the idea is (in the form of a concrete, specific, actionable plan with detailed code snippets where relevant), why it would be a good improvement, what are the possible downsides, and how confident you are that it actually improves the project (0-100%). Make sure to actually implement the top ideas now.

Use ultrathink.`,
    whenToUse: [
      "When starting a new feature or project",
      "When reviewing a codebase for improvements",
      "When stuck and need creative solutions",
      "At the start of a coding session for fresh perspective",
    ],
    tips: [
      "Run this at the start of a session for fresh perspective",
      "Combine with ultrathink for deeper analysis",
      "Focus on the top 3-5 ideas if time-constrained",
      "Let the agent implement ideas immediately after evaluation",
    ],
  },
  {
    id: "readme-reviser",
    title: "The README Reviser",
    description: "Update documentation for recent changes, framing them as how it always was",
    category: "documentation",
    tags: ["documentation", "readme", "docs", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "beginner",
    estimatedTokens: 300,
    created: "2025-01-09",
    content: `Update the README and other documentation to reflect all of the recent changes to the project.

Frame all updates as if they were always present (i.e., don't say "we added X" or "X is now Y" — just describe the current state).

Make sure to add any new commands, options, or features that have been added.

Use ultrathink.`,
    whenToUse: [
      "After completing a feature or significant code change",
      "When documentation is out of sync with code",
      "Before releasing a new version",
      "When onboarding new contributors",
    ],
    tips: [
      "Run after every significant feature completion",
      "Check for removed features that need to be undocumented",
      "Ensure examples still work with current code",
    ],
  },
  {
    id: "robot-mode-maker",
    title: "The Robot-Mode Maker",
    description: "Create an agent-optimized CLI interface for any project",
    category: "automation",
    tags: ["cli", "automation", "agent", "robot-mode", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "advanced",
    estimatedTokens: 600,
    created: "2025-01-09",
    content: `Design and implement a "robot mode" CLI for this project.

The CLI should be optimized for use by AI coding agents:

1. **JSON Output**: Add --json flag to every command for machine-readable output
2. **Quick Start**: Running with no args shows help in ~100 tokens
3. **Structured Errors**: Error responses include code, message, suggestions
4. **TTY Detection**: Auto-switch to JSON when piped
5. **Exit Codes**: Meaningful codes (0=success, 1=not found, 2=invalid args, etc.)
6. **Token Efficient**: Dense, minimal output that respects context limits

Think about what information an AI agent would need and how to present it most efficiently.

Use ultrathink to design the interface before implementing.`,
    whenToUse: [
      "When building a new CLI tool",
      "When adding agent-friendly features to existing CLI",
      "When optimizing human-centric tools for AI use",
    ],
    tips: [
      "Start with the most common agent workflows",
      "Test output token counts to ensure efficiency",
      "Include fuzzy search for discoverability",
    ],
  },
];

// Computed exports - derived from prompts array
export const categories = [...new Set(prompts.map((p) => p.category))].sort() as PromptCategory[];

export const tags = (() => {
  const tagCounts = new Map<string, number>();
  for (const prompt of prompts) {
    for (const tag of prompt.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  return [...tagCounts.entries()]
    // Sort by count descending, then alphabetically for stable ordering
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
})();

export const featuredPrompts = prompts.filter((p) => p.featured);

export const promptsById = new Map(prompts.map((p) => [p.id, p]));

// Helper functions
export function getPrompt(id: string): Prompt | undefined {
  return promptsById.get(id);
}

export function getPromptsByCategory(category: PromptCategory): Prompt[] {
  return prompts.filter((p) => p.category === category);
}

export function getPromptsByTag(tag: string): Prompt[] {
  return prompts.filter((p) => p.tags.includes(tag));
}

export function searchPromptsByText(query: string): Prompt[] {
  const lower = query.toLowerCase();
  return prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.tags.some((t) => t.toLowerCase().includes(lower))
  );
}
