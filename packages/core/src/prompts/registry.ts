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
  {
    id: "stripe-level-ui",
    title: "Stripe-Level UI",
    description: "Build world-class, polished UI/UX components with intense focus on visual appeal",
    category: "refactoring",
    tags: ["ui", "ux", "frontend", "design", "polish"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 200,
    created: "2025-08-31",
    content: `I want you to a do a spectacular job building absolutely world-class UI/UX components, with an intense focus on making the most visually appealing, user-friendly, intuitive, slick, polished, "Stripe level" of quality UI/UX possible for this that leverages the good libraries that are already part of the project.`,
    whenToUse: [
      "When building new UI components",
      "When polishing existing interfaces",
      "When you want premium, professional-quality frontend",
    ],
    tips: [
      "Works great with Next.js, React, and Tailwind projects",
      "Reference Stripe's design system for inspiration",
      "Combine with existing component libraries like shadcn/ui",
    ],
  },
  {
    id: "git-committer",
    title: "The Git Committer",
    description: "Intelligently commit all changed files in logical groupings with detailed messages",
    category: "automation",
    tags: ["git", "commit", "automation", "workflow", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "beginner",
    estimatedTokens: 150,
    created: "2025-12-14",
    content: `Now, based on your knowledge of the project, commit all changed files now in a series of logically connected groupings with super detailed commit messages for each and then push. Take your time to do it right. Don't edit the code at all. Don't commit obviously ephemeral files. Use ultrathink.`,
    whenToUse: [
      "After completing a coding session with multiple changes",
      "When you have many modified files to commit",
      "When you want clean, well-organized git history",
    ],
    tips: [
      "Best used with a separate agent dedicated to git operations",
      "Agent will analyze diffs and group related changes",
      "Great for maintaining clean commit history",
    ],
  },
  {
    id: "de-slopify",
    title: "The De-Slopifier",
    description: "Remove telltale AI writing patterns from documentation and text",
    category: "documentation",
    tags: ["writing", "documentation", "editing", "style", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 350,
    created: "2026-01-03",
    content: `I want you to read through the complete text carefully and look for any telltale signs of "AI slop" style writing; one big tell is the use of emdash. You should try to replace this with a semicolon, a comma, or just recast the sentence accordingly so it sounds good while avoiding emdash.

Also, you want to avoid certain telltale writing tropes, like sentences of the form "It's not [just] XYZ, it's ABC" or "Here's why" or "Here's why it matters:". Basically, anything that sounds like the kind of thing an LLM would write disproportionately more commonly that a human writer and which sounds inauthentic/cringe.

And you can't do this sort of thing using regex or a script, you MUST manually read each line of the text and revise it manually in a systematic, methodical, diligent way. Use ultrathink.`,
    whenToUse: [
      "After generating documentation with AI",
      "When editing README files",
      "When polishing any AI-generated text for human readers",
    ],
    tips: [
      "Pay special attention to emdashes — they're a dead giveaway",
      "Watch for 'Here's why' and similar AI-isms",
      "Read the output aloud to catch unnatural phrasing",
    ],
  },
  {
    id: "code-reorganizer",
    title: "The Code Reorganizer",
    description: "Restructure scattered code files into a sensible, intuitive folder structure",
    category: "refactoring",
    tags: ["refactoring", "organization", "structure", "cleanup"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: false,
    difficulty: "advanced",
    estimatedTokens: 800,
    created: "2025-08-07",
    content: `We really have WAY too many code files scattered inside src/x with no rhyme or reason to the structure and location of code files; I feel like we could make things a lot more organized, logical, intuitive, etc. by reorganizing these into a nice, sensible folder structure, although I don't want something that has too many levels of nesting; basically, we should at least start out with making "no brainer" type changes to the folder structure, like putting all the "x" functionality-related code files into an "x" folder (and perhaps that inside of a data_sources folder which might also contain a "y" folder, etc.).

Before making any of these changes, I really need you to take the time to explore and read ALL of the many, many files in that folder and understand what they do, how they fit together, which code files import which others, how they interact in functional ways, etc., and then propose a reorganization plan in a new document called PROPOSED_CODE_FILE_REORGANIZATION_PLAN.md so I can review it before doing anything; this plan should include not just your detailed reorganization plan but the super-detailed rationale and justification for your proposed file/folder structure and why you think it's optimal for aiding any developer or coding agent working on this project to immediately and intuitively understand the project structure and where to look for things, etc.

I'm also open to merging/consolidating/splitting individual code files; if we have multiple small related code files that you think should be combined into a single code file, explain why. If you think any particular code files are WAY too big and really should be refactored into several smaller code files, then explain that too and your proposed strategy for how to restructure them.

Always keep in mind, and track in this plan document, changes you will need to make to any calling code to properly reflect the new folder structure and file structure so that we don't break anything. I don't want to discover after you do all this that nothing works anymore and we have to do a massive slog to get anything running again properly.`,
    whenToUse: [
      "When your codebase has grown organically and become messy",
      "When onboarding new developers is difficult due to confusing structure",
      "When you can't find files intuitively",
    ],
    tips: [
      "Replace 'x' and 'y' with your actual folder/feature names",
      "Make sure no other agents are running when implementing the plan",
      "Always review the plan document before execution",
    ],
  },
  {
    id: "bug-hunter",
    title: "The Bug Hunter",
    description: "Explore codebase with fresh eyes to find and fix obvious bugs and issues",
    category: "debugging",
    tags: ["debugging", "bugs", "review", "fresh-eyes", "exploration"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 400,
    created: "2025-09-17",
    content: `I want you to sort of randomly explore the code files in this project, choosing code files to deeply investigate and understand and trace their functionality and execution flows through the related code files which they import or which they are imported by. Once you understand the purpose of the code in the larger context of the workflows, I want you to do a super careful, methodical, and critical check with "fresh eyes" to find any obvious bugs, problems, errors, issues, silly mistakes, etc. and then systematically and meticulously and intelligently correct them. Be sure to comply with ALL rules in the AGENTS md file and ensure that any code you write or revise conforms to the best practice guides referenced in the AGENTS md file.`,
    whenToUse: [
      "After writing a lot of new code",
      "When you suspect there might be bugs lurking",
      "As a general code quality check",
      "To keep agents productively busy exploring and improving code",
    ],
    tips: [
      "Great for keeping agents busy with useful work",
      "Follow up with 'OK, now fix ALL of them' for execution",
      "Works well after the agent has explored different parts of the codebase",
    ],
  },
  {
    id: "system-weaknesses",
    title: "System Weaknesses Analyzer",
    description: "Identify the weakest parts of the system that need fresh ideas and improvements",
    category: "ideation",
    tags: ["analysis", "improvement", "review", "brainstorming"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: false,
    difficulty: "intermediate",
    estimatedTokens: 100,
    created: "2025-09-17",
    content: `Based on everything you've seen, what are the weakest/worst parts of the system? What is most needing of fresh ideas and innovative/creative/clever improvements?`,
    whenToUse: [
      "After the agent has explored the codebase thoroughly",
      "When you want to identify areas for improvement",
      "As a starting point for refactoring discussions",
    ],
    tips: [
      "Best used after the agent has done substantial work in the session",
      "Follow up with prompts to actually implement the improvements",
      "Combine with a TODO list prompt for tracking execution",
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
