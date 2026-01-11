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
  excerpts?: string[];
  outcomes: string[];
  artifacts: string[];
  revisions?: Array<{ id: string; label: string }>;
  planPanels?: Array<{ id: string; label: string }>;
  xRefs?: string[];
}

export interface WorkflowPost {
  id: string;
  date: string;
  title: string;
  summary: string;
  tags: string[];
  stepIds: string[];
  tone: "planning" | "coordination" | "prompting" | "ux";
}

export const guideSteps: GuideStep[] = [
  {
    sectionId: "section-0",
    narrative:
      "We began by turning the original prompt ideas into a formal plan, then ran a GPT Pro revision pass before any code landed. The Idea Wizard prompt helped expand and prune scope options, while the plan itself became the product spec. This planning-first discipline is the signature move: spend human effort up front so execution is fast, aligned, and low-drama. It is deliberately different from the usual \"just start coding\" approach — prompts are the operating system that drives the build.",
    excerpts: [
      "Started by re-reading AGENTS and README to lock constraints before coding.",
      "Ran bv triage to pick the highest-leverage bead after the plan was set.",
      "Used a GPT Pro pass to critique the markdown plan before execution.",
    ],
    outcomes: [
      "Mapped prompt tweets into a full product scope (web + CLI).",
      "Adopted brenner_bot as the design and stack reference point.",
      "Produced the end-to-end build plan to drive execution.",
    ],
    artifacts: [
      "PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL.md",
      "AGENTS.md",
    ],
    planPanels: [
      { id: "planning-revisions", label: "Multi-model plan review" },
      { id: "planning-revisions-gpt-pro", label: "GPT Pro session" },
    ],
    revisions: [
      { id: "packages-core", label: "Shared core package" },
      { id: "bm25-search", label: "BM25 search ranking" },
      { id: "cac-parser", label: "CAC CLI parser" },
      { id: "skill-manifest", label: "Skill manifest hashing" },
      { id: "yaml-safe", label: "YAML-safe frontmatter" },
    ],
    xRefs: [
      "2007588870662107197",
      "2007609050683306421",
      "2007737826394120664",
      "2007600632354521356",
    ],
  },
  {
    sectionId: "section-1",
    narrative:
      "Prompts became typed TypeScript objects so the registry is the source of truth for every surface (web, CLI, exports). The \"data is code\" choice avoids brittle markdown parsing and keeps changes precise, which matters when prompts are the product itself. Most prompt libraries stay file-based; this one treats the registry like a real API.",
    excerpts: [
      "Split shared logic into packages/core so web + CLI never diverge.",
      "Defined prompt types early to lock categories and metadata.",
      "Made the registry a real module, not a pile of markdown files.",
    ],
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
    planPanels: [{ id: "planning-revisions-gpt-pro", label: "GPT Pro session" }],
    xRefs: ["1939000599242252607"],
  },
  {
    sectionId: "section-2",
    narrative:
      "Search relevance was solved early with deterministic BM25 scoring. We deliberately avoided embeddings here because the catalog needs stable, explainable ranking that agents can trust across runs. This is part of the broader philosophy: build mechanical systems first, then add fancy layers only if needed.",
    excerpts: [
      "Implemented weighted BM25 so titles and tags outrank raw body text.",
      "Kept semantic reranking optional to preserve deterministic defaults.",
      "Search became a reusable core primitive, not a UI-specific hack.",
    ],
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
    planPanels: [{ id: "planning-revisions-gpt-pro", label: "GPT Pro session" }],
  },
  {
    sectionId: "section-3",
    narrative:
      "The web app was built quickly but intentionally: strong hero, clear navigation, and a UI system tuned for prompt browsing. The UI/UX prompt used in other projects shows up here too — iterate aggressively on layout and polish so the interface feels deliberate rather than template-driven.",
    excerpts: [
      "Bootstrapped the App Router, Tailwind 4, and shadcn primitives.",
      "Built hero + nav first so the rest of the UI had an anchor.",
      "Iterated on cards, spacing, and motion using the UI/UX prompt.",
    ],
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
    xRefs: [
      "2007194101448573036",
      "2007198623847854556",
      "1938439318533513714",
    ],
  },
  {
    sectionId: "section-4",
    narrative:
      "The CLI is treated as a first-class agent surface, not a secondary tool: fuzzy search, JSON/markdown modes, and skill installation are all tuned for automation and token efficiency. This is where the Robot-Mode Maker prompt shows up — build tools the agents can run reliably, then let them scale the work.",
    excerpts: [
      "Defaulted to JSON when piped to keep the CLI agent-first.",
      "Used CAC to make command parsing + help output reliable.",
      "Designed skill install/export to be automation-friendly.",
    ],
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
    planPanels: [{ id: "planning-revisions-gpt-pro", label: "GPT Pro session" }],
    xRefs: [
      "2007601404865548602",
      "2006557029964607785",
    ],
  },
  {
    sectionId: "section-5",
    narrative:
      "User-facing workflows snapped into place: Spotlight search, prompt cards, and the basket flow for bulk export. The goal is throughput — letting you explore, collect, and ship prompts quickly without the friction most catalogs impose.",
    excerpts: [
      "Spotlight search (Cmd+K) became the default discovery surface.",
      "Prompt cards shipped with fast copy and quick actions.",
      "The basket flow turned bulk export into one gesture.",
    ],
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
    xRefs: ["2007194101448573036"],
  },
  {
    sectionId: "section-6",
    narrative:
      "The final stretch was about trust and portability: hardening tests, refining docs, and producing a single-file CLI binary. The README Reviser prompt helps keep documentation aligned with reality instead of chasing drift. This is the less flashy part of the workflow, but it is what lets agents (and humans) rely on the tooling without surprises.",
    excerpts: [
      "Ran tests and lint to catch edge cases before shipping.",
      "Docs were tightened with a dedicated README revision pass.",
      "Single-file Bun builds were treated as a core deliverable.",
    ],
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
    planPanels: [{ id: "planning-revisions", label: "Multi-model plan review" }],
    xRefs: [
      "1938656137387397277",
      "1937957831803654324",
    ],
  },
];

