/**
 * Static annotations for the "How It Was Made" transcript page.
 * These editorial comments are merged with ProcessedTranscript at render time.
 *
 * To add an annotation:
 * 1. Find the message ID from the transcript JSON
 * 2. Add an entry to the annotations map below
 * 3. Choose the appropriate type for the insight
 */

import { type TranscriptHighlight } from "@/lib/transcript/types";

/**
 * Annotation types and their meanings:
 * - key_decision: Major architectural or technical decisions
 * - interesting_prompt: Notable prompting techniques or patterns
 * - clever_solution: Elegant implementations or problem-solving approaches
 * - lesson_learned: Insights that could help future development
 */

/**
 * Map of message IDs to their annotations.
 * Keyed by message ID for O(1) lookup when rendering.
 */
export const annotationsMap: Record<string, Omit<TranscriptHighlight, "messageId">> = {
  // Project Kickoff - The original prompt that started it all
  "msg-0": {
    type: "interesting_prompt",
    annotation:
      "The initial prompt that sparked the entire project - including the three 'favorite prompts' that would become the foundation of the site's content.",
  },

  // Key architectural decision - TypeScript-native prompts
  "msg-15": {
    type: "key_decision",
    annotation:
      "Chose TypeScript-native prompts over markdown files. This eliminates parsing, provides type safety, and enables IDE autocomplete for all prompt fields.",
  },

  // BM25 Search Engine
  "msg-91": {
    type: "clever_solution",
    annotation:
      "Implemented custom BM25 search with weighted fields (title 3x, description 2x, tags 1.5x, content 1x). Much better relevance than simple text matching.",
  },

  // CLI Design Philosophy
  "msg-142": {
    type: "key_decision",
    annotation:
      "Agent-first CLI design: JSON output by default when piped, token-dense quick-start mode (~100 tokens), and meaningful exit codes for programmatic parsing.",
  },

  // Cursor tracking glow effect
  "msg-295": {
    type: "clever_solution",
    annotation:
      "PromptCard cursor-tracking glow effect using Framer Motion. Tracks mouse position to create a dynamic radial gradient that follows the cursor.",
  },

  // SpotlightSearch implementation
  "msg-369": {
    type: "key_decision",
    annotation:
      "SpotlightSearch (Cmd+K) as the primary discovery mechanism. Combines fuzzy search with recent history, category filtering, and keyboard navigation.",
  },

  // Skill manifest system
  "msg-554": {
    type: "clever_solution",
    annotation:
      "Skill manifest tracks installed prompts with SHA256 hashes. Detects user modifications to prevent accidental overwrites during updates.",
  },

  // Robot Mode philosophy
  "msg-667": {
    type: "lesson_learned",
    annotation:
      "The Robot-Mode Maker prompt in action: build tooling YOU would want to use. The CLI was designed by Claude, for Claude (and other agents).",
  },

  // Build process
  "msg-798": {
    type: "lesson_learned",
    annotation:
      "Single-file Bun binary compilation. The entire CLI compiles to one executable with no runtime dependencies - true portability.",
  },

  // Final polish
  "msg-1100": {
    type: "lesson_learned",
    annotation:
      "8 hours from first prompt to deployed site. The key was having clear patterns from brenner_bot to follow and systematic execution.",
  },
};

/**
 * Guide steps used by the annotated build guide.
 * These sit alongside transcript sections to explain what changed at each phase.
 */
export interface GuideStep {
  sectionId: string;
  narrative: string;
  outcomes: string[];
  artifacts: string[];
  revisions?: Array<{ id: string; label: string }>;
  planPanel?: boolean;
}