export const workflowPosts: WorkflowPost[] = [
  {
    id: "2007588870662107197",
    date: "Jan 3, 2026",
    title: "GPT Pro plan revision pass",
    summary:
      "Paste the full markdown plan into GPT-5.2 Pro for critique before any code is written.",
    tags: ["planning", "revisions"],
    stepIds: ["section-0"],
    tone: "planning",
  },
  {
    id: "2007609050683306421",
    date: "Jan 4, 2026",
    title: "Comprehensive plan beats skeleton",
    summary:
      "The model performs best when it sees one detailed, end-to-end plan instead of a thin scaffold.",
    tags: ["planning", "quality"],
    stepIds: ["section-0"],
    tone: "planning",
  },
  {
    id: "2007737826394120664",
    date: "Jan 4, 2026",
    title: "Multi-model plan fusion",
    summary:
      "Collect plans from multiple frontier models, then fuse them in GPT Pro for a single revision pass.",
    tags: ["planning", "coordination"],
    stepIds: ["section-0"],
    tone: "planning",
  },
  {
    id: "2007600632354521356",
    date: "Jan 3, 2026",
    title: "GPT Pro writes the first plan",
    summary:
      "Generate the initial markdown plan with GPT Pro or Claude web before handing execution to agents.",
    tags: ["planning", "prompts"],
    stepIds: ["section-0"],
    tone: "planning",
  },
  {
    id: "1939000599242252607",
    date: "Jun 28, 2025",
    title: "Best-practices doc as a contract",
    summary:
      "Use a detailed stack guide as the ruleset that every agent and plan must align to.",
    tags: ["architecture", "standards"],
    stepIds: ["section-1"],
    tone: "planning",
  },
  {
    id: "2007194101448573036",
    date: "Jan 2, 2026",
    title: "UI/UX upgrade prompt",
    summary:
      "The UI polish prompt used to push layout, spacing, and motion beyond defaults.",
    tags: ["ux", "prompting"],
    stepIds: ["section-3", "section-5"],
    tone: "ux",
  },
  {
    id: "2007198623847854556",
    date: "Jan 2, 2026",
    title: "Prompt in action",
    summary:
      "A public example of the UI/UX prompt producing a fast, polished site in ~2 days.",
    tags: ["ux", "results"],
    stepIds: ["section-3"],
    tone: "ux",
  },
  {
    id: "1938439318533513714",
    date: "Jun 27, 2025",
    title: "Workflow for web apps",
    summary:
      "A full-stack workflow for building web apps with Claude Code and similar agents.",
    tags: ["workflow", "planning"],
    stepIds: ["section-3"],
    tone: "planning",
  },
  {
    id: "2006557029964607785",
    date: "Jan 1, 2026",
    title: "Beads + bv accelerate execution",
    summary:
      "Structured task graphs plus bv triage remove coordination drag in multi-agent builds.",
    tags: ["coordination", "execution"],
    stepIds: ["section-4"],
    tone: "coordination",
  },
  {
    id: "2007601404865548602",
    date: "Jan 3, 2026",
    title: "AGENTS.md teaches the stack",
    summary:
      "AGENTS.md is the way tools like beads become part of the agent's operating context.",
    tags: ["coordination", "tools"],
    stepIds: ["section-4"],
    tone: "coordination",
  },
  {
    id: "1938656137387397277",
    date: "Jun 27, 2025",
    title: "Multi-agent bug-fix pass",
    summary:
      "Spin up parallel Claude Code instances to clear bugs and type errors in one sweep.",
    tags: ["coordination", "quality"],
    stepIds: ["section-6"],
    tone: "coordination",
  },
  {
    id: "1937957831803654324",
    date: "Jun 25, 2025",
    title: "Lint-first refinement loop",
    summary:
      "Run lint first, then feed the exact failures into the agent for surgical fixes.",
    tags: ["workflow", "quality"],
    stepIds: ["section-6"],
    tone: "prompting",
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