export const guideSteps: GuideStep[] = [
  {
    sectionId: "section-0",
    narrative:
      "The build started by mapping the prompt tweets into a full product scope and selecting brenner_bot as the north star for stack and UX. That context was distilled into a comprehensive plan that the rest of the session followed.",
    outcomes: [
      "Mapped prompt tweets into a full product scope (web + CLI).",
      "Adopted brenner_bot as the design and stack reference point.",
      "Produced the end-to-end build plan to drive execution.",
    ],
    artifacts: [
      "PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL.md",
      "AGENTS.md",
    ],
    planPanel: true,
    revisions: [
      { id: "packages-core", label: "Shared core package" },
      { id: "bm25-search", label: "BM25 search ranking" },
      { id: "cac-parser", label: "CAC CLI parser" },
      { id: "skill-manifest", label: "Skill manifest hashing" },
      { id: "yaml-safe", label: "YAML-safe frontmatter" },
    ],
  },
  {
    sectionId: "section-1",
    narrative:
      "We carved the monorepo into web, CLI, and a shared core, then locked down the type system so prompts and metadata lived as real TypeScript objects instead of loose markdown.",
    outcomes: [
      "Established the monorepo layout for core, CLI, and web packages.",
      "Defined prompt/category/meta types as the single source of truth.",
      "Set the registry contract that every feature relies on.",
    ],
    artifacts: [
      "packages/core/src/prompts/types.ts",
      "packages/core/src/prompts/registry.ts",
      "packages/core/src/index.ts",
    ],
    revisions: [{ id: "packages-core", label: "Shared core package" }],
  },
  {
    sectionId: "section-2",
    narrative:
      "Search relevance was solved early: tokenize, weight the right fields, and ship a real BM25 scorer so the UI and CLI could surface the best prompts.",
    outcomes: [
      "Implemented BM25 scoring with weighted fields for better relevance.",
      "Built the search pipeline: tokenize, score, rank, and return.",
      "Added export helpers for markdown, YAML, and skill formats.",
    ],
    artifacts: [
      "packages/core/src/search/bm25.ts",
      "packages/core/src/search/engine.ts",
      "packages/core/src/export/markdown.ts",
    ],
    revisions: [{ id: "bm25-search", label: "BM25 search ranking" }],
  },
  {
    sectionId: "section-3",
    narrative:
      "With core in place, the Next.js app landed fast: global layout, hero, and the reusable UI blocks that would power search, cards, and navigation.",
    outcomes: [
      "Bootstrapped the Next.js 16 App Router foundation.",
      "Established Tailwind 4 + shadcn/ui styling patterns.",
      "Built the initial layout, navigation, and hero system.",
    ],
    artifacts: [
      "apps/web/src/app/page.tsx",
      "apps/web/src/components/Nav.tsx",
      "apps/web/src/components/Hero.tsx",
    ],
  },
  {
    sectionId: "section-4",
    narrative:
      "The CLI was built to feel agent-native: fuzzy search, crisp output modes, and the ability to install skills directly from the registry.",
    outcomes: [
      "Built the `jfp` CLI entrypoint and command registry.",
      "Added fuzzy search plus JSON/markdown output modes.",
      "Enabled prompt export and skill installation workflows.",
    ],
    artifacts: [
      "packages/cli/src/index.ts",
      "packages/cli/src/commands/search.ts",
      "packages/cli/src/commands/export.ts",
    ],
    revisions: [
      { id: "cac-parser", label: "CAC CLI parser" },
      { id: "prompt-variables", label: "Prompt templating" },
      { id: "skill-manifest", label: "Skill manifest hashing" },
    ],
  },
  {
    sectionId: "section-5",
    narrative:
      "User-facing features snapped into place: Spotlight search, prompt cards, and the basket workflow that makes bulk export feel effortless.",
    outcomes: [
      "Shipped SpotlightSearch (Cmd+K) for prompt discovery.",
      "Designed prompt cards with copy and quick actions.",
      "Implemented the basket workflow for bulk downloads.",
    ],
    artifacts: [
      "apps/web/src/components/SpotlightSearch.tsx",
      "apps/web/src/components/PromptCard.tsx",
      "apps/web/src/components/BasketSidebar.tsx",
    ],
    revisions: [{ id: "changelog", label: "Prompt changelog" }],
  },
  {
    sectionId: "section-6",
    narrative:
      "The final stretch was all about trust: tests, docs, and the build pipeline that turns the CLI into a single portable binary.",
    outcomes: [
      "Expanded tests and hardened edge cases before shipping.",
      "Polished docs and release scripts for distribution.",
      "Prepared single-binary builds with Bun.",
    ],
    artifacts: [
      "packages/cli/__tests__/commands/json-schema-golden.test.ts",
      "README.md",
      "scripts/build-cli.sh",
    ],
    revisions: [
      { id: "health-endpoints", label: "Health endpoints" },
      { id: "yaml-safe", label: "YAML-safe frontmatter" },
    ],
  },
];

/**
 * Convert annotations map to array format for ProcessedTranscript.
 * @returns Array of TranscriptHighlight objects
 */
export function getAnnotations(): TranscriptHighlight[] {
  return Object.entries(annotationsMap).map(([messageId, annotation]) => ({
    messageId,
    ...annotation,
  }));
}

/**
 * Get annotation for a specific message ID.
 * @param messageId - The message ID to look up
 * @returns The annotation if found, or undefined
 */
export function getAnnotationForMessage(
  messageId: string
): Omit<TranscriptHighlight, "messageId"> | undefined {
  return annotationsMap[messageId];
}

/**
 * Check if a message has an annotation.
 * @param messageId - The message ID to check
 * @returns True if the message has an annotation
 */
export function hasAnnotation(messageId: string): boolean {
  return messageId in annotationsMap;
}

/**
 * Get all annotated message IDs.
 * Useful for highlighting annotated messages in the timeline.
 * @returns Set of message IDs that have annotations
 */
export function getAnnotatedMessageIds(): Set<string> {
  return new Set(Object.keys(annotationsMap));
}

/**
 * Get annotations grouped by type.
 * Useful for displaying insights by category.
 * @returns Object with arrays of annotations grouped by type
 */
export function getAnnotationsByType(): Record<
  TranscriptHighlight["type"],
  TranscriptHighlight[]
> {
  const grouped: Record<TranscriptHighlight["type"], TranscriptHighlight[]> = {
    key_decision: [],
    interesting_prompt: [],
    clever_solution: [],
    lesson_learned: [],
  };

  for (const [messageId, annotation] of Object.entries(annotationsMap)) {
    grouped[annotation.type].push({ messageId, ...annotation });
  }

  return grouped;
}
