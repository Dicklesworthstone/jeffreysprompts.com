# PLAN: JeffreysPrompts.com — Ultra-Detailed Implementation Blueprint

**Plan version:** v2 (hybrid consolidation)  
**Last updated:** 2026-01-10

---

## Executive Summary (Why This Plan Wins)

- **Clean separation**: `@jeffreysprompts/core` is the sole source of truth; web + CLI import from core, never from each other.
- **Living content**: web ships a versioned registry; CLI uses stale‑while‑revalidate cache + embedded snapshot for offline starts.
- **Search done right**: BM25 everywhere, optional semantic rerank for harder queries, with hash fallback to avoid failures.
- **Prompt compiler**: parametric prompts + context injection reduce user friction and improve repeatability.
- **Agent-native**: MCP server mode exposes prompts/tools directly to agents.
- **Product-grade**: error boundaries, health endpoint, privacy analytics, and safer skill updates.

---

## Goals, Non-Goals, and Success Metrics

### Goals
- Fast prompt retrieval (<10 seconds to the right prompt).
- Low-friction use: copy, fill variables, export, and install skills quickly.
- Offline-first reliability (web PWA + CLI snapshot/cache).
- Agent-native integrations (MCP).
- Compounding value (local prompts + contributions + analytics insights).

### Non-Goals (for now)
- No user accounts or auth-backed personalization.
- No heavy backend search infrastructure.
- No marketplace or paid prompt economy.

### Success Metrics (practical)
- % of visitors who copy a prompt.
- Repeat usage (PWA installs, returning visitors, CLI weekly runs).
- Search quality: clicks per query + zero-result rate.
- Skill installs and update completion rates.

---

## Architecture Overview (Why This Structure Wins)

- **Single source of truth**: registry, search, exports, and templates live in `packages/core`.
- **Thin clients**: web and CLI are shells around core; no cross-app imports or brittle path coupling.
- **Content agility**: `/api/prompts` + `/registry.json` allow rapid prompt iteration without binary churn.
- **Future-proof**: core can be published for extensions (VS Code, MCP, etc.).

---

## Plan Preservation (No-Delete Rule Safe)

When making major revisions, **copy** this file to a versioned snapshot (e.g., `PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL_V1.md`) before rewriting.  
Do **not** delete or rename the existing file (preserves AGENTS.md invariants).

## Background Context

This section provides all the context needed to understand this project from first principles. It is designed to make this plan completely self-contained so that any developer or AI agent can pick it up and execute without additional context.

### Origin Story: "My Favorite Prompts" Twitter Series

In early January 2025, Jeffrey Emanuel ([@doodlestein](https://twitter.com/doodlestein)) began posting a series of tweets titled **"My Favorite Prompts"** — a curated collection of his most effective prompts for working with AI coding agents like Claude Code, Codex CLI, and Gemini CLI.

These prompts are battle-tested patterns that Jeffrey has refined through extensive real-world usage. They represent distilled wisdom about how to get the most out of agentic coding tools.

#### The First Three Prompts

**Prompt 1: The Idea Wizard**
> "Come up with your very best ideas for improving this project to make it more robust, reliable, performant, intuitive, user-friendly, ergonomic, useful, compelling, etc. while still being obviously accretive and pragmatic. Come up with 30 ideas and then really think through each idea carefully, how it would work, how users are likely to perceive it, how we would implement it, etc; then winnow that list down to your VERY best 5 ideas. Explain each of the 5 ideas in order from best to worst and give your full, detailed rationale and justification for how and why it would make the project obviously better and why you're confident of that assessment. Use ultrathink."

This prompt is designed to generate a high-quality, rigorously evaluated set of improvement ideas. The key insight is the "30 → 5" funnel: by forcing the agent to generate many ideas and then critically evaluate them, you get much better results than asking for "5 good ideas" directly.

**Prompt 2: The README Reviser**
> "OK, we have made tons of recent changes that aren't yet reflected in the README file. First, reread AGENTS.md so it's still fresh in your mind. Use ultrathink. Now, we need to revise the README for these changes (don't write about them as 'changes' however, make it read like it was always like that, since we don't have any users yet!). Also, what else can we put in there to make the README longer and more detailed about what we built, why it's useful, how it works, the algorithms/design principles used, etc? This should be incremental NEW content, not replacement for what is there already. And generally, look for any chunks of important features/functionality that are currently fully implemented in the code, but unmentioned, under-documented, under-explained, or under-justified in the README file."

This prompt addresses a common problem: documentation drift. The key insight is framing updates as "how it always was" rather than "what changed," which produces cleaner, more professional documentation.

**Prompt 3: The Robot-Mode Maker**
> "Next, I want you to create a 'robot mode' for coding agents that want to interact with this so they don't need to use the UI but can instead access all the same functionality via a CLI in the console that is hyper-optimized and ergonomic for agents, while also being ultra-intuitive for coding agents like yourself; the agent users should get back as output either JSON or markdown—whatever fits best in the context and is most token-efficient and intuitive for you. Basically, the agent users should get all the same information as a human would get from manipulating and visually observing the UI, but in a more usable, helpful, intuitive, and accessible form for agents. Make the tooling here that YOU would want if YOU were using it (because you WILL be!), that maximizes agent ergonomics and agent intuition. Be sure to give the command a quick-start mode (when no arguments are supplied) that explains the most critical functionality in the most intuitive, token-dense way possible. Use ultrathink."

This prompt creates agent-friendly CLI interfaces. The key insight is asking the agent to build what *it* would want to use, which produces genuinely ergonomic tooling.

#### The "ultrathink" Pattern

Several of Jeffrey's prompts include "Use ultrathink." This is a meta-prompt that triggers extended thinking/reasoning in Claude models. It signals that the task warrants deep analysis rather than quick responses.

### Community Response and Domain Purchase

The prompts resonated strongly with the AI/developer community on Twitter. A notable interaction occurred:

> **@NoahGreenSnow**: "Question Jeffrey, when do we get the slick JeffreysPrompts.com? I noticed in the agentic flywheel site you had a section with a collection of your prompts in the advanced workflows. I think this would be a beautiful standalone project."

> **@doodlestein**: "'Where'd you get that prompt?! It's lovely!' 'Oh, this old thing? I got it at JeffreysPrompts.com.' lol"

This exchange, initially a joke, led Jeffrey to actually purchase **jeffreysprompts.com** through Cloudflare. The domain is registered and ready for deployment.

### What This Project Is

JeffreysPrompts.com is a platform for showcasing, distributing, and using Jeffrey's curated prompts. It has three components:

1. **Web Application**: A beautiful, fast, single-page site where users can:
   - Browse all prompts with search and filtering
   - Copy prompts to clipboard with one click
   - Add prompts to a "basket" for bulk download
   - Export prompts as markdown or Claude Code skills
   - Install prompts directly as Claude Code skills

2. **CLI Tool (`jfp`)**: A command-line tool for power users and agents that provides:
   - BM25 search with fzf-style interactive mode
   - JSON output for programmatic access
   - Direct installation of prompts as Claude Code skills
   - Quick-start mode optimized for agent discoverability

3. **Claude Code Skills Integration**: First-class support for Claude Code's skills system, allowing prompts to be installed as reusable skills that Claude can invoke automatically.

### The Model Project: brennerbot.org

This project uses **brennerbot.org** as its architectural and design template. BrennerBot is Jeffrey's existing production web application, a sophisticated research platform built with:

- **Next.js 16** (App Router) + **React 19** (Server Components)
- **Tailwind CSS 4** with custom design tokens
- **Bun** as the sole JavaScript runtime and package manager
- **Vercel** for deployment
- **shadcn/ui** for accessible component primitives
- **Framer Motion** for animations

BrennerBot has several features that directly inspire JeffreysPrompts:

| BrennerBot Feature | JeffreysPrompts Equivalent |
|-------------------|---------------------------|
| Quote Bank (curated quotes with tags, search, copy) | Prompt Registry (curated prompts with tags, search, copy) |
| Jargon System (hover tooltips, bottom sheets) | Prompt Detail (preview, full view) |
| Spotlight Search (Cmd+K command palette) | Spotlight Search (same pattern) |
| Copy Button (animated feedback, toast) | Copy Button (identical component) |
| brenner CLI (Bun single-file binary) | jfp CLI (same architecture) |

The brennerbot.org codebase is located at `/data/projects/brenner_bot/` and contains:
- 522 TypeScript/TSX files
- 80%+ test coverage
- 3,531 lines of CSS with 70+ animations
- A 9,000+ line CLI tool compiled to a single binary
- Comprehensive accessibility and mobile optimization

### What Are Claude Code Skills?

Claude Code skills are a feature of [Claude Code](https://claude.ai/code), Anthropic's official CLI for Claude. Skills allow users to teach Claude reusable procedures, workflows, and domain knowledge.

#### Skills Architecture

A skill is a folder containing a `SKILL.md` file:

```
my-skill/
├── SKILL.md        # Required: YAML frontmatter + instructions
├── scripts/        # Optional: Executable scripts Claude can run
├── references/     # Optional: Reference documents loaded on-demand
└── assets/         # Optional: Images, data, templates
```

The `SKILL.md` file has this structure:

```yaml
---
name: skill-name
description: What this skill does and when to use it
---

# Skill Title

[Instructions that Claude follows when the skill is active]

## When to Use
- Scenario 1
- Scenario 2

## Guidelines
- Guideline 1
- Guideline 2
```

#### Progressive Disclosure

Skills use a three-tier loading system to minimize context usage:

1. **Startup**: Claude loads only `name` + `description` for all installed skills
2. **Invocation**: When a skill is relevant, Claude loads the full `SKILL.md`
3. **Deep Dive**: Additional files (`references/`, `scripts/`) are loaded only when needed

This design allows skills to bundle unlimited context without bloating the initial prompt.

#### Skill Locations

- **Personal Skills**: `$HOME/.config/claude/skills/` — Available in all projects
- **Project Skills**: `.claude/skills/` — Shared via git with team members
  - Paths are configurable via `skills.personalDir` / `skills.projectDir` in `$HOME/.config/jfp/config.json`

#### Skill Update Manifest (NEW)

Maintain a `manifest.json` **inside each skills directory** (personal + project) that records:
`{ promptId, version, updatedAt, hash }` (hash = SHA256 of the installed SKILL.md content)

The CLI uses this to make `jfp update` deterministic, detect user edits, and avoid unnecessary rewrites.
Only overwrite skills that include `x_jfp_generated: true` (unless `--force` is provided).

Implementation note: update only the entries you actually write or remove (don’t blindly rebuild).
`install`, `update`, and `uninstall` should update the manifest for affected IDs.

#### Why Skills Matter for JeffreysPrompts

By exporting prompts as Claude Code skills, users can:
- Invoke prompts by name without copy-pasting
- Have Claude automatically suggest relevant prompts
- Share prompt collections with teams via git
- Update all installed prompts with a single command

This transforms prompts from passive text snippets into active, integrated tools.

### Target Audiences

#### 1. Human Developers (Web App Focus)

Developers who want to:
- Discover new prompts for common tasks
- Quickly copy prompts for immediate use
- Build a personal collection of favorites
- Learn prompt engineering patterns from examples

The web app prioritizes:
- Beautiful, scannable UI
- One-click copy with visual feedback
- Mobile-responsive design
- Fast search and filtering

#### 2. AI Coding Agents (CLI Focus)

Agents (Claude Code, Codex, Gemini CLI) that want to:
- Programmatically access prompt content
- Install prompts as skills for future use
- Search for relevant prompts given a task
- Parse structured prompt metadata

The CLI prioritizes:
- JSON output mode for parsing
- Token-efficient responses
- Quick-start help for discoverability
- Non-interactive batch operations

#### 3. Power Users (Both)

Developers who use both the web app and CLI:
- Browse visually, copy via CLI
- Install skills from CLI, verify on web
- Use interactive fzf-style mode for exploration

### Design Philosophy

#### 1. TypeScript-Native Data

Prompts are defined as TypeScript objects, not markdown files, and live in a shared package used by both the web app and the CLI:

```typescript
// packages/core/src/prompts/registry.ts
export const prompts: Prompt[] = [
  {
    id: "idea-wizard",
    title: "The Idea Wizard",
    description: "Generate and evaluate 30 ideas, distill to best 5",
    category: "ideation",
    tags: ["brainstorming", "improvement", "ultrathink"],
    content: `Come up with your very best ideas...`,
    // ...
  },
];
```

Benefits:
- **Type safety**: TypeScript catches missing fields, typos
- **IDE support**: Autocomplete for categories, tags
- **No parsing**: No gray-matter, no markdown AST, no regex
- **Single source of truth**: The data IS the code

#### 1b. Schema Validation (NEW)

Add a lightweight runtime schema (e.g. zod or valibot) and a build-time validator:
- `packages/core/src/prompts/schema.ts`
- `scripts/validate-prompts.ts`
Run validation in CI and before releases to catch malformed prompts early.

#### 2. Agent-First Design

Every feature considers the agent user:
- CLI has `--json` flag for every command
- Quick-start mode is token-dense and informative
- Output formats are predictable and parseable
- Installation is automatable (no interactive prompts required)

#### 3. Copy Is King

The primary action is copying prompts. Every UI decision supports this:
- Copy button is prominent on every card
- Success feedback is immediate and satisfying
- Clipboard includes full prompt text
- Bulk export for collections

#### 4. Skills Are First-Class

Claude Code skills are not an afterthought:
- One-click install from web UI
- CLI `install` command with `--all` flag
- Bulk install via `curl | bash`
- Update mechanism for keeping skills current

#### 5. Mobile Excellence

Following brennerbot.org patterns:
- Touch targets are 44px minimum
- Bottom sheet for mobile interactions
- No horizontal scroll
- iOS Safari visual viewport fixes

#### 6. Accessibility (NEW)

- Full keyboard navigation for SpotlightSearch and prompt cards
- ARIA labels for copy buttons, tags, filters, and dialogs
- Basic contrast checks in CI (lightweight, warn-only)

### Technical Decisions

#### Bun-Only

- **Runtime**: Bun, not Node.js
- **Package manager**: Bun (`bun install`), not npm/yarn/pnpm
- **Lockfile**: `bun.lock` only
- **CLI compilation**: `bun build --compile` for single-file binaries

#### Next.js 16 + React 19

- **App Router**: File-based routing in `app/` directory
- **Server Components**: Default for pages, Client Components for interactivity
- **Streaming**: React Suspense for loading states

#### Tailwind CSS 4

- **CSS Variables**: Native custom properties, no JavaScript theme
- **OKLCH Colors**: Perceptually uniform color space
- **Fluid Typography**: `clamp()` for responsive sizing

#### Search Stack

- **Default**: BM25 (core implementation, tiny + deterministic)
- **Optional**: MiniLM semantic rerank via Transformers.js (lazy-loaded)

#### Vercel Deployment

- **Root Directory**: `apps/web` (monorepo structure)
- **Build Command**: `bun run build`
- **No Edge Functions**: Simple static + serverless

#### Cloudflare DNS

- **Domain**: jeffreysprompts.com registered on Cloudflare
- **DNS**: CNAME to `cname.vercel-dns.com`
- **Wrangler**: CLI for DNS management

### Relationship to AGENTS.md

Every project in Jeffrey's ecosystem has an `AGENTS.md` file that defines rules for AI agents working on the codebase. This project's `AGENTS.md` (already created) includes:

1. **Rule 1 (Absolute)**: Never delete files without explicit permission
2. **Bun-only toolchain**: No npm, yarn, pnpm
3. **Vercel deployment safety**: Never modify vercel.json without approval
4. **Landing the plane**: Always push before ending a session

The AGENTS.md for this project is adapted from brennerbot.org but customized for the simpler scope of JeffreysPrompts.

### What Success Looks Like

#### Minimum Viable Product (MVP)

1. **Web App**:
   - Home page with hero, search, category filters, prompt grid
   - PromptCard with title, description, tags, copy button, basket add
   - SpotlightSearch (Cmd+K) with fast search
   - Prompt permalink pages: `/prompts/[id]` (shareable + SEO)
   - Bundles index page: `/bundles`
   - Bundle permalink pages: `/bundles/[id]`
   - Export as markdown or Claude Code skills

2. **CLI Tool**:
   - `jfp list`, `jfp search`, `jfp suggest`, `jfp show`, `jfp copy`
   - `jfp render` for variable prompts
   - `jfp open` for prompt permalinks
   - `jfp install`, `jfp uninstall`, `jfp installed`
   - `jfp registry status|refresh` (live registry cache)
   - Interactive mode (`jfp i`)
   - JSON output for all commands

3. **Skills Integration**:
   - Export any prompt as SKILL.md
   - Bulk install via CLI or web
   - Prompt-formatter skill for adding new prompts

#### Quality Bar

- Lighthouse score >90 (all categories)
- JS bundle size budget (warn > 200KB gz for app shell)
- CLS < 0.1, INP < 200ms (lab)
- First Contentful Paint <1s
- CLI startup <100ms
- Binary size <50MB
- Works on iPhone SE through 4K displays

### Glossary of Terms

| Term | Definition |
|------|------------|
| **Prompt** | A structured text input designed to elicit specific behavior from an AI model |
| **ultrathink** | A meta-prompt that triggers extended reasoning in Claude models |
| **Skill** | A Claude Code feature that teaches Claude reusable procedures |
| **SKILL.md** | The markdown file defining a Claude Code skill |
| **jfp** | The CLI tool name (Jeffrey's Favorite Prompts) |
| **Registry** | The TypeScript file (`registry.ts`) containing all prompt definitions |
| **Basket** | A UI feature for collecting multiple prompts for bulk export |
| **SpotlightSearch** | A Cmd+K command palette for quick navigation |
| **Bun** | A fast JavaScript runtime and package manager |
| **AGENTS.md** | A file defining rules for AI agents working on a codebase |
| **prompt-formatter** | A Claude Code skill that converts raw prompt text → TypeScript registry entry |
| **skill-maker** | A meta-skill that converts prompts → SKILL.md files (can bundle multiple prompts) |
| **Robot Mode** | Agent-optimized CLI with JSON output, token-efficient responses, TTY detection |
| **cass** | Claude Agent Session Search — CLI tool for searching and extracting Claude Code session transcripts |
| **Making-Of Page** | `/how_it_was_made` — page showing the complete transcript of building the site |
| **JSONL** | JSON Lines format — one JSON object per line, used by Claude Code for session storage |

---

## Executive Summary

Build a world-class platform for showcasing and distributing Jeffrey Emanuel's curated coding prompts. This platform consists of:

1. **Web App** — Next.js 16 + React 19 + Tailwind 4 deployed on Vercel
2. **CLI Tool** — `jfp` Bun-compiled binary with fast BM25 search + optional semantic suggestions
3. **Claude Code Skills Integration** — Automated installation/management of skills
4. **TypeScript-Native Prompts** — No markdown parsing; pure TypeScript data structures

**Domain:** jeffreysprompts.com (Cloudflare DNS) → Vercel hosting

---

## Part 1: Reference Architecture from brennerbot.org

All patterns, components, and design decisions are derived from the production brennerbot.org codebase located at `/data/projects/brenner_bot/`.

### 1.1 Key Source Files to Replicate

| Pattern | Source File | Lines | Purpose |
|---------|-------------|-------|---------|
| **Jargon Dictionary** | `/data/projects/brenner_bot/apps/web/src/lib/jargon.ts` | 1,800+ | TypeScript glossary with progressive disclosure |
| **Jargon Component** | `/data/projects/brenner_bot/apps/web/src/components/ui/jargon.tsx` | 498 | Hover tooltip (desktop) + bottom sheet (mobile) |
| **Copy Button** | `/data/projects/brenner_bot/apps/web/src/components/ui/copy-button.tsx` | 351 | Animated copy with toast feedback |
| **Quote Bank Parser** | `/data/projects/brenner_bot/apps/web/src/lib/quotebank-parser.ts` | 139 | Tag extraction, filtering, search |
| **Search Engine** | `/data/projects/brenner_bot/apps/web/src/lib/search/engine.ts` | 200+ | MiniSearch with lazy loading (reference only) |
| **Spotlight Search** | `/data/projects/brenner_bot/apps/web/src/components/search/SpotlightSearch.tsx` | 55KB | Command palette (Cmd+K) |
| **Design System** | `/data/projects/brenner_bot/apps/web/src/app/globals.css` | 3,531 | 70+ animations, color tokens, typography |
| **Toast System** | `/data/projects/brenner_bot/apps/web/src/components/ui/toast.tsx` | ~200 | Cross-component notifications |
| **CLI Tool** | `/data/projects/brenner_bot/brenner.ts` | 9,000+ | Bun-compiled binary with arg parsing |

### 1.2 Animation Library (from globals.css)

Copy these keyframe animations verbatim:

```css
/* Core entrance animations */
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fade-in-scale { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }

/* Spring animations (natural motion) */
@keyframes spring-bounce {
  0% { transform: scale(0.9); }
  50% { transform: scale(1.05); }
  75% { transform: scale(0.97); }
  100% { transform: scale(1); }
}

/* Bottom sheet (mobile) */
@keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes sheet-down { from { transform: translateY(0); } to { transform: translateY(100%); } }

/* Toast notifications */
@keyframes toast-in {
  0% { transform: translateY(100%) scale(0.9); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

/* Copy success */
@keyframes draw-check {
  0% { stroke-dashoffset: 30; }
  100% { stroke-dashoffset: 0; }
}

/* Loading states */
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes skeleton-wave { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Reveal animations (scroll-triggered) */
@keyframes reveal-up {
  from { opacity: 0; transform: translateY(40px) scale(0.98); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

/* Hero orb floating */
@keyframes orb-float-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* Icon micro-interactions */
@keyframes icon-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.8; }
}

/* Ripple effect (button click) */
@keyframes ripple {
  0% { transform: scale(0); opacity: 0.5; }
  100% { transform: scale(4); opacity: 0; }
}
```

### 1.3 Color System (from globals.css)

```css
:root {
  /* Light mode */
  --background: oklch(0.99 0.002 260);
  --foreground: oklch(0.13 0.02 260);
  --card: oklch(1 0 0);
  --primary: oklch(0.58 0.19 195);        /* Electric Cyan */
  --primary-hover: oklch(0.52 0.20 195);
  --secondary: oklch(0.96 0.006 260);
  --muted: oklch(0.96 0.006 260);
  --muted-foreground: oklch(0.50 0.01 260);
  --accent: oklch(0.82 0.14 75);          /* Warm Amber */
  --border: oklch(0.92 0.006 260);
  --success: oklch(0.65 0.18 145);        /* Emerald */

  /* Glow effects */
  --glow-primary: 0 0 40px oklch(0.65 0.18 195 / 0.25);
  --glow-accent: 0 0 40px oklch(0.75 0.16 75 / 0.25);
}

.dark {
  --background: oklch(0.14 0.005 260);
  --foreground: oklch(0.96 0.01 260);
  --card: oklch(0.18 0.006 260);
  --primary: oklch(0.70 0.17 195);
  --border: oklch(0.26 0.008 260);
}
```

### 1.4 Typography & Spacing Tokens

```css
:root {
  /* Fluid typography (clamp for responsiveness) */
  --font-size-xs: clamp(0.6875rem, 0.65rem + 0.1vw, 0.75rem);
  --font-size-sm: clamp(0.8125rem, 0.775rem + 0.15vw, 0.875rem);
  --font-size-base: clamp(0.9375rem, 0.9rem + 0.2vw, 1rem);
  --font-size-lg: clamp(1.0625rem, 1rem + 0.3vw, 1.125rem);
  --font-size-xl: clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --font-size-2xl: clamp(1.5rem, 1.35rem + 0.75vw, 2rem);
  --font-size-3xl: clamp(1.875rem, 1.65rem + 1.1vw, 2.5rem);
  --font-size-4xl: clamp(2.25rem, 1.9rem + 1.75vw, 3.5rem);

  /* Animation durations */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;

  /* Animation easings */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);

  /* Container widths */
  --container-narrow: 42rem;
  --container-default: 88rem;
  --prose-width: 65ch;
}
```

---

## Part 2: TypeScript-Native Prompt System (Shared Core Package)

**No markdown files. No parsing. Pure TypeScript.**

Create a shared package `@jeffreysprompts/core` in `packages/core/` with a simple `src/index.ts` that re-exports
`prompts`, `bundles`, `workflows`, `export`, `search`, and `template` modules. Both the CLI and web app import from this package (no cross-app paths).

Add workspace wiring:
- Root `package.json` uses workspaces including `packages/*` and `apps/*`
- `apps/web/package.json` and the CLI package use `@jeffreysprompts/core` as a workspace dependency

### 2.1 Prompt Type Definitions

```typescript
// packages/core/src/prompts/types.ts

export type PromptCategory =
  | "ideation"        // Brainstorming, creativity
  | "documentation"   // READMEs, docs, comments
  | "automation"      // Robot mode, CLI, agents
  | "refactoring"     // Code improvement
  | "testing"         // Test generation
  | "debugging"       // Bug finding/fixing
  | "workflow"        // Process improvement
  | "communication";  // Writing, feedback

export type PromptDifficulty = "beginner" | "intermediate" | "advanced";

export type PromptVariableType = "text" | "multiline" | "select" | "file" | "path";

export interface PromptVariable {
  name: string; // e.g. "PROJECT_NAME"
  label: string;
  description?: string;
  type: PromptVariableType;
  required?: boolean;
  options?: string[]; // for select
  default?: string;
}

export interface PromptChange {
  version: string;
  date: string; // ISO 8601
  type: "improvement" | "fix" | "breaking";
  summary: string;
}

export interface PromptMeta {
  /** Unique identifier (kebab-case, stable, never change once published) */
  id: string;

  /** Human-readable title */
  title: string;

  /** One-line description for cards and search */
  description: string;

  /** Category for filtering */
  category: PromptCategory;

  /** Tags for search and filtering */
  tags: string[];

  /** Author attribution */
  author: string;

  /** Twitter handle */
  twitter?: string;

  /** Semantic version */
  version: string;

  /** Featured on homepage */
  featured?: boolean;

  /** Difficulty level */
  difficulty?: PromptDifficulty;

  /** Approximate input token count */
  estimatedTokens?: number;

  /** Creation date (ISO 8601) */
  created: string;

  /** Last update date (ISO 8601) */
  updatedAt?: string;
}

export interface Prompt extends PromptMeta {
  /** The actual prompt content (plain text with optional markdown) */
  content: string;

  /** Variables for templated prompts ({{VARS}}) */
  variables?: PromptVariable[];

  /** When to use this prompt (for skills export) */
  whenToUse?: string[];

  /** Usage tips (for skills export) */
  tips?: string[];

  /** Example scenarios */
  examples?: string[];

  /** Optional changelog entries for updates */
  changelog?: PromptChange[];
}

export interface PromptWithHtml extends Prompt {
  /** Pre-rendered HTML for display */
  contentHtml: string;
}
```

**Prompt ID Rules (NEW)**
- lowercase kebab-case only
- globally unique across all prompts
- stable forever once published (used in URLs, CLI, exports)
- enforced by `scripts/validate-prompts.ts`

### 2.2 Prompt Templating (Variables)

Prompts can include variables like `{{PROJECT_NAME}}` or `{{FILE_PATH}}`. The core package exposes a
simple renderer that performs safe string substitution (no logic, no eval).

```typescript
// packages/core/src/template/render.ts

import { type Prompt } from "../prompts/types";

function applyVariableDefaults(prompt: Prompt, vars: Record<string, string>): Record<string, string> {
  const defaults = Object.fromEntries(
    (prompt.variables ?? [])
      .filter((v) => v.default !== undefined)
      .map((v) => [v.name, String(v.default)])
  );
  return { ...defaults, ...vars };
}

export function renderPrompt(prompt: Prompt, vars: Record<string, string>): string {
  const merged = applyVariableDefaults(prompt, vars);
  return prompt.content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    return merged[key] ?? "";
  });
}
```

The web UI and CLI both use this for “prompt compilation” (see Part 6.7).

**Dynamic defaults (CLI/Web layer):**
- `PROJECT_NAME` → basename of `cwd`
- `CWD` → absolute working directory
- `GIT_BRANCH` → current git branch (if available)

These are injected **outside** core so the core renderer stays pure/deterministic.

#### 2.2.1 Core Package Barrel Exports

Keep `packages/core/src/index.ts` explicit so consumers can import from `@jeffreysprompts/core` safely:

```typescript
// packages/core/src/index.ts

export * from "./prompts/types";
export * from "./prompts/registry";
export * from "./prompts/bundles";
export * from "./prompts/workflows";

export * from "./export/skills";
export * from "./export/markdown";
export * from "./export/json";

export * from "./search/engine";
export * from "./search/synonyms";
export * from "./search/hash-embedder";
export * from "./search/semantic";

export * from "./template/render";
```

### 2.3 Prompt Registry (TypeScript Data)

```typescript
// packages/core/src/prompts/registry.ts

import { type Prompt } from "./types";

/**
 * The canonical prompt registry.
 *
 * To add a new prompt:
 * 1. Add a new entry to the `prompts` array below
 * 2. Run `bun run scripts/build-data.ts` to regenerate derived assets (manifest, indexes)
 * 3. The web app and CLI automatically pick up the new prompt
 *
 * This is the ONLY place prompts are defined.
 */
export const prompts: Prompt[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // IDEATION
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "idea-wizard",
    title: "The Idea Wizard",
    description: "Generate and rigorously evaluate 30 improvement ideas, then distill to the very best 5",
    category: "ideation",
    tags: ["brainstorming", "improvement", "evaluation", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 500,
    created: "2025-01-09",
    content: `Come up with your very best ideas for improving this project to make it more robust, reliable, performant, intuitive, user-friendly, ergonomic, useful, compelling, etc. while still being obviously accretive and pragmatic.

Come up with 30 ideas and then really think through each idea carefully:
- How it would work
- How users are likely to perceive it
- How we would implement it

Then winnow that list down to your VERY best 5 ideas.

Explain each of the 5 ideas in order from best to worst and give your full, detailed rationale and justification for how and why it would make the project obviously better and why you're confident of that assessment.

Use ultrathink.`,
    whenToUse: [
      "When starting a new feature or project",
      "When reviewing a codebase for improvements",
      "When stuck and need creative solutions",
      "During retrospectives or planning sessions",
    ],
    tips: [
      "Run this at the start of a session for fresh perspective",
      "Combine with ultrathink for deeper analysis",
      "Focus on the top 3 ideas if time-constrained",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DOCUMENTATION
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "readme-reviser",
    title: "The README Reviser",
    description: "Update README to reflect recent changes and add missing documentation",
    category: "documentation",
    tags: ["readme", "documentation", "updates", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 600,
    created: "2025-01-09",
    content: `OK, we have made tons of recent changes that aren't yet reflected in the README file. First, reread AGENTS.md so it's still fresh in your mind. Use ultrathink.

Now, we need to revise the README for these changes (don't write about them as 'changes' however, make it read like it was always like that, since we don't have any users yet!).

Also, what else can we put in there to make the README longer and more detailed about what we built, why it's useful, how it works, the algorithms/design principles used, etc? This should be incremental NEW content, not replacement for what is there already.

And generally, look for any chunks of important features/functionality that are currently fully implemented in the code, but unmentioned, under-documented, under-explained, or under-justified in the README file.`,
    whenToUse: [
      "After implementing significant changes",
      "Before releasing a new version",
      "When onboarding contributors",
      "During documentation sprints",
    ],
    tips: [
      "Read AGENTS.md first to understand project conventions",
      "Focus on WHY features exist, not just WHAT they do",
      "Include algorithms and design principles",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AUTOMATION
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "robot-mode-maker",
    title: "The Robot-Mode Maker",
    description: "Create an agent-optimized CLI interface for any project",
    category: "automation",
    tags: ["cli", "agents", "robot-mode", "ergonomics", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "advanced",
    estimatedTokens: 800,
    created: "2025-01-09",
    content: `Next, I want you to create a "robot mode" for coding agents that want to interact with this so they don't need to use the UI but can instead access all the same functionality via a CLI in the console that is hyper-optimized and ergonomic for agents, while also being ultra-intuitive for coding agents like yourself.

The agent users should get back as output either JSON or markdown—whatever fits best in the context and is most token-efficient and intuitive for you.

Basically, the agent users should get all the same information as a human would get from manipulating and visually observing the UI, but in a more usable, helpful, intuitive, and accessible form for agents.

Make the tooling here that YOU would want if YOU were using it (because you WILL be!), that maximizes agent ergonomics and agent intuition.

Be sure to give the command a quick-start mode (when no arguments are supplied) that explains the most critical functionality in the most intuitive, token-dense way possible.

Use ultrathink.`,
    whenToUse: [
      "When building tools that agents will use",
      "When adding CLI interfaces to existing projects",
      "When optimizing developer experience",
      "When creating automation infrastructure",
    ],
    tips: [
      "Think about what OUTPUT format you'd want as an agent",
      "Quick-start mode is critical for agent discoverability",
      "JSON for structured data, markdown for prose",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED DATA (computed at import time)
// ─────────────────────────────────────────────────────────────────────────────

/** All unique categories in the registry */
export const categories = [...new Set(prompts.map((p) => p.category))].sort();

/** All unique tags in the registry, sorted by frequency */
export const tags = (() => {
  const counts = new Map<string, number>();
  for (const prompt of prompts) {
    for (const tag of prompt.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
})();

/** Featured prompts for homepage */
export const featuredPrompts = prompts.filter((p) => p.featured);

/** Prompt lookup by ID */
export const promptsById = new Map(prompts.map((p) => [p.id, p]));

/** Get prompt by ID */
export function getPrompt(id: string): Prompt | undefined {
  return promptsById.get(id);
}

/** Get prompts by category */
export function getPromptsByCategory(category: PromptCategory): Prompt[] {
  return prompts.filter((p) => p.category === category);
}

/** Get prompts by tag */
export function getPromptsByTag(tag: string): Prompt[] {
  return prompts.filter((p) => p.tags.includes(tag));
}

/** Total prompt count */
export const totalCount = prompts.length;
```

### 2.3 Adding New Prompts (Developer Workflow)

Jeffrey adds new prompts by editing `packages/core/src/prompts/registry.ts`:

```typescript
// Just add a new entry to the prompts array:
{
  id: "new-prompt-slug",
  title: "The New Prompt",
  description: "One-line description",
  category: "ideation",
  tags: ["tag1", "tag2"],
  author: "Jeffrey Emanuel",
  twitter: "@doodlestein",
  version: "1.0.0",
  created: "2026-01-09",  // Use today's date in ISO format
  content: `Full prompt content here...`,
},
```

Benefits:
- **Type-safe**: TypeScript catches typos and missing fields
- **IDE support**: Autocomplete for categories, tags, etc.
- **No parsing**: No gray-matter, no markdown AST, no regex
- **Instant**: No build step to convert markdown to JSON
- **Native**: The data IS the code

### 2.4 Prompt Changelog & Update Diffs

Each prompt can include a `version`, `updatedAt`, and `changelog` entry. The web UI can surface
“What changed” on prompt pages, and the CLI can implement `jfp update --dry-run` to show exactly
which prompts would be updated and why (version bump + changelog summaries).

Add `jfp update --dry-run --diff` to show a short unified diff between the installed `SKILL.md`
and the newly generated version (truncate to a safe max, e.g., 200 lines).

---

## Part 3: Claude Code Skills Integration

### 3.1 Understanding Claude Code Skills

Skills are folders containing a `SKILL.md` file with YAML frontmatter:

```
my-skill/
├── SKILL.md        # Required: Instructions with YAML frontmatter
├── scripts/        # Optional: Executable scripts
├── references/     # Optional: Reference documents
└── assets/         # Optional: Images, data files
```

**SKILL.md format:**

```yaml
---
name: skill-name
description: Clear description of what this skill does and when to use it
---

# Skill Title

[Instructions that Claude follows when the skill is active]

## When to Use
- Scenario 1
- Scenario 2

## Guidelines
- Guideline 1
- Guideline 2
```

**Skill locations:**
- **Personal skills**: `$HOME/.config/claude/skills/` (available everywhere)
- **Project skills**: `.claude/skills/` (shared with team via git)

**Progressive disclosure:**
1. At startup, Claude loads only `name` + `description` into context
2. When a skill is invoked, Claude reads the full `SKILL.md`
3. Additional files (`references/`, `scripts/`) are loaded on-demand

### 3.2 Skills Export System

```typescript
// packages/core/src/export/skills.ts

import { type Prompt } from "@jeffreysprompts/core/prompts";
import JSZip from "jszip";

/**
 * Generate SKILL.md content for a single prompt.
 */
export function generateSkillMd(prompt: Prompt): string {
  const q = (value: unknown) => JSON.stringify(value); // YAML accepts JSON scalars/lists

  const whenToUse = prompt.whenToUse?.length
    ? `\n## When to Use\n\n${prompt.whenToUse.map((w) => `- ${w}`).join("\n")}`
    : "";

  const tips = prompt.tips?.length
    ? `\n\n## Tips\n\n${prompt.tips.map((t) => `- ${t}`).join("\n")}`
    : "";

  const examples = prompt.examples?.length
    ? `\n\n## Examples\n\n${prompt.examples.map((e) => `- ${e}`).join("\n")}`
    : "";

  return `---
name: ${q(prompt.id)}
description: ${q(prompt.description)}
version: ${q(prompt.version)}
author: ${q(prompt.author)}
category: ${q(prompt.category)}
tags: ${q(prompt.tags)}
source: ${q(`https://jeffreysprompts.com/prompts/${prompt.id}`)}
x_jfp_generated: true
---

# ${prompt.title}

${prompt.content}
${whenToUse}${tips}${examples}

---

*From [JeffreysPrompts.com](https://jeffreysprompts.com) by ${prompt.author}*
`;
}

/**
 * Generate a zip file containing multiple skills.
 */
export async function generateSkillsZip(prompts: Prompt[]): Promise<Blob> {
  const zip = new JSZip();

  for (const prompt of prompts) {
    const skillMd = generateSkillMd(prompt);
    zip.file(`${prompt.id}/SKILL.md`, skillMd);
  }

  // Add README explaining the bundle
  zip.file("README.md", `# Jeffrey's Prompts Skills Bundle

This bundle contains ${prompts.length} Claude Code skills from [JeffreysPrompts.com](https://jeffreysprompts.com).

## Installation

### Option 1: Personal Skills (available everywhere)

\`\`\`bash
# Extract to your personal skills directory
unzip jeffrey-prompts-skills.zip -d $HOME/.config/claude/skills/
\`\`\`

### Option 2: Project Skills (shared via git)

\`\`\`bash
# Extract to your project's skills directory
unzip jeffrey-prompts-skills.zip -d .claude/skills/
\`\`\`

### Option 3: Use the jfp CLI

\`\`\`bash
# Install all skills at once
jfp install --all

# Install specific skills
jfp install idea-wizard readme-reviser robot-mode-maker
\`\`\`

## Included Skills

${prompts.map((p) => `- **${p.title}** (\`${p.id}\`): ${p.description}`).join("\n")}

---

*Generated from [JeffreysPrompts.com](https://jeffreysprompts.com) on ${new Date().toISOString().split("T")[0]}*
`);

  return await zip.generateAsync({ type: "blob" });
}

/**
 * Generate installation shell script.
 */
export function generateInstallScript(prompts: Prompt[]): string {
  const skillDirs = prompts.map((p) => {
    // Using a quoted HEREDOC delimiter ('SKILL_EOF') prevents variable expansion,
    // so single quotes in the content don't need escaping
    const skillContent = generateSkillMd(p);
    return `
# ${p.title}
mkdir -p "$TARGET_DIR/${p.id}"
cat > "$TARGET_DIR/${p.id}/SKILL.md" << 'SKILL_EOF'
${skillContent}
SKILL_EOF
`;
  }).join("\n");

  return `#!/usr/bin/env bash
# Jeffrey's Prompts Skills Installer
# Generated from https://jeffreysprompts.com

set -euo pipefail
IFS=$'\n\t'

# Override location if desired:
#   JFP_TARGET_DIR="$HOME/.config/claude/skills" bash install.sh
TARGET_DIR="${JFP_TARGET_DIR:-"$HOME/.config/claude/skills"}"

mkdir -p "$TARGET_DIR"

echo "Installing ${prompts.length} skills to $TARGET_DIR..."

${skillDirs}

echo "Done! Installed ${prompts.length} skills."
echo "Restart Claude Code to load the new skills."
`;
}
```

### 3.2.4 Markdown Export

For users who want plain markdown without the Claude Code skill structure:

```typescript
// packages/core/src/export/markdown.ts

import { type Prompt } from "@jeffreysprompts/core/prompts";

/**
 * Generate markdown for a single prompt.
 */
export function generatePromptMarkdown(prompt: Prompt): string {
  const tags = prompt.tags.map((t) => `\`${t}\``).join(", ");

  return `# ${prompt.title}

**Category:** ${prompt.category}
**Tags:** ${tags}
**Author:** ${prompt.author}

---

${prompt.content}

---

*From [JeffreysPrompts.com](https://jeffreysprompts.com/prompts/${prompt.id})*
`;
}

/**
 * Generate a combined markdown document for multiple prompts.
 */
export function generateBundleMarkdown(prompts: Prompt[]): string {
  const toc = prompts.map((p, i) => `${i + 1}. [${p.title}](#${p.id})`).join("\n");

  const content = prompts.map((p) => `
<a id="${p.id}"></a>

## ${p.title}

**Category:** ${p.category} | **Tags:** ${p.tags.join(", ")}

${p.content}

---
`).join("\n");

  return `# Jeffrey's Prompts Collection

> ${prompts.length} curated prompts for agentic coding

## Table of Contents

${toc}

---

${content}

---

*Exported from [JeffreysPrompts.com](https://jeffreysprompts.com) on ${new Date().toISOString().split("T")[0]}*
`;
}
```

### 3.2.5 JSON Registry Export (Shared Payload)

Centralize the registry payload shape so both web and CLI stay in sync.
Include a `schemaVersion` field to allow forward-compatible changes.

```typescript
// packages/core/src/export/json.ts

import { prompts, bundles, workflows, categories, tags } from "../prompts/registry";

export function buildRegistryPayload() {
  const updatedAt = prompts.reduce((latest, p) => {
    const ts = p.updatedAt ?? p.created;
    return ts > latest ? ts : latest;
  }, "1970-01-01");

  return {
    schemaVersion: 1,
    version: process.env.JFP_REGISTRY_VERSION ?? "dev",
    updatedAt,
    prompts,
    bundles,
    workflows,
    meta: {
      promptCount: prompts.length,
      bundleCount: bundles.length,
      workflowCount: workflows.length,
      categories,
      tags,
    },
  };
}
```

### 3.2.6 Search Engine

The search engine powers both the web app's SpotlightSearch and the CLI's search. **Baseline search is BM25** (fast, tiny, deterministic), with **optional semantic rerank** for tougher queries. This keeps the default experience lightweight while allowing a “better suggestions” mode.

Include a small synonyms map (fix/repair, docs/readme, perf/speed) to improve lexical recall without heavy ML.

```typescript
// packages/core/src/search/engine.ts

import { prompts } from "../prompts/registry";
import { type Prompt, type PromptCategory } from "../prompts/types";
import { bm25Search } from "./bm25";
import { expandQueryWithSynonyms } from "./synonyms";

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  content: string;
  featured?: boolean;
  score: number;
}

export function searchPrompts(query: string, limit = 20, source: Prompt[] = prompts): SearchResult[] {
  if (!query.trim()) return [];

  const expanded = expandQueryWithSynonyms(query);
  const results = bm25Search(source, expanded, {
    limit,
    boost: { title: 3, description: 2, tags: 1.5, content: 1 },
  });

  return results.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    tags: r.tags,
    content: r.content,
    featured: r.featured,
    score: r.score,
  }));
}

export function filterByCategory(category: PromptCategory, source: Prompt[] = prompts): Prompt[] {
  return source.filter((p) => p.category === category);
}

export function filterByTag(tag: string, source: Prompt[] = prompts): Prompt[] {
  return source.filter((p) => p.tags.includes(tag));
}

export function searchAndFilter(
  query: string,
  options: { category?: PromptCategory; tags?: string[] } = {},
  source: Prompt[] = prompts
): SearchResult[] {
  let results: SearchResult[] = query.trim()
    ? searchPrompts(query, 20, source)
    : source.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        tags: p.tags,
        content: p.content,
        featured: p.featured,
        score: 0, // baseline when browsing
      }));

  if (options.category) {
    results = results.filter((r) => r.category === options.category);
  }

  if (options.tags?.length) {
    results = results.filter((r) => options.tags!.every((tag) => r.tags.includes(tag)));
  }

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.featured ?? false) !== (a.featured ?? false)) {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    }
    return a.title.localeCompare(b.title);
  });
}
```

**Optional semantic rerank (later phase):**
- BM25 returns top N results.
- If semantic mode is enabled, embed query + candidates and rerank by cosine similarity.
- Keep BM25 as the default to avoid heavy dependencies for typical usage.

Synonyms helper (lightweight query expansion):

```typescript
// packages/core/src/search/synonyms.ts

const SYNONYMS: Record<string, string[]> = {
  fix: ["repair", "resolve", "debug"],
  docs: ["readme", "documentation"],
  perf: ["performance", "speed", "optimize"],
};

export function expandQueryWithSynonyms(query: string): string {
  const tokens = query.toLowerCase().split(/\s+/);
  const expanded = tokens.flatMap((t) => [t, ...(SYNONYMS[t] ?? [])]);
  return expanded.join(" ");
}
```

Maintain `SYNONYMS` as a small, curated list (dev verbs + common aliases). Update alongside new prompt categories/tags.

### 3.3 Automated Skills Management via jfp CLI

> **Note**: This section shows the core CLI implementation. Some functions called in `main()` are
> defined in later sections of this plan:
> - `suggestCommand` — See Part 14.6 (Semantic Suggestion System)
> - `showAbout` — See Part 12.3 (Ecosystem Integration)
> - Interactive mode helpers — See Part 6.3 (Interactive Mode)

Root wrapper (kept tiny so `bun build --compile ./jfp.ts` stays stable):

```typescript
// jfp.ts (root)
import "./packages/cli/src/index";
```

```typescript
// packages/cli/src/index.ts — CLI entry point
// Root-level jfp.ts is a thin wrapper that imports and runs this module.

import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync, renameSync, mkdtempSync } from "fs";
import { join, dirname } from "path";
import { homedir, tmpdir } from "os";
import chalk from "chalk";
import { createHash } from "crypto";
import { type Prompt } from "@jeffreysprompts/core/prompts";
import { searchPrompts } from "@jeffreysprompts/core/search/engine";
import { generateSkillMd } from "@jeffreysprompts/core/export/skills";
import { generatePromptMarkdown } from "@jeffreysprompts/core/export/markdown";
import { renderPrompt } from "@jeffreysprompts/core/template/render";
import { cac } from "cac";
import { loadRegistry } from "./lib/registry-loader";
import { input, select, confirm } from "@inquirer/prompts";

// In production, commands should operate on registry prompts loaded via SWR cache
// (see Part 6.6), not the static bundled `prompts` array.

// Read version from package.json at compile time (Bun inlines this)
import packageJson from "./package.json";
const VERSION = packageJson.version;

// Parse command-line arguments (robust)
interface Flags {
  json: boolean;
  pretty: boolean;
  all: boolean;
  project: boolean;
  force: boolean;
  dryRun?: boolean;
  diff?: boolean;
  semantic?: boolean;
  fill?: boolean;
  context?: string;
  stdin?: boolean;
  maxContext?: number;
  vars?: Record<string, string>;
  category?: string;
  tag?: string;
  featured?: boolean;
  raw: boolean;
  limit?: number;
  bundle?: string;
  format?: string; // "skill" | "md"
  confirm?: boolean;
}

function printJson(value: unknown, flags: Flags) {
  const pretty = flags.pretty;
  console.log(pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value));
}

// Allow --VAR=value flags for render/copy (cac rejects unknown flags by default).
function parseVarFlags(argv: string[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const arg of argv) {
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, value] = arg.slice(2).split("=");
      if (key && value) vars[key] = value;
    }
  }
  return vars;
}

function findPrompt(registry: Prompt[], id: string): Prompt | undefined {
  return registry.find((p) => p.id === id);
}

async function promptForVars(prompt: Prompt, existing: Record<string, string> = {}): Promise<Record<string, string>> {
  const vars: Record<string, string> = { ...existing };
  if (!prompt.variables?.length) return vars;

  // Minimal interactive fill; keep required vars unfilled until user provides them.
  for (const variable of prompt.variables) {
    if (vars[variable.name]) continue;
    if (!variable.required && variable.default !== undefined) {
      vars[variable.name] = String(variable.default);
      continue;
    }
    // Use @inquirer/prompts input/select in real implementation
    const value = variable.type === "select"
      ? await select({ message: variable.label, choices: variable.options?.map((o) => ({ name: o, value: o })) ?? [] })
      : await input({ message: `${variable.label}`, default: variable.default });

    if (variable.type === "file" && value) {
      vars[variable.name] = readContextFile(value, 200000);
    } else {
      vars[variable.name] = value ?? "";
    }
  }

  return vars;
}

function readContextFile(path: string, maxBytes = 200000): string {
  const data = readFileSync(path);
  if (data.length <= maxBytes) return data.toString("utf-8");
  const truncated = data.subarray(0, maxBytes).toString("utf-8");
  return `${truncated}\n\n[Context truncated to ${maxBytes} bytes from ${path}]`;
}

async function readStdin(maxBytes = 200000): Promise<string> {
  const text = await new Response(Bun.stdin).text();
  if (text.length <= maxBytes) return text;
  return `${text.slice(0, maxBytes)}\n\n[Context truncated to ${maxBytes} bytes from stdin]`;
}

function normalizeVars(prompt: Prompt, vars: Record<string, string>): Record<string, string> {
  const out = { ...deriveDynamicDefaults(), ...vars };
  for (const variable of prompt.variables ?? []) {
    if (variable.type === "file" && out[variable.name]) {
      if (existsSync(out[variable.name])) {
        out[variable.name] = readContextFile(out[variable.name], 200000);
      }
    }
  }
  return out;
}

function deriveDynamicDefaults(): Record<string, string> {
  const cwd = process.cwd();
  const project = cwd.split("/").pop() ?? "project";
  let branch = "";
  try {
    const result = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"]);
    if (result.exitCode === 0) {
      branch = (result.stdout?.toString("utf-8") ?? "").trim();
    }
  } catch {
    // ignore git failures
  }
  return {
    PROJECT_NAME: project,
    CWD: cwd,
    GIT_BRANCH: branch,
  };
}

function expandPath(value?: string): string | undefined {
  if (!value) return value;
  if (value.startsWith("~")) return join(homedir(), value.slice(1));
  return value.replace("$HOME", homedir());
}

function loadConfig(): Partial<JfpConfig> {
  const path = join(homedir(), ".config", "jfp", "config.json");
  if (!existsSync(path)) return {};
  try {
    const config = JSON.parse(readFileSync(path, "utf-8")) as Partial<JfpConfig>;
    if (config.registry) {
      config.registry.cachePath = expandPath(config.registry.cachePath);
      config.registry.metaPath = expandPath(config.registry.metaPath);
    }
    if (config.skills) {
      config.skills.personalDir = expandPath(config.skills.personalDir);
      config.skills.projectDir = expandPath(config.skills.projectDir);
    }
    if (config.localPrompts) {
      config.localPrompts.dir = expandPath(config.localPrompts.dir);
    }
    return config;
  } catch {
    console.error(chalk.yellow("Invalid $HOME/.config/jfp/config.json (ignoring)"));
    return {};
  }
}

function formatRegistryStatus(status: { version: string; updatedAt?: string; cachedAt?: string; cachePresent: boolean }) {
  return [
    `Registry version: ${status.version}`,
    status.updatedAt ? `Updated: ${status.updatedAt}` : null,
    status.cachedAt ? `Cached: ${status.cachedAt}` : null,
    status.cachePresent ? null : "Cache: missing",
  ].filter(Boolean).join("\n");
}

function formatRegistryRefresh(result: { updated: boolean; version: string }) {
  return result.updated
    ? `Registry updated to ${result.version}`
    : `Registry already up to date (${result.version})`;
}

function getRegistryPaths() {
  const config = loadConfig();
  const registry = config.registry ?? {};
  const cachePath = registry.cachePath ?? join(homedir(), ".config", "jfp", "registry.json");
  const metaPath = registry.metaPath ?? join(dirname(cachePath), "registry.meta.json");
  const registryUrl = registry.remote ?? "https://jeffreysprompts.com/api/prompts";
  const manifestUrl = registry.manifestUrl ?? "https://jeffreysprompts.com/registry.manifest.json";
  const timeoutMs = registry.timeoutMs ?? 2000;
  return {
    cachePath,
    metaPath,
    registryUrl,
    manifestUrl,
    timeoutMs,
  };
}

function getRegistryStatus(cachePath: string, metaPath: string) {
  const cachePresent = existsSync(cachePath);
  if (!cachePresent) {
    return { version: "none", cachedAt: undefined, updatedAt: undefined, cachePresent };
  }
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf-8")) : {};
  return {
    version: meta.version ?? "unknown",
    cachedAt: meta.cachedAt,
    updatedAt: meta.updatedAt,
    cachePresent,
  };
}

// refreshRegistry implementation in Part 6.6 (stale-while-revalidate)

function printCompletion(shell: string) {
  // Prefer cac's completion generator so flags + subcommands stay in sync.
  if (typeof (cli as any).generateCompletion === "function") {
    console.log((cli as any).generateCompletion({ shell }));
    return;
  }

  // Fallback: minimal static template if completion generator is unavailable.
  const commands = [
    "list", "search", "suggest", "show", "copy", "render",
    "export", "install", "uninstall", "installed", "update",
    "bundles", "bundle", "categories", "tags",
    "registry", "open", "serve", "completion", "about", "update-cli",
    "skill", "doctor",
  ];

  if (shell === "bash") {
    console.log(`# bash completion (fallback)\ncomplete -W "${commands.join(" ")}" jfp`);
  } else if (shell === "zsh") {
    console.log(`# zsh completion (fallback)\ncompdef _gnu_generic jfp`);
  } else if (shell === "fish") {
    console.log(`complete -c jfp -f -a "${commands.join(" ")}"`);
  } else {
    console.error("Unsupported shell");
  }
}

type SkillsManifestEntry = {
  promptId: string;
  version: string;
  updatedAt?: string;
  hash: string;
};

function hashContent(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function updateSkillsManifest(
  skillsDir: string,
  updated: Prompt[] = [],
  removed: string[] = []
) {
  if (!existsSync(skillsDir)) return;
  const manifestPath = join(skillsDir, "manifest.json");
  const existing = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf-8"))
    : { entries: [] as SkillsManifestEntry[] };

  const byId = new Map((existing.entries ?? []).map((e: SkillsManifestEntry) => [e.promptId, e]));
  for (const id of removed) byId.delete(id);

  for (const prompt of updated) {
    const skillPath = join(skillsDir, prompt.id, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    const content = readFileSync(skillPath, "utf-8");
    byId.set(prompt.id, {
      promptId: prompt.id,
      version: prompt.version,
      updatedAt: prompt.updatedAt ?? prompt.created,
      hash: hashContent(content),
    });
  }

  const entries = Array.from(byId.values());
  writeFileSync(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2));
}

async function startMcpServer() {
  // See Part 6.9 for MCP server details.
}

const cli = cac("jfp");
cli
  .option("--json", "machine-readable output (auto when piped)", { default: !process.stdout.isTTY })
  .option("--pretty", "pretty-print JSON (larger output)", { default: false })
  .option("--no-color", "disable ANSI colors", { default: false });

// $HOME/.config/jfp/config.json
interface JfpConfig {
  registry?: {
    remote?: string;            // Default: https://jeffreysprompts.com/api/prompts
    manifestUrl?: string;       // Default: https://jeffreysprompts.com/registry.manifest.json
    cachePath?: string;          // Default: $HOME/.config/jfp/registry.json
    metaPath?: string;           // Default: $HOME/.config/jfp/registry.meta.json
    autoRefresh?: boolean;       // Default: true
    timeoutMs?: number;          // Default: 2000
  };
  updates?: {
    autoUpdate?: boolean;        // Default: false (opt-in)
    channel?: "stable" | "beta";
    lastCheck?: string;          // ISO timestamp
  };
  skills?: {
    personalDir?: string;        // Default: $HOME/.config/claude/skills
    projectDir?: string;         // Default: .claude/skills
  };
  localPrompts?: {
    enabled?: boolean;           // Default: true
    dir?: string;                // Default: $HOME/.config/jfp/local
  };
  analytics?: {
    enabled?: boolean;           // Default: false
  };
}

Example config:

```json
{
  "registry": {
    "remote": "https://jeffreysprompts.com/api/prompts",
    "manifestUrl": "https://jeffreysprompts.com/registry.manifest.json",
    "cachePath": "$HOME/.config/jfp/registry.json",
    "metaPath": "$HOME/.config/jfp/registry.meta.json",
    "autoRefresh": true,
    "timeoutMs": 2000
  },
  "updates": {
    "autoUpdate": false,
    "channel": "stable"
  },
  "skills": {
    "personalDir": "$HOME/.config/claude/skills",
    "projectDir": ".claude/skills"
  },
  "localPrompts": {
    "enabled": true,
    "dir": "$HOME/.config/jfp/local"
  },
  "analytics": {
    "enabled": false
  }
}
```

Note: prefer absolute paths. `expandPath()` handles `~` and `$HOME` for convenience.

// jfp list — List all prompts
async function listCommand(flags: Flags) {
  const registry = await loadRegistry();
  let result = registry;

  // Apply filters
  if (flags.category) {
    result = result.filter((p) => p.category === flags.category);
  }
  if (flags.tag) {
    result = result.filter((p) => p.tags.includes(flags.tag!));
  }
  if (flags.featured) {
    result = result.filter((p) => p.featured);
  }

  if (flags.json) {
    printJson(result.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      tags: p.tags,
      description: p.description,
    })), flags);
    return;
  }

  // Human-readable table
  console.log(chalk.bold("ID".padEnd(20) + "CATEGORY".padEnd(15) + "TAGS".padEnd(30) + "DESCRIPTION"));
  console.log("─".repeat(90));
  for (const p of result) {
    console.log(
      chalk.cyan(p.id.padEnd(20)) +
      p.category.padEnd(15) +
      p.tags.slice(0, 2).join(",").padEnd(30) +
      p.description.slice(0, 40)
    );
  }
}

// jfp search — BM25 search prompts
async function searchCommand(query: string, flags: Flags) {
  if (!query) {
    console.error(chalk.red("Usage: jfp search <query>"));
    process.exit(2);
  }

  const registry = await loadRegistry();
  const results = searchPrompts(query, flags.limit ?? 20, registry);

  if (flags.json) {
    printJson({
      query,
      count: results.length,
      results: results.map((r) => ({
        id: r.id,
        score: r.score,
        title: r.title,
        description: r.description,
      })),
    }, flags);
    return;
  }

  if (results.length === 0) {
    console.log(chalk.dim(`No prompts found matching "${query}"`));
    return;
  }

  console.log(chalk.bold(`Found ${results.length} prompts matching "${query}":\n`));
  for (const r of results) {
    console.log(`  ${chalk.cyan(r.id)}`);
    console.log(`  ${chalk.dim(r.description)}\n`);
  }
}

// jfp show — Show full prompt details
async function showCommand(id: string, flags: Flags) {
  if (!id) {
    console.error(chalk.red("Usage: jfp show <prompt-id>"));
    process.exit(2);
  }

  const registry = await loadRegistry();
  const prompt = findPrompt(registry, id);
  if (!prompt) {
    console.error(chalk.red(`Prompt not found: ${id}`));
    console.error(chalk.dim(`Available: ${registry.map((p) => p.id).join(", ")}`));
    process.exit(1);
  }

  if (flags.raw) {
    // Just the prompt text, for piping
    console.log(prompt.content);
    return;
  }

  if (flags.json) {
    printJson(prompt, flags);
    return;
  }

  // Human-readable markdown-style output
  console.log(chalk.bold(`# ${prompt.title}\n`));
  console.log(`${chalk.dim("Category:")} ${prompt.category}`);
  console.log(`${chalk.dim("Tags:")} ${prompt.tags.join(", ")}`);
  console.log();
  console.log(prompt.content);
  if (prompt.whenToUse?.length) {
    console.log(chalk.bold("\n## When to Use"));
    for (const when of prompt.whenToUse) {
      console.log(`- ${when}`);
    }
  }
  if (prompt.tips?.length) {
    console.log(chalk.bold("\n## Tips"));
    for (const tip of prompt.tips) {
      console.log(`- ${tip}`);
    }
  }
}

// jfp copy — Copy prompt to clipboard
async function copyCommand(id: string, flags: Flags) {
  if (!id) {
    console.error(chalk.red("Usage: jfp copy <prompt-id>"));
    process.exit(2);
  }

  const registry = await loadRegistry();
  const prompt = findPrompt(registry, id);
  if (!prompt) {
    console.error(chalk.red(`Prompt not found: ${id}`));
    process.exit(1);
  }

  const baseVars = normalizeVars(prompt, flags.vars ?? {});
  const filledVars = flags.fill
    ? { ...baseVars, ...(await promptForVars(prompt, baseVars)) }
    : baseVars;

  const content = Object.keys(filledVars).length
    ? renderPrompt(prompt, filledVars)
    : prompt.content;

  // Use platform-specific clipboard command with safe stdin piping
  // Note: Using Bun.spawn instead of shell echo to handle special characters safely
  const clipboardCmds =
    process.platform === "darwin" ? [["pbcopy"]] :
    process.platform === "win32" ? [["clip"]] :
    [["wl-copy"], ["xclip", "-selection", "clipboard"]];

  try {
    let success = false;
    for (const cmd of clipboardCmds) {
      const proc = Bun.spawn(cmd, { stdin: "pipe" });
      proc.stdin.write(content);
      proc.stdin.end();
      const exitCode = await proc.exited;
      if (exitCode === 0) {
        success = true;
        break;
      }
    }
    if (!success) throw new Error("No clipboard backend succeeded");
  } catch {
    console.error(chalk.red("Could not copy to clipboard. Install wl-copy or xclip (Linux), or pbcopy (macOS)."));
    process.exit(3);
  }

  console.log(chalk.green(`✓ Copied "${prompt.title}" to clipboard`));
}

// jfp render — Render a prompt with variables + optional context
async function renderCommand(id: string, flags: Flags) {
  const registry = await loadRegistry();
  const prompt = findPrompt(registry, id);
  if (!prompt) {
    console.error(chalk.red(`Prompt not found: ${id}`));
    process.exit(1);
  }

  const vars = normalizeVars(prompt, flags.vars ?? {});
  const missingRequired = (prompt.variables ?? []).filter((v) => v.required && !vars[v.name]);
  if (missingRequired.length && !flags.fill) {
    console.error(chalk.yellow(`Missing required vars: ${missingRequired.map((v) => v.name).join(", ")} (use --fill)`));
  }
  let output = renderPrompt(prompt, vars);

  if (flags.context) {
    output += `\n\n---\n\nContext:\n` + readContextFile(flags.context, flags.maxContext);
  } else if (flags.stdin) {
    output += `\n\n---\n\nContext:\n` + await readStdin(flags.maxContext);
  }

  if (flags.json) {
    printJson({ id: prompt.id, rendered: output }, flags);
    return;
  }

  console.log(output);
}

// jfp open — Open prompt permalink in browser
async function openCommand(id: string) {
  const url = `https://jeffreysprompts.com/prompts/${id}`;
  const cmd =
    process.platform === "darwin" ? ["open", url] :
    process.platform === "win32" ? ["cmd", "/c", "start", url] :
    ["xdg-open", url];
  const proc = Bun.spawn(cmd);
  await proc.exited;
}

// jfp registry status/refresh — Registry cache management
async function registryStatusCommand(flags: Flags) {
  const paths = getRegistryPaths();
  const status = await getRegistryStatus(paths.cachePath, paths.metaPath);
  flags.json ? printJson(status, flags) : console.log(formatRegistryStatus(status));
}

async function registryRefreshCommand(flags: Flags) {
  const paths = getRegistryPaths();
  const result = await refreshRegistry({
    cachePath: paths.cachePath,
    metaPath: paths.metaPath,
    registryUrl: paths.registryUrl,
    manifestUrl: paths.manifestUrl,
    timeoutMs: paths.timeoutMs,
  });
  flags.json ? printJson(result, flags) : console.log(formatRegistryRefresh(result));
}

// jfp doctor — Environment + registry health checks
async function doctorCommand(flags: Flags) {
  const paths = getRegistryPaths();
  const status = getRegistryStatus(paths.cachePath, paths.metaPath);
  const config = loadConfig();
  const skills = config.skills ?? {};
  const personalDir = skills.personalDir ?? join(homedir(), ".config", "claude", "skills");
  const projectDir = skills.projectDir ?? join(process.cwd(), ".claude", "skills");
  const checks = [
    { name: "Registry cache", ok: status.cachePresent },
    { name: "Registry version", ok: status.version !== "none" },
    { name: "Skills dir (personal)", ok: existsSync(personalDir) },
    { name: "Skills dir (project)", ok: existsSync(projectDir) },
  ];

  if (flags.json) {
    printJson({ checks, registry: status }, flags);
    return;
  }

  console.log(chalk.bold("Doctor Report"));
  for (const check of checks) {
    console.log(`${check.ok ? "✓" : "✗"} ${check.name}`);
  }
}

// jfp serve — MCP server mode
async function serveCommand() {
  await startMcpServer();
}

// jfp export — Export prompt as SKILL.md or markdown
async function exportCommand(ids: string[], flags: Flags) {
  const format = flags.format ?? "skill";  // "skill" or "md"
  const all = flags.all;

  const registry = await loadRegistry();
  const toExport = all
    ? registry
    : registry.filter((p) => ids.includes(p.id));

  if (toExport.length === 0) {
    console.error(chalk.red("No matching prompts found."));
    console.error(chalk.dim(`Available: ${registry.map((p) => p.id).join(", ")}`));
    process.exit(1);
  }

  for (const prompt of toExport) {
    const filename = format === "skill"
      ? `${prompt.id}-SKILL.md`
      : `${prompt.id}.md`;

    const content = format === "skill"
      ? generateSkillMd(prompt)
      : generatePromptMarkdown(prompt);

    await Bun.write(filename, content);
    console.log(chalk.green(`✓ Exported ${filename}`));
  }
}

// Generate markdown export
function generateMarkdown(prompt: Prompt): string {
  return generatePromptMarkdown(prompt);
}

// jfp i — Interactive fzf-style browser
// See Part 6.3 for the full implementation using @inquirer/prompts
async function interactiveCommand() {
  // Full implementation: call interactiveMode() from Part 6.3
  // This stub is shown here for completeness; the real function uses:
  // - @inquirer/prompts for search UI
  // - BM25 search engine for ranking
  // - copyToClipboard, showPrompt, installSkill helpers
  await interactiveMode();
}

// jfp help — Full documentation
function showHelp() {
  console.log(`jfp — Jeffrey's Prompts CLI

USAGE:
  jfp <command> [options]

COMMANDS:
  list                    List all prompts
    --category <cat>      Filter by category
    --tag <tag>           Filter by tag
    --featured            Only featured prompts
    --json                Output as JSON
    --pretty              Pretty-print JSON

  search <query>          BM25 search prompts
    --json                Output as JSON

  suggest <task>          Suggest prompts for a task
    --limit <n>           Number of suggestions (default: 3)
    --semantic            Enable semantic rerank (optional)
    --json                Output as JSON

  show <id>               Show full prompt details
    --raw                 Output just the prompt text
    --json                Output as JSON

  copy <id>               Copy prompt to clipboard
    --fill                Prompt for missing variables

  render <id>             Render prompt with variables
    --VAR=value           Provide variables
    --context <path>      Append file contents
    --stdin               Read context from stdin

  export <id>...          Export prompts to files (NEW)
    --format <fmt>        "skill" (default) or "md"
    --all                 Export all prompts

  install <id>...         Install as Claude Code skills
    --all                 Install all prompts
    --project             Install to .claude/skills (project-local)
    --force               Overwrite existing skills

  skill install <id>...   Alias for install (explicit namespace)
  skill update            Alias for update
  skill uninstall <id>... Alias for uninstall
  skill installed         Alias for installed

  uninstall <id>...       Remove installed skills
    --all                 Remove all installed skills
    --project             Remove from .claude/skills
    --confirm             Required in non-interactive contexts

  installed               List installed skills
    --json                Output as JSON

  update                  Update all installed skills
    --dry-run             Show changes without writing
    --diff                Show unified diff (dry-run only)

  registry status         Show registry cache status
  registry refresh        Refresh cached registry
  update-cli              Self-update the CLI (opt-in)

  doctor                  Environment + registry health checks

  bundles                 List prompt bundles (NEW)
    --json                Output as JSON

  bundle show <id>        Show bundle details (NEW)
    --json                Output as JSON

  categories              List all categories (NEW)
    --json                Output as JSON

  tags                    List all tags with counts (NEW)
    --json                Output as JSON

  open <id>               Open prompt permalink in browser

  serve                   Start MCP server over stdio

  completion              Print shell completion script
    --shell <name>        bash|zsh|fish

  about                   About + ecosystem info (NEW)

  i, interactive          Interactive browser (fzf-style)

  help                    Show this help message

GLOBAL OPTIONS:
  --json                  Output as JSON (auto-enabled when piped)
  --pretty                Pretty-print JSON (human-friendly)
  --version, -v           Show version

EXAMPLES:
  jfp list --category ideation
  jfp search "brainstorm"
  jfp suggest "update docs after changes"
  jfp render idea-wizard --PROJECT_NAME=Acme
  jfp open idea-wizard
  jfp show idea-wizard --raw | pbcopy
  jfp export idea-wizard --format md
  jfp install --all
  jfp bundles
  results=$(jfp search "idea" --json)

DOCS: https://jeffreysprompts.com
`);
}

// jfp install — Install skills
async function installCommand(args: string[], flags: Flags) {
  const skillIds = args;
  const all = flags.all;
  const project = flags.project;  // Install to .claude/skills instead of $HOME/.config
  const force = flags.force;      // Overwrite existing

  const config = loadConfig();
  const skills = config.skills ?? {};
  const personalDir = skills.personalDir ?? join(homedir(), ".config", "claude", "skills");
  const projectDir = skills.projectDir ?? join(process.cwd(), ".claude", "skills");
  const targetDir = project ? projectDir : personalDir;

  // Ensure target directory exists
  mkdirSync(targetDir, { recursive: true });

  const registry = await loadRegistry();
  const toInstall = all
    ? registry
    : registry.filter((p) => skillIds.includes(p.id));
  const installed: Prompt[] = [];

  if (toInstall.length === 0) {
    console.error(chalk.red("No matching prompts found."));
    console.error(chalk.dim(`Available: ${registry.map((p) => p.id).join(", ")}`));
    process.exit(1);
  }

  for (const prompt of toInstall) {
    const skillDir = join(targetDir, prompt.id);
    const skillPath = join(skillDir, "SKILL.md");

    if (existsSync(skillPath) && !force) {
      console.log(chalk.yellow(`⏭  ${prompt.id} (already installed, use --force to overwrite)`));
      continue;
    }

    mkdirSync(skillDir, { recursive: true });
    writeFileSync(skillPath, generateSkillMd(prompt));
    console.log(chalk.green(`✓  ${prompt.title} → ${skillDir}`));
    installed.push(prompt);
  }

  updateSkillsManifest(targetDir, installed);
  console.log();
  console.log(chalk.cyan("Restart Claude Code to load the new skills."));
}

// jfp uninstall — Remove skills
async function uninstallCommand(args: string[], flags: Flags) {
  const skillIds = args;
  const all = flags.all;
  const project = flags.project;

  const config = loadConfig();
  const skills = config.skills ?? {};
  const personalDir = skills.personalDir ?? join(homedir(), ".config", "claude", "skills");
  const projectDir = skills.projectDir ?? join(process.cwd(), ".claude", "skills");
  const targetDir = project ? projectDir : personalDir;

  const registry = await loadRegistry();
  const toRemove = all
    ? registry.map((p) => p.id)
    : skillIds;

  if (!flags.confirm) {
    const ok = await confirm({ message: `Remove ${toRemove.length} skill(s)?` });
    if (!ok) return;
  }

  for (const skillId of toRemove) {
    const skillDir = join(targetDir, skillId);
    if (existsSync(skillDir)) {
      rmSync(skillDir, { recursive: true });
      console.log(chalk.red(`✗  Removed ${skillId}`));
    } else {
      console.log(chalk.dim(`⏭  ${skillId} (not installed)`));
    }
  }

  updateSkillsManifest(targetDir, [], toRemove);
}

// jfp installed — List installed skills
async function installedCommand(flags: Flags) {
  const config = loadConfig();
  const skills = config.skills ?? {};
  const personalDir = skills.personalDir ?? join(homedir(), ".config", "claude", "skills");
  const projectDir = skills.projectDir ?? join(process.cwd(), ".claude", "skills");

  const installed: { id: string; location: "personal" | "project" }[] = [];
  const registry = await loadRegistry();

  for (const prompt of registry) {
    if (existsSync(join(personalDir, prompt.id, "SKILL.md"))) {
      installed.push({ id: prompt.id, location: "personal" });
    }
    if (existsSync(join(projectDir, prompt.id, "SKILL.md"))) {
      installed.push({ id: prompt.id, location: "project" });
    }
  }

  if (flags.json) {
    printJson({ installed }, flags);
    return;
  }

  if (installed.length === 0) {
    console.log(chalk.dim("No Jeffrey's Prompts skills installed."));
    console.log(chalk.dim(`Run: jfp install --all`));
    return;
  }

  console.log(chalk.bold("Installed Skills:"));
  console.log();
  for (const { id, location } of installed) {
    const prompt = findPrompt(registry, id);
    const badge = location === "personal"
      ? chalk.blue("personal")
      : chalk.green("project");
    console.log(`  ${chalk.cyan(id)} [${badge}]`);
    if (prompt) {
      console.log(chalk.dim(`    ${prompt.description}`));
    }
  }
}

// jfp update — Update all installed skills
function extractSkillVersion(content: string): string {
  const match = content.match(/^version:\\s*(.+)$/m);
  return match?.[1]?.replace(/\"/g, "") ?? "unknown";
}

function renderUnifiedDiff(before: string, after: string, opts: { maxLines: number }) {
  // Use a small diff library (e.g., "diff") or generate a minimal unified diff; truncate to opts.maxLines.
  return diffAsText(before, after).split("\n").slice(0, opts.maxLines).join("\n");
}

function readSkillsManifest(skillsDir: string) {
  const path = join(skillsDir, "manifest.json");
  if (!existsSync(path)) return new Map<string, SkillsManifestEntry>();
  const data = JSON.parse(readFileSync(path, "utf-8"));
  return new Map((data.entries ?? []).map((e: SkillsManifestEntry) => [e.promptId, e]));
}

async function updateCommand(flags: Flags) {
  // Re-install all installed skills with --force
  const config = loadConfig();
  const skills = config.skills ?? {};
  const personalDir = skills.personalDir ?? join(homedir(), ".config", "claude", "skills");
  const projectDir = skills.projectDir ?? join(process.cwd(), ".claude", "skills");

  let updated = 0;
  const updatedPersonal: Prompt[] = [];
  const updatedProject: Prompt[] = [];
  const registry = await loadRegistry();
  const personalManifest = readSkillsManifest(personalDir);
  const projectManifest = readSkillsManifest(projectDir);

  for (const prompt of registry) {
    const personalPath = join(personalDir, prompt.id, "SKILL.md");
    const projectPath = join(projectDir, prompt.id, "SKILL.md");
    const nextSkill = generateSkillMd(prompt);
    const nextHash = hashContent(nextSkill);

    if (existsSync(personalPath)) {
      const existing = readFileSync(personalPath, "utf-8");
      const existingHash = hashContent(existing);
      const entry = personalManifest.get(prompt.id);
      const isGenerated = existing.includes("x_jfp_generated: true");
      const isModified = entry?.hash && entry.hash !== existingHash;
      if (!isGenerated && !flags.force) {
        console.log(chalk.yellow(`⏭  Skipping ${prompt.id} (modified; use --force to overwrite)`));
      } else if (isModified && !flags.force) {
        console.log(chalk.yellow(`⏭  Skipping ${prompt.id} (local edits detected; use --force)`));
      } else if (existingHash === nextHash && !flags.force) {
        continue;
      } else if (flags.dryRun) {
        const currentVersion = extractSkillVersion(existing);
        const nextVersion = prompt.version;
        const note = prompt.changelog?.[0]?.summary;
        console.log(chalk.cyan(`• Would update ${prompt.id} ${currentVersion} → ${nextVersion} (personal)`));
        if (note) console.log(chalk.dim(`  - ${note}`));
        if (flags.diff) {
          console.log(renderUnifiedDiff(existing, nextSkill, { maxLines: 200 }));
        }
        updated++;
      } else {
        const tmp = `${personalPath}.tmp`;
        writeFileSync(tmp, nextSkill);
        renameSync(tmp, personalPath);
        console.log(chalk.green(`✓  Updated ${prompt.id} (personal)`));
        updated++;
        updatedPersonal.push(prompt);
      }
    }
    if (existsSync(projectPath)) {
      const existing = readFileSync(projectPath, "utf-8");
      const existingHash = hashContent(existing);
      const entry = projectManifest.get(prompt.id);
      const isGenerated = existing.includes("x_jfp_generated: true");
      const isModified = entry?.hash && entry.hash !== existingHash;
      if (!isGenerated && !flags.force) {
        console.log(chalk.yellow(`⏭  Skipping ${prompt.id} (modified; use --force to overwrite)`));
      } else if (isModified && !flags.force) {
        console.log(chalk.yellow(`⏭  Skipping ${prompt.id} (local edits detected; use --force)`));
      } else if (existingHash === nextHash && !flags.force) {
        continue;
      } else if (flags.dryRun) {
        const currentVersion = extractSkillVersion(existing);
        const nextVersion = prompt.version;
        const note = prompt.changelog?.[0]?.summary;
        console.log(chalk.cyan(`• Would update ${prompt.id} ${currentVersion} → ${nextVersion} (project)`));
        if (note) console.log(chalk.dim(`  - ${note}`));
        if (flags.diff) {
          console.log(renderUnifiedDiff(existing, nextSkill, { maxLines: 200 }));
        }
        updated++;
      } else {
        const tmp = `${projectPath}.tmp`;
        writeFileSync(tmp, nextSkill);
        renameSync(tmp, projectPath);
        console.log(chalk.green(`✓  Updated ${prompt.id} (project)`));
        updated++;
        updatedProject.push(prompt);
      }
    }
  }

  if (updated === 0) {
    console.log(chalk.dim("No installed skills to update."));
  } else {
    console.log();
    console.log(chalk.cyan(`Updated ${updated} skill(s). Restart Claude Code to reload.`));
  }

  if (!flags.dryRun) {
    updateSkillsManifest(personalDir, updatedPersonal);
    updateSkillsManifest(projectDir, updatedProject);
  }
}

// jfp update-cli — Self-update the CLI binary (opt-in)
async function updateCliCommand(flags: Flags) {
  // 1) Resolve platform/arch → release artifact name
  const { binary, url, shaUrl } = resolveReleaseTarget();

  // 2) Download binary + SHA256SUMS to temp dir
  const tmpDir = mkdtempSync(join(tmpdir(), "jfp-update-"));
  const binPath = join(tmpDir, binary);
  await downloadFile(url, binPath);
  const sumsPath = join(tmpDir, "SHA256SUMS.txt");
  await downloadFile(shaUrl, sumsPath);

  // 3) Verify checksum (fail closed)
  verifyChecksum(binPath, sumsPath, binary);

  // 4) Atomically replace current binary
  const installPath = resolveExecutablePath(); // e.g., process.execPath
  const nextPath = `${installPath}.new`;
  const backupPath = `${installPath}.bak`;
  renameSync(binPath, nextPath);
  renameSync(installPath, backupPath);
  renameSync(nextPath, installPath);
  // If the new binary fails to execute, restore backupPath → installPath.

  if (flags.json) {
    printJson({ updated: true, path: installPath }, flags);
    return;
  }
  console.log(chalk.green(`✓ Updated jfp at ${installPath}`));
}

// jfp categories — List all categories
async function categoriesCommand(flags: Flags) {
  const registry = await loadRegistry();
  const categories = [...new Set(registry.map((p) => p.category))].sort();

  if (flags.json) {
    printJson({
      count: categories.length,
      categories: categories.map((c) => ({
        name: c,
        count: registry.filter((p) => p.category === c).length,
      })),
    }, flags);
    return;
  }

  console.log(chalk.bold("Categories:\n"));
  for (const category of categories) {
    const count = registry.filter((p) => p.category === category).length;
    console.log(`  ${chalk.cyan(category.padEnd(20))} ${chalk.dim(`(${count} prompts)`)}`);
  }
}

// jfp tags — List all tags with counts
async function tagsCommand(flags: Flags) {
  const registry = await loadRegistry();
  const tagCounts = new Map<string, number>();
  for (const prompt of registry) {
    for (const tag of prompt.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);

  if (flags.json) {
    printJson({
      count: sortedTags.length,
      tags: sortedTags.map(([tag, count]) => ({ tag, count })),
    }, flags);
    return;
  }

  console.log(chalk.bold("Tags (by usage):\n"));
  for (const [tag, count] of sortedTags) {
    console.log(`  ${chalk.cyan(tag.padEnd(25))} ${chalk.dim(`(${count})`)}`);
  }
}

// jfp bundles — List all bundles
async function bundlesCommand(flags: Flags) {
  // Import bundles from the bundles module
  const { bundles } = await import("@jeffreysprompts/core/prompts");

  if (flags.json) {
    printJson({
      count: bundles.length,
      bundles: bundles.map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        promptCount: b.promptIds.length,
      })),
    }, flags);
    return;
  }

  console.log(chalk.bold("Bundles:\n"));
  for (const bundle of bundles) {
    console.log(`  ${chalk.cyan(bundle.id.padEnd(25))} ${bundle.title}`);
    console.log(`  ${" ".repeat(25)} ${chalk.dim(`${bundle.promptIds.length} prompts`)}`);
    console.log();
  }
  console.log(chalk.dim(`Use 'jfp bundle show <id>' for details.`));
}

// jfp bundle show <id> — Show bundle details
async function bundleShowCommand(id: string, flags: Flags) {
  if (!id) {
    console.error(chalk.red("Usage: jfp bundle show <bundle-id>"));
    process.exit(2);
  }

  const { getBundle, bundles } = await import("@jeffreysprompts/core/prompts");
  const bundle = getBundle(id);

  if (!bundle) {
    console.error(chalk.red(`Bundle not found: ${id}`));
    console.error(chalk.dim(`Available: ${bundles.map((b) => b.id).join(", ")}`));
    process.exit(1);
  }

  if (flags.json) {
    printJson(bundle, flags);
    return;
  }

  console.log(chalk.bold(`# ${bundle.title}\n`));
  console.log(bundle.description);
  console.log();
  console.log(chalk.bold("Prompts:"));
  for (const promptId of bundle.promptIds) {
    const prompt = getPrompt(promptId);
    console.log(`  - ${chalk.cyan(promptId)}: ${prompt?.title ?? "Unknown"}`);
  }
  console.log();
  console.log(chalk.bold("Workflow:"));
  console.log(bundle.workflow);
  console.log();
  console.log(chalk.dim(`Install: jfp install ${bundle.promptIds.join(" ")}`));
}

// Quick-start help (no args) — simple version (full version in Part 6.2)
function showQuickStartSimple() {
  console.log(`jfp — Jeffrey's Prompts CLI

QUICK START:
  jfp list                    List all prompts
  jfp search "idea"           BM25 search
  jfp suggest "update docs"   Suggest prompts for a task
  jfp show idea-wizard        View full prompt
  jfp install idea-wizard     Install as Claude Code skill

ADD --json TO ANY COMMAND FOR MACHINE-READABLE OUTPUT

EXPLORE:
  jfp i                       Interactive browser (fzf-style)
  jfp bundles                 Curated prompt collections
  jfp about                   Ecosystem info

MORE: jfp help | Docs: jeffreysprompts.com`);
}

// Command registration (cac)
cli.command("", "quick start").action(showQuickStart); // see Part 6.2

cli.command("list", "list all prompts")
  .option("--category <cat>", "filter by category")
  .option("--tag <tag>", "filter by tag")
  .option("--featured", "only featured prompts")
  .action((opts) => listCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("search <query>", "search prompts")
  .option("--limit <n>", "limit results", { default: 20 })
  .action((query, opts) => searchCommand(query, { ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("suggest <task>", "suggest prompts for a task")
  .option("--limit <n>", "limit results", { default: 3 })
  .option("--semantic", "enable semantic rerank", { default: false })
  .action((task, opts) => suggestCommand(task, { ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("show <id>", "show a prompt")
  .option("--raw", "print raw prompt text")
  .action((id, opts) => showCommand(id, { ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("copy <id>", "copy prompt to clipboard")
  .option("--fill", "prompt for missing variables")
  .allowUnknownOptions()
  .action((id, opts) => copyCommand(id, {
    ...opts,
    vars: parseVarFlags(cli.rawArgs),
    json: cli.options.json,
    pretty: cli.options.pretty,
  }));

cli.command("render <id>", "render a prompt with variables")
  .option("--context <path>", "append file contents")
  .option("--stdin", "read context from stdin")
  .option("--max-context <bytes>", "max context size", { default: 200000 })
  .allowUnknownOptions()
  .action((id, opts) => renderCommand(id, {
    ...opts,
    vars: parseVarFlags(cli.rawArgs),
    json: cli.options.json,
    pretty: cli.options.pretty,
  }));

cli.command("export <id...>", "export prompts")
  .option("--format <format>", "skill|md", { default: "skill" })
  .option("--all", "export all prompts")
  .action((ids, opts) => exportCommand(ids, { ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("install <id...>", "install skills")
  .option("--all", "install all prompts")
  .option("--project", "install to .claude/skills")
  .option("--force", "overwrite existing")
  .action((ids, opts) => installCommand(ids, { ...opts, json: cli.options.json, pretty: cli.options.pretty }));

// Explicit namespace aliases
cli.command("skill install <id...>", "install skills (alias)")
  .option("--all", "install all prompts")
  .option("--project", "install to .claude/skills")
  .option("--force", "overwrite existing")
  .action((ids, opts) => installCommand(ids, { ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("uninstall <id...>", "remove installed skills")
  .option("--all", "remove all skills")
  .option("--project", "remove from .claude/skills")
  .option("--confirm", "confirm destructive uninstall")
  .action((ids, opts) => uninstallCommand(ids, { ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("skill uninstall <id...>", "remove installed skills (alias)")
  .option("--all", "remove all skills")
  .option("--project", "remove from .claude/skills")
  .option("--confirm", "confirm destructive uninstall")
  .action((ids, opts) => uninstallCommand(ids, { ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("installed", "list installed skills")
  .action((opts) => installedCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("skill installed", "list installed skills (alias)")
  .action((opts) => installedCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("update", "update installed skills")
  .option("--force", "overwrite modified skills")
  .option("--dry-run", "show updates without writing")
  .option("--diff", "show unified diff in dry-run mode")
  .action((opts) => updateCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("skill update", "update installed skills (alias)")
  .option("--force", "overwrite modified skills")
  .option("--dry-run", "show updates without writing")
  .option("--diff", "show unified diff in dry-run mode")
  .action((opts) => updateCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("update-cli", "self-update the CLI")
  .action((opts) => updateCliCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("categories", "list categories")
  .action((opts) => categoriesCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("tags", "list tags")
  .action((opts) => tagsCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("bundles", "list bundles")
  .action((opts) => bundlesCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("bundle show <id>", "show bundle details")
  .action((id, opts) => bundleShowCommand(id, { ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("registry status", "show registry cache status")
  .action((opts) => registryStatusCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("registry refresh", "refresh registry cache")
  .action((opts) => registryRefreshCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("doctor", "run environment and registry health checks")
  .action((opts) => doctorCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("open <id>", "open prompt permalink in browser")
  .action((id, opts) => openCommand(id, { ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("serve", "start MCP server over stdio")
  .action((opts) => serveCommand({ ...opts, json: cli.options.json, pretty: cli.options.pretty }));

cli.command("about", "about the ecosystem").action(showAbout);

cli.command("i", "interactive mode").action(interactiveCommand);
cli.command("interactive", "interactive mode").action(interactiveCommand);

cli.command("completion", "print shell completions")
  .option("--shell <name>", "bash|zsh|fish", { default: "bash" })
  .action((opts) => printCompletion(opts.shell));

cli.command("help", "show help").action(showHelp);
cli.version(VERSION);

cli.parse();
```

### 3.4 Web App Skills Integration

**One-click install button:**

```tsx
// apps/web/src/components/install-skill-button.tsx

"use client";

import { useState } from "react";
import { Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { type Prompt } from "@jeffreysprompts/core/prompts";
import { generateSkillMd } from "@jeffreysprompts/core/export/skills";

interface InstallSkillButtonProps {
  prompt: Prompt;
}

export function InstallSkillButton({ prompt }: InstallSkillButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleInstall = async () => {
    // Generate the shell command (using quoted HEREDOC, no escaping needed)
    const skillContent = generateSkillMd(prompt);

    const command = `mkdir -p "$HOME/.config/claude/skills/${prompt.id}" && cat > "$HOME/.config/claude/skills/${prompt.id}/SKILL.md" << 'EOF'
${skillContent}
EOF
echo "✓ Installed ${prompt.id}. Restart Claude Code to load."`;

    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast.success(
      "Installation command copied!",
      "Paste in your terminal to install this skill."
    );
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstall}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="size-4" />
          Copied!
        </>
      ) : (
        <>
          <Download className="size-4" />
          Install as Skill
        </>
      )}
    </Button>
  );
}
```

**Bulk install all skills:**

```tsx
// apps/web/src/components/install-all-button.tsx

"use client";

import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function InstallAllSkillsButton() {
  const handleInstall = async () => {
    const command = `curl -fsSL https://jeffreysprompts.com/install.sh | bash`;
    await navigator.clipboard.writeText(command);
    toast.success(
      "Installation command copied!",
      "Paste in your terminal to install all skills."
    );
  };

  return (
    <Button onClick={handleInstall} className="gap-2">
      <Terminal className="size-4" />
      Install All Skills
    </Button>
  );
}
```

**API endpoint for prompts (JSON):**

```typescript
// apps/web/src/app/api/prompts/route.ts

import { buildRegistryPayload } from "@jeffreysprompts/core/export/json";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const featured = searchParams.get("featured");

  const base = buildRegistryPayload();
  let filteredPrompts = base.prompts;

  if (category) {
    filteredPrompts = filteredPrompts.filter((p) => p.category === category);
  }

  if (tag) {
    filteredPrompts = filteredPrompts.filter((p) => p.tags.includes(tag));
  }

  if (featured === "true") {
    filteredPrompts = filteredPrompts.filter((p) => p.featured);
  }

  const payload = {
    ...base,
    prompts: filteredPrompts,
    meta: {
      ...base.meta,
      promptCount: filteredPrompts.length,
    },
  };

  const etag = `"${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return NextResponse.json(payload, {
    headers: {
      ETag: etag,
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
```

Note:
- `/api/prompts` is the canonical, cacheable registry endpoint (unfiltered = full payload).
- `/registry.json` is a static snapshot for CDN/offline/CLI use and integrity checks.
- `/api/prompts` supports filtering (`?category=...&tag=...`) for web UI.
- Unfiltered `/api/prompts` should match `/registry.json` byte-for-byte (enables checksum verification).

**API endpoint for single skill (SKILL.md):**

```typescript
// apps/web/src/app/api/skills/[id]/route.ts

import { getPrompt } from "@jeffreysprompts/core/prompts";
import { generateSkillMd } from "@jeffreysprompts/core/export/skills";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const prompt = getPrompt(id);

  if (!prompt) {
    return NextResponse.json(
      { error: "prompt_not_found", message: `No prompt with id '${id}'` },
      { status: 404 }
    );
  }

  const skillMd = generateSkillMd(prompt);

  return new Response(skillMd, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${id}-SKILL.md"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

**Embeddings (semantic search):**
- Prefer serving a static asset at `/embeddings.json` (generated at build time).
- Avoid an `/api/embeddings` route to keep caching simple and fast.

**API endpoint for install script:**

```typescript
// apps/web/src/app/install.sh/route.ts

import { prompts } from "@jeffreysprompts/core/prompts";
import { generateInstallScript } from "@jeffreysprompts/core/export/skills";

export async function GET() {
  const script = generateInstallScript(prompts);

  return new Response(script, {
    headers: {
      "Content-Type": "text/x-shellscript",
      "Content-Disposition": 'attachment; filename="install-jeffrey-prompts.sh"',
    },
  });
}
```

**API endpoint for CLI installer script:**

```typescript
// apps/web/src/app/install-cli.sh/route.ts

import { NextResponse } from "next/server";

const RELEASES_BASE = "https://github.com/Dicklesworthstone/jeffreysprompts.com/releases/latest/download";

export async function GET() {
  const script = `#!/usr/bin/env bash
# JeffreysPrompts CLI Installer
# Usage: curl -fsSL https://jeffreysprompts.com/install-cli.sh | bash

set -euo pipefail
IFS=$'\n\t'

echo "Installing jfp CLI..."

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "\$OS" in
  Linux)  PLATFORM="linux" ;;
  Darwin) PLATFORM="darwin" ;;
  *)      echo "Unsupported OS: \$OS"; exit 1 ;;
esac

case "\$ARCH" in
  x86_64)  ARCH="x64" ;;
  aarch64) ARCH="arm64" ;;
  arm64)   ARCH="arm64" ;;
  *)       echo "Unsupported architecture: \$ARCH"; exit 1 ;;
esac

BINARY="jfp-\$PLATFORM-\$ARCH"
URL="${RELEASES_BASE}/\$BINARY"
SHA_URL="${RELEASES_BASE}/SHA256SUMS.txt"

if [ -d "\$HOME/.local/bin" ]; then
  INSTALL_DIR="\$HOME/.local/bin"
elif [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR="\$HOME/.local/bin"
  mkdir -p "\$INSTALL_DIR"
fi

INSTALL_PATH="\${INSTALL_DIR}/jfp"

if [ -x "\$INSTALL_PATH" ]; then
  echo "jfp already installed at \$INSTALL_PATH"
  echo "Refusing to overwrite. Remove it manually if you want to reinstall."
  exit 1
fi

TMP_DIR="\$(mktemp -d)"
# Note: cleanup can be done manually if desired (avoid destructive commands in docs).

curl -fsSL "\$URL" -o "\$TMP_DIR/\$BINARY"
curl -fsSL "\$SHA_URL" -o "\$TMP_DIR/SHA256SUMS.txt"

if command -v sha256sum >/dev/null 2>&1; then
  (cd "\$TMP_DIR" && grep " \$BINARY\$" SHA256SUMS.txt | sha256sum -c -)
elif command -v shasum >/dev/null 2>&1; then
  (cd "\$TMP_DIR" && grep " \$BINARY\$" SHA256SUMS.txt | shasum -a 256 -c -)
else
  echo "No SHA256 tool found (sha256sum or shasum)."
  echo "Please install one or verify checksums manually."
  exit 1
fi

chmod +x "\$TMP_DIR/\$BINARY"
mv "\$TMP_DIR/\$BINARY" "\$INSTALL_PATH"

echo ""
echo "✓ jfp installed to \$INSTALL_PATH"
echo ""
echo "Quick start:"
echo "  jfp list              # List all prompts"
echo "  jfp search \\"idea\\"    # BM25 search"
echo "  jfp install --all    # Install as Claude Code skills"
echo ""

# Check if in PATH
if ! command -v jfp &> /dev/null; then
  echo "Note: Add \$INSTALL_DIR to your PATH:"
  echo "  export PATH=\\"\$INSTALL_DIR:\\\$PATH\\""
fi
`;

  return new Response(script, {
    headers: {
      "Content-Type": "text/x-shellscript",
      "Content-Disposition": 'attachment; filename="install-jfp.sh"',
    },
  });
}
```

**CLI binary release strategy:**

CLI binaries are distributed via GitHub Releases. The build process creates binaries for:
- `jfp-linux-x64` — Linux x86_64
- `jfp-linux-arm64` — Linux ARM64
- `jfp-darwin-x64` — macOS Intel
- `jfp-darwin-arm64` — macOS Apple Silicon
- `jfp-windows-x64.exe` — Windows x86_64

```bash
# Build script for releases (scripts/build-releases.sh)
#!/usr/bin/env bash
set -e

VERSION=${1:-"dev"}
OUTDIR="dist/releases"
mkdir -p "$OUTDIR"

# Build for each target
for target in bun-linux-x64 bun-linux-arm64 bun-darwin-x64 bun-darwin-arm64 bun-windows-x64; do
  platform=${target#bun-}
  outfile="$OUTDIR/jfp-$platform"
  [[ "$target" == *windows* ]] && outfile="$outfile.exe"

  echo "Building $outfile..."
  bun build --compile --target=$target ./jfp.ts --outfile "$outfile"
done

echo "Done! Binaries in $OUTDIR"
```

The `/releases/` URLs in the README point to GitHub Releases, not the web app itself.

---

## Part 4: Claude Skill for Formatting New Prompts

Create a skill that helps Jeffrey format new prompts:

### 4.1 The prompt-formatter Skill

```yaml
# .claude/skills/prompt-formatter/SKILL.md
---
name: prompt-formatter
description: Convert raw prompt text into the JeffreysPrompts.com TypeScript format with all required fields
---

# Prompt Formatter

You are helping Jeffrey Emanuel add a new prompt to JeffreysPrompts.com.

Given a raw prompt text and optional title, generate the complete TypeScript prompt entry for the registry.

## Input Format

The user will provide:
1. A title (or you'll suggest one)
2. The raw prompt text
3. Optionally, category and tags

## Output Format

Generate a TypeScript object that fits this interface:

```typescript
{
  id: string,           // kebab-case slug derived from title
  title: string,        // The title
  description: string,  // One-line summary (max 100 chars)
  category: PromptCategory,
  tags: string[],       // 3-5 relevant tags
  author: "Jeffrey Emanuel",
  twitter: "@doodlestein",
  version: "1.0.0",
  featured: boolean,    // true if this is a particularly good one
  difficulty: PromptDifficulty,
  estimatedTokens: number,
  created: string,      // Today's date in ISO format
  content: string,      // The prompt text (use backticks)
  whenToUse: string[],  // 3-4 scenarios
  tips: string[],       // 2-3 practical tips
}
```

## Categories

- "ideation" — Brainstorming, creativity, idea generation
- "documentation" — READMEs, docs, comments, explanations
- "automation" — Robot mode, CLI, agent optimization
- "refactoring" — Code improvement, cleanup, architecture
- "testing" — Test generation, coverage, quality
- "debugging" — Bug finding, fixing, analysis
- "workflow" — Process improvement, productivity
- "communication" — Writing, feedback, reviews

## Example

Input:
> Title: The Bug Hunter
> Prompt: Find all the bugs in this codebase. Look for edge cases, off-by-one errors, null pointer issues, race conditions, etc. For each bug found, explain the issue, its severity, and how to fix it.

Output:
```typescript
{
  id: "bug-hunter",
  title: "The Bug Hunter",
  description: "Systematically find bugs including edge cases, null pointers, and race conditions",
  category: "debugging",
  tags: ["bugs", "edge-cases", "code-review", "quality"],
  author: "Jeffrey Emanuel",
  twitter: "@doodlestein",
  version: "1.0.0",
  featured: false,
  difficulty: "intermediate",
  estimatedTokens: 200,
  created: "2025-01-09",
  content: `Find all the bugs in this codebase. Look for edge cases, off-by-one errors, null pointer issues, race conditions, etc. For each bug found, explain the issue, its severity, and how to fix it.`,
  whenToUse: [
    "Before deploying to production",
    "After major refactoring",
    "During code review",
    "When debugging mysterious failures",
  ],
  tips: [
    "Run on individual files for more focused analysis",
    "Combine with test generation for comprehensive coverage",
    "Prioritize fixes by severity",
  ],
},
```

## Guidelines

1. Always use backtick template literals for multi-line content
2. Keep description under 100 characters
3. Include 3-5 relevant, searchable tags
4. Estimate tokens based on prompt length (~1 token per 4 chars)
5. Set difficulty based on prompt complexity
6. When unsure about category, prefer "workflow" as a catch-all
```

### 4.2 The skill-maker Meta-Skill (Prompts → SKILL.md)

This is the **meta-skill** — a Claude Code skill that creates other Claude Code skills from prompts. It's beautifully recursive: using a skill to make skills.

**Why this exists:**
- The `prompt-formatter` skill (4.1) converts raw text → TypeScript registry entries
- The `skill-maker` skill converts prompts → Claude Code SKILL.md files
- It can bundle multiple related prompts into a single cohesive skill
- It handles all the SKILL.md formatting, "When to Use" generation, and structure

```yaml
# .claude/skills/skill-maker/SKILL.md
---
name: skill-maker
description: Generate Claude Code SKILL.md files from prompts. Can bundle multiple related prompts into a single skill.
---

# Skill Maker

You are creating Claude Code skills from prompts in the JeffreysPrompts.com registry.

## What You Do

1. Take one or more prompts (by ID or raw text)
2. Generate a properly formatted SKILL.md file
3. Optionally bundle multiple related prompts into one cohesive skill
4. Handle all the structure: frontmatter, sections, "When to Use", tips

## Single Prompt → Single Skill

When given a single prompt ID like `idea-wizard`:

1. Look up the prompt in the registry (`packages/core/src/prompts/registry.ts`)
2. Generate a SKILL.md with:
   - Proper YAML frontmatter (name, description)
   - The prompt content as the main body
   - "When to Use" section from the prompt's `whenToUse` field
   - "Tips" section from the prompt's `tips` field
   - Attribution footer linking to jeffreysprompts.com

## Multiple Prompts → Bundle Skill

When given multiple prompt IDs like `idea-wizard readme-reviser robot-mode-maker`:

1. Look up all prompts in the registry
2. Analyze their common themes to generate a bundle name
3. Generate a SKILL.md that:
   - Has a cohesive name and description covering all included prompts
   - Includes all prompt contents, clearly separated
   - Combines "When to Use" scenarios from all prompts
   - Adds a "Included Prompts" section listing what's bundled

## Output Format

For single prompt `idea-wizard`:

```markdown
---
name: idea-wizard
description: Generate 30 improvement ideas, rigorously evaluate, distill to the best 5
---

# The Idea Wizard

Come up with your very best ideas for improving this project...

## When to Use

- When starting a new feature and want to brainstorm approaches
- When a project feels stale and needs fresh ideas
- When preparing for a planning session
- When you want to systematically evaluate improvements

## Tips

- Be specific about what aspects you want to improve
- Run multiple times for different focus areas
- Use the output as a starting point, not a final plan

---

*From [JeffreysPrompts.com](https://jeffreysprompts.com/prompts/idea-wizard) by Jeffrey Emanuel*
```

For bundled prompts `idea-wizard readme-reviser robot-mode-maker --bundle jeffrey-meta-prompts`:

```markdown
---
name: jeffrey-meta-prompts
description: Jeffrey's three essential meta-prompts for ideation, documentation, and agent tooling
---

# Jeffrey's Meta-Prompts Bundle

This skill bundles three complementary prompts that work together to improve any project.

## Included Prompts

1. **The Idea Wizard** — Generate and evaluate improvement ideas
2. **The README Reviser** — Update documentation for undocumented features
3. **The Robot-Mode Maker** — Create agent-optimized CLI interfaces

---

## 1. The Idea Wizard

Come up with your very best ideas for improving this project to make it more robust, reliable, performant, intuitive, user-friendly, ergonomic, useful, compelling, etc. while still being obviously accretive and pragmatic. Come up with 30 ideas and then really think through each idea carefully...

---

## 2. The README Reviser

OK, we have made tons of recent changes that aren't yet reflected in the README file. First, reread AGENTS.md so it's still fresh in your mind. Use ultrathink...

---

## 3. The Robot-Mode Maker

Next, I want you to create a "robot mode" for coding agents that want to interact with this so they don't need to use the UI but can instead access all the same functionality via a CLI...

---

## When to Use This Bundle

- **Idea Wizard**: At project start or when feeling stuck
- **README Reviser**: After implementing new features
- **Robot-Mode Maker**: When building tools that agents will use

## Tips

- Use these in sequence: ideate → implement → document → agent-optimize
- The "ultrathink" directive in each prompt triggers extended reasoning
- All three prompts are designed to produce actionable, high-quality output

---

*From [JeffreysPrompts.com](https://jeffreysprompts.com) by Jeffrey Emanuel*
```

## CLI Integration

The jfp CLI uses this skill's logic:

```bash
# Single prompt → skill
jfp export idea-wizard --format skill

# Multiple prompts → bundled skill
jfp export idea-wizard readme-reviser robot-mode-maker --bundle jeffrey-meta-prompts

# Install bundle directly
jfp install idea-wizard readme-reviser robot-mode-maker --bundle jeffrey-meta-prompts
```

## Guidelines

1. **Name intelligently** — For bundles, derive a name from the common theme
2. **Keep frontmatter description under 120 chars** — Claude loads these at startup
3. **Preserve the "ultrathink" directive** — It's intentional and important
4. **Always include attribution** — Link back to jeffreysprompts.com
5. **Use horizontal rules** — Separate prompts in bundles with `---`
6. **Generate "When to Use"** — If the source prompt lacks it, generate scenarios based on content
```

---

## Part 5: Project Structure (Complete)

```
jeffreysprompts.com/
├── README.md
├── AGENTS.md
├── PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL.md
├── package.json                          # Root monorepo config
├── bun.lock
├── vercel.json
│
├── jfp.ts                                 # CLI entrypoint (thin wrapper around packages/cli)
├── jfp.test.ts                            # CLI tests
│
├── .claude/
│   └── skills/
│       ├── prompt-formatter/
│       │   └── SKILL.md                   # Skill for formatting new prompts
│       └── skill-maker/
│           └── SKILL.md                   # Meta-skill for creating skills from prompts
│
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts                   # Package re-exports
│   │       ├── prompts/
│   │       │   ├── types.ts               # Prompt interfaces
│   │       │   ├── registry.ts            # All prompts (single source of truth)
│   │       │   ├── bundles.ts             # Prompt bundles
│   │       │   ├── workflows.ts           # Curated workflows
│   │       │   └── schema.ts              # Runtime schema validation
│   │       ├── export/
│   │       │   ├── skills.ts              # SKILL.md export
│   │       │   ├── markdown.ts            # Markdown export
│   │       │   └── json.ts                # JSON export (registry payload)
│   │       ├── search/
│   │       │   ├── bm25.ts                # BM25 engine
│   │       │   ├── tokenize.ts            # Tokenizer + stopwords
│   │       │   ├── synonyms.ts            # Synonyms/boosting map
│   │       │   ├── hash-embedder.ts       # Lightweight hash embeddings (fallback)
│   │       │   └── semantic.ts            # Optional semantic rerank hooks
│   │       └── template/
│   │           ├── render.ts              # Variable rendering
│   │           └── variables.ts           # Variable helpers
│   │
│   └── cli/
│       ├── package.json
│       └── src/
│           ├── index.ts                   # CLI entry (imports core)
│           ├── commands/                  # list/show/search/suggest/etc
│           └── lib/                       # registry loader, config, mcp
│
├── apps/
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── vitest.config.ts
│       ├── eslint.config.mjs
│       ├── components.json               # shadcn/ui config
│       │
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx            # Root layout (copied from brennerbot)
│       │   │   ├── page.tsx              # Main page (hero + search + grid)
│       │   │   ├── globals.css           # Design system (copied from brennerbot)
│       │   │   ├── prompts/
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx      # Prompt permalink page (SEO/shareable)
│       │   │   ├── bundles/
│       │   │   │   ├── page.tsx          # Bundles index page
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx      # Bundle permalink page
│       │   │   ├── workflows/
│       │   │   │   └── page.tsx          # Workflow builder UI
│       │   │   ├── contribute/
│       │   │   │   └── page.tsx          # Contribution helper
│       │   │   ├── install.sh/
│       │   │   │   └── route.ts          # Shell script for skills bulk install
│       │   │   ├── install-cli.sh/
│       │   │   │   └── route.ts          # Shell script for CLI binary install
│       │   │   ├── how_it_was_made/
│       │   │   │   └── page.tsx          # Meta-story: building the site in a day
│       │   │   └── api/
│       │   │       ├── prompts/
│       │   │       │   └── route.ts      # GET /api/prompts → JSON
│       │   │       ├── health/
│       │   │       │   └── route.ts      # GET /api/health → status
│       │   │       └── skills/
│       │   │           └── [id]/
│       │   │               └── route.ts  # GET /api/skills/[id] → SKILL.md
│       │   │
│       │   ├── components/
│       │   │   ├── ui/                   # shadcn/ui base components
│       │   │   │   ├── button.tsx        # (from brennerbot)
│       │   │   │   ├── card.tsx          # (from brennerbot)
│       │   │   │   ├── badge.tsx         # (from brennerbot)
│       │   │   │   ├── dialog.tsx        # (from brennerbot)
│       │   │   │   ├── toast.tsx         # (from brennerbot)
│       │   │   │   ├── copy-button.tsx   # (from brennerbot, 351 lines)
│       │   │   │   └── skeleton.tsx
│       │   │   │
│       │   │   ├── prompt-card.tsx       # Individual prompt display
│       │   │   ├── prompt-grid.tsx       # Responsive grid of cards
│       │   │   ├── prompt-detail.tsx     # Full prompt view (modal)
│       │   │   ├── prompt-detail-sheet.tsx # Mobile bottom-sheet detail view
│       │   │   ├── search-bar.tsx        # Full-text search input
│       │   │   ├── spotlight-search.tsx  # Cmd+K command palette
│       │   │   ├── category-filter.tsx   # Category pill selector
│       │   │   ├── tag-filter.tsx        # Tag multi-select
│       │   │   ├── basket.tsx            # Selected prompts sidebar
│       │   │   ├── export-modal.tsx      # Export format selection
│       │   │   ├── install-skill-button.tsx
│       │   │   ├── install-all-button.tsx
│       │   │   ├── hero.tsx              # Landing hero section
│       │   │   ├── nav.tsx               # Header (from brennerbot)
│       │   │   ├── footer.tsx
│       │   │   ├── providers.tsx         # Context providers
│       │   │   │
│       │   │   └── transcript/           # "How It Was Made" page components
│       │   │       ├── timeline.tsx      # Session timeline visualization
│       │   │       ├── message-detail.tsx # Full message with tool calls
│       │   │       ├── message-content.tsx # Markdown/code rendering
│       │   │       ├── timeline-skeleton.tsx # Loading skeleton
│       │   │       ├── insight-card.tsx  # Annotation highlight cards
│       │   │       └── stats-dashboard.tsx # Session statistics
│       │   │
│       │   ├── lib/
│       │   │   ├── registry-client.ts   # SWR fetch /api/prompts + fallback to registry.json
│       │   │   ├── search/
│       │   │   │   ├── engine.ts         # Thin wrapper / worker bridge to core BM25
│       │   │   │   └── types.ts          # Search types
│       │   │   │
│       │   │   ├── export/
│       │   │   │   ├── markdown.ts       # Thin wrapper to core export
│       │   │   │   └── skills.ts         # Thin wrapper to core export
│       │   │   │
│       │   │   ├── transcript/           # Session transcript processing
│       │   │   │   ├── types.ts          # TranscriptMessage, ToolCall, etc.
│       │   │   │   ├── processor.ts      # JSONL → ProcessedTranscript
│       │   │   │   ├── utils.ts          # formatTime, detectLanguage, etc.
│       │   │   │   └── data.ts           # getTranscriptData loader
│       │   │   │
│       │   │   ├── utils.ts              # cn, etc.
│       │   │   └── theme.ts              # Light/dark mode
│       │   │
│       │   ├── data/                     # Static data files
│       │   │   ├── transcript.json       # Processed session transcript
│       │   │   └── annotations.ts        # Message annotations/highlights
│       │   │
│       │   └── hooks/
│       │       ├── use-search.ts
│       │       ├── use-basket.ts
│       │       ├── use-copy.ts
│       │       └── use-local-storage.ts
│       │
│       └── public/
│           ├── og-image.png
│           ├── registry.json            # Optional static registry payload
│           ├── registry.manifest.json   # Optional registry checksum manifest
│           ├── manifest.json
│           ├── icons/
│           │   ├── icon-192.png
│           │   └── icon-512.png
│           └── favicon.ico
│
└── scripts/
    ├── build-cli.sh                      # Build jfp binary (current platform)
    ├── build-releases.sh                 # Build jfp for all platforms
    ├── build-data.ts                     # Validate + generate derived assets (manifest, indexes)
    ├── validate-prompts.ts               # Schema-check registry
    ├── extract-transcript.ts             # Extract session via cass
    ├── process-transcript.ts             # Process JSONL → JSON
    ├── redact-transcript.ts              # Redact secrets before publish
    └── validate-publication.ts           # CI guard against leaks
```

---

## Part 6: CLI Tool (jfp) — Complete Implementation

### 6.0 Robot-Mode Design Philosophy

This section applies Jeffrey's **Robot-Mode Maker** prompt directly to the jfp CLI design. The question is: **What would *I* (Claude, a coding agent) want from this tool?**

> "Make the tooling here that YOU would want if YOU were using it (because you WILL be!), that maximizes agent ergonomics and agent intuition."

#### Core Principle: Agent-First, Human-Compatible

The jfp CLI is primarily designed for AI coding agents, with humans as a secondary audience. This inverts the typical CLI design priority.

**Agent needs:**
- Structured, parseable output (JSON)
- Predictable response format
- Minimal, token-efficient output
- Meaningful exit codes
- Actionable error messages with suggestions
- Non-interactive by default

**Human needs:**
- Beautiful, readable output
- Interactive exploration mode
- Colors and formatting
- Progress indicators

The solution: **Smart defaults with explicit overrides.**

#### Output Format Philosophy

**Rule 1: JSON for structured data, Markdown for narrative.**

| Command | Default Output | Why |
|---------|----------------|-----|
| `jfp list` | Compact table | Humans scanning a list |
| `jfp list --json` | JSON array | Agents parsing/filtering |
| `jfp show <id>` | Markdown | Humans reading content |
| `jfp show <id> --json` | JSON object | Agents extracting fields |
| `jfp search <q>` | Ranked list | Humans evaluating matches |
| `jfp search <q> --json` | JSON with scores | Agents processing results |

**Rule 2: Detect TTY and adjust defaults.**

```typescript
// If stdout is not a TTY (piped output), default to JSON
const isTTY = process.stdout.isTTY;
const defaultFormat = isTTY ? "human" : "json";

// If --json is explicit, always JSON
// If --human is explicit, always human-readable
// Otherwise, use defaultFormat
```

This means agents can do:
```bash
# Agent piping output — automatically gets JSON
results=$(jfp search "brainstorm")
echo $results | jq '.results[0].id'

# Human in terminal — gets pretty output
jfp search "brainstorm"
```

**Rule 3: Token efficiency is paramount.**

As an agent with context limits, every token matters. Output should be:
- Dense but readable
- No redundant information
- No chatty explanations
- No decorative elements in JSON mode

**Rule 4: JSON is compact by default.**
- `--json` prints compact JSON for token efficiency
- `--pretty` enables indented JSON for humans

#### Quick-Start Mode: What I (Claude) Would Want

When I run `jfp` with no arguments, I need to instantly understand:
1. What this tool does (one sentence)
2. The 4-5 most useful commands
3. How to get JSON output
4. Where to learn more

**NOT:**
- Long paragraphs of explanation
- Every flag documented
- Version history
- Author credits

**The ideal quick-start output (~15 lines, ~100 tokens):**

```
jfp — Jeffrey's Prompts CLI

QUICK START:
  jfp list                    List all prompts
  jfp search "idea"           BM25 search
  jfp show idea-wizard        View full prompt
  jfp install idea-wizard     Install as Claude Code skill

ADD --json TO ANY COMMAND FOR MACHINE-READABLE OUTPUT

EXPLORE:
  jfp i                       Interactive browser (fzf-style)

MORE: jfp help | Docs: jeffreysprompts.com
```

That's it. Dense, actionable, complete.

#### Error Handling for Agents

Errors should be structured and actionable, not just strings.

**Bad (typical CLI):**
```
Error: prompt not found
```

**Good (agent-friendly):**
```json
{
  "error": "prompt_not_found",
  "message": "No prompt with id 'foo-bar'",
  "suggestions": ["foo-baz", "idea-wizard"],
  "exitCode": 1
}
```

**Exit codes:**
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Not found (prompt, skill) |
| 2 | Invalid arguments |
| 3 | Installation failed |
| 4 | Network error |
| 5 | Permission denied |

```typescript
// Error handling pattern
function handleError(error: JfpError, flags: Flags) {
  if (flags.json) {
    printJson({
      error: error.code,
      message: error.message,
      suggestions: error.suggestions ?? [],
      exitCode: error.exitCode,
    }, flags);
  } else {
    console.error(chalk.red(`Error: ${error.message}`));
    if (error.suggestions?.length) {
      console.error(chalk.dim(`Did you mean: ${error.suggestions.join(", ")}?`));
    }
  }
  process.exit(error.exitCode);
}
```

#### Token-Efficient Output Examples

**`jfp list` (human mode):**
```
ID                CATEGORY       TAGS                        DESCRIPTION
idea-wizard       ideation       brainstorm,ultrathink       Generate 30 ideas, distill to best 5
readme-reviser    documentation  docs,ultrathink             Update README for undocumented features
robot-mode-maker  automation     cli,agent,ultrathink        Create agent-optimized CLI interfaces
```

**`jfp list --json` (agent mode):**
```json
[
  {"id":"idea-wizard","category":"ideation","tags":["brainstorm","ultrathink"],"description":"Generate 30 ideas, distill to best 5"},
  {"id":"readme-reviser","category":"documentation","tags":["docs","ultrathink"],"description":"Update README for undocumented features"},
  {"id":"robot-mode-maker","category":"automation","tags":["cli","agent","ultrathink"],"description":"Create agent-optimized CLI interfaces"}
]
```

**`jfp search "brain"` (human mode):**
```
Found 3 prompts matching "brain":

1. idea-wizard (score: 0.92)
   Generate 30 ideas, distill to best 5

2. brainstorm-sprint (score: 0.85)
   Rapid ideation with time constraints

3. mind-map-maker (score: 0.71)
   Create structured mind maps for concepts
```

**`jfp search "brain" --json` (agent mode):**
```json
{
  "query": "brain",
  "count": 3,
  "results": [
    {"id":"idea-wizard","score":0.92,"description":"Generate 30 ideas, distill to best 5"},
    {"id":"brainstorm-sprint","score":0.85,"description":"Rapid ideation with time constraints"},
    {"id":"mind-map-maker","score":0.71,"description":"Create structured mind maps for concepts"}
  ]
}
```

**`jfp show idea-wizard` (human mode):**
```markdown
# The Idea Wizard

**Category:** ideation
**Tags:** brainstorm, improvement, ultrathink

Come up with your very best ideas for improving this project to make it more
robust, reliable, performant, intuitive, user-friendly, ergonomic, useful,
compelling, etc. while still being obviously accretive and pragmatic...

## When to Use
- When starting a new feature and want to brainstorm approaches
- When a project feels stale and needs fresh ideas
- When preparing for a planning session

## Tips
- Be specific about what aspects you want to improve
- Run multiple times for different focus areas
```

**`jfp show idea-wizard --json` (agent mode):**
```json
{
  "id": "idea-wizard",
  "title": "The Idea Wizard",
  "category": "ideation",
  "tags": ["brainstorm", "improvement", "ultrathink"],
  "content": "Come up with your very best ideas...",
  "whenToUse": ["When starting a new feature...", "..."],
  "tips": ["Be specific about...", "..."]
}
```

**`jfp show idea-wizard --raw` (just the prompt):**
```
Come up with your very best ideas for improving this project to make it more robust, reliable, performant, intuitive, user-friendly, ergonomic, useful, compelling, etc. while still being obviously accretive and pragmatic. Come up with 30 ideas and then really think through each idea carefully, how it would work, how users are likely to perceive it, how we would implement it, etc; then winnow that list down to your VERY best 5 ideas. Explain each of the 5 ideas in order from best to worst and give your full, detailed rationale and justification for how and why it would make the project obviously better and why you're confident of that assessment. Use ultrathink.
```

This is what I'd pipe directly into a prompt.

#### Command Design Decisions

**1. `jfp list` should support all filter combinations:**
```bash
jfp list --category ideation --tag ultrathink  # Both filters
jfp list --featured                             # Just featured prompts
jfp list --limit 5                              # First 5 only
jfp list --sort score                           # By relevance (if search)
```

**2. `jfp search` should be forgiving and fast:**
```bash
jfp search "brain"           # Matches "brainstorm", "idea-wizard"
jfp search "doc readme"      # Multi-word query
jfp search "ultrathin"       # Typo-tolerant (matches "ultrathink")
```

**3. `jfp install` should be idempotent:**
```bash
jfp install idea-wizard      # Install (creates skill dir)
jfp install idea-wizard      # No error, just "already installed"
jfp install idea-wizard --force  # Overwrite existing
```

**4. `jfp copy` should have intelligent clipboard handling:**
```bash
jfp copy idea-wizard         # Copy prompt text to clipboard
jfp copy idea-wizard --with-attribution  # Include "— Jeffrey Emanuel"
jfp copy idea-wizard --as-skill          # Copy as SKILL.md content
```

**5. `jfp` (no args) should detect if stdin has data:**
```bash
# Interactive: show quick-start
jfp

# Piped input: treat as search query
echo "brainstorm ideas" | jfp
```

#### What Makes This "Robot Mode"

Per Jeffrey's prompt:
- "agent users should get all the same information as a human would get... but in a more usable, helpful, intuitive, and accessible form for agents"
- "maximizes agent ergonomics and agent intuition"
- "quick-start mode... explains the most critical functionality in the most intuitive, token-dense way possible"

The jfp CLI achieves this by:
1. **Defaulting to JSON when piped** — agents don't need `--json` every time
2. **Structured errors with suggestions** — agents can recover gracefully
3. **Token-efficient output** — respects context limits
4. **Predictable response shapes** — same fields, same structure, always
5. **Quick-start that fits in ~100 tokens** — agents can understand instantly
6. **Exit codes that mean something** — not just 0/1
7. **`--raw` flag for direct prompt text** — easy to pipe into other tools

This IS the tooling I would want. Because I WILL be using it.

---

### 6.1 Command Reference

```
jfp                           # Quick-start help
jfp help                      # Full documentation
jfp list                      # List all prompts
jfp list --category ideation  # Filter by category
jfp list --tag ultrathink     # Filter by tag
jfp list --json               # JSON output for agents

jfp search <query>            # BM25 search
jfp search "robot" --json     # JSON output

jfp suggest <task>            # Suggest prompts for a task
jfp suggest <task> --semantic # Optional semantic rerank (if enabled)

jfp show <id>                 # Show full prompt
jfp show idea-wizard --json   # JSON output
jfp show idea-wizard --raw    # Just the prompt text

jfp copy <id>                 # Copy to clipboard

jfp render <id>               # Render a prompt with variables
jfp render <id> --VAR=...      # Fill variables via flags

jfp export <id>               # Export as SKILL.md
jfp export <id> --format md   # Export as markdown
jfp export --all              # Export all prompts

jfp install <id>...           # Install as Claude Code skills
jfp install --all             # Install all skills
jfp install --project         # Install to .claude/skills

jfp uninstall <id>...         # Remove installed skills
jfp uninstall <id>... --confirm  # Required in scripts/non-interactive
jfp uninstall --all

jfp installed                 # List installed skills
jfp installed --json

jfp update                    # Update all installed skills
jfp update --dry-run          # Show what would change

jfp interactive               # fzf-style picker
jfp i                         # Alias

jfp categories                # List categories
jfp tags                      # List tags with counts

jfp registry status           # Show registry cache status
jfp registry refresh          # Refresh cached registry

jfp open <id>                 # Open prompt permalink in browser

jfp serve                     # MCP server mode (agent-native)

jfp completion --shell zsh    # Shell completions

jfp --version
jfp --help
```

### 6.2 Quick-Start Mode (No Args)

```typescript
async function showQuickStart() {
  const registry = await loadRegistry();
  const box = boxen(
    `
${chalk.bold.cyan("⚡ Jeffrey's Prompts CLI")} ${chalk.dim(`v${VERSION}`)}

${chalk.dim("Curated prompts for agentic coding")}

${chalk.bold("QUICK START")}

  ${chalk.cyan("jfp list")}              List all ${registry.length} prompts
  ${chalk.cyan("jfp search")} ${chalk.dim("<query>")}    Search prompts
  ${chalk.cyan("jfp show")} ${chalk.dim("<id>")}        View full prompt
  ${chalk.cyan("jfp suggest")} ${chalk.dim("<task>")}   Suggest prompts for a task
  ${chalk.cyan("jfp render")} ${chalk.dim("<id>")}      Render prompt with variables
  ${chalk.cyan("jfp copy")} ${chalk.dim("<id>")}        Copy to clipboard
  ${chalk.cyan("jfp i")}                 Interactive picker

${chalk.bold("INSTALL AS CLAUDE SKILLS")}

  ${chalk.cyan("jfp install --all")}     Install all as personal skills
  ${chalk.cyan("jfp install")} ${chalk.dim("<id>...")}   Install specific skills
  ${chalk.cyan("jfp installed")}         See what's installed

${chalk.bold("AGENT MODE")} ${chalk.dim("(JSON output)")}

  ${chalk.cyan("jfp list --json")}       All prompts
  ${chalk.cyan("jfp show")} ${chalk.dim("<id>")} ${chalk.cyan("--json")}  Single prompt
  ${chalk.cyan("jfp search")} ${chalk.dim("<q>")} ${chalk.cyan("--json")} Search results

${chalk.dim("https://jeffreysprompts.com")}
`.trim(),
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
    }
  );

  console.log(box);
}
```

### 6.3 Interactive Mode (fzf-style)

```typescript
import { search, select, confirm } from "@inquirer/prompts";
import { generatePromptMarkdown } from "@jeffreysprompts/core/export/markdown";

// Helper: Copy text to clipboard (cross-platform, using Bun.spawn)
async function copyToClipboard(text: string): Promise<void> {
  const clipboardCmds =
    process.platform === "darwin" ? [["pbcopy"]] :
    process.platform === "win32" ? [["clip"]] :
    [["wl-copy"], ["xclip", "-selection", "clipboard"]];

  for (const cmd of clipboardCmds) {
    const proc = Bun.spawn(cmd, { stdin: "pipe" });
    proc.stdin.write(text);
    proc.stdin.end();
    const exitCode = await proc.exited;
    if (exitCode === 0) return;
  }

  throw new Error("No clipboard backend succeeded");
}

// Helper: Show prompt details (reuses showCommand logic)
function showPrompt(prompt: Prompt): void {
  console.log(chalk.bold(`\n# ${prompt.title}\n`));
  console.log(`${chalk.dim("Category:")} ${prompt.category}`);
  console.log(`${chalk.dim("Tags:")} ${prompt.tags.join(", ")}`);
  console.log();
  console.log(prompt.content);
  if (prompt.whenToUse?.length) {
    console.log(chalk.bold("\n## When to Use"));
    for (const when of prompt.whenToUse) {
      console.log(`- ${when}`);
    }
  }
  if (prompt.tips?.length) {
    console.log(chalk.bold("\n## Tips"));
    for (const tip of prompt.tips) {
      console.log(`- ${tip}`);
    }
  }
  console.log();
}

// Helper: Install prompt as Claude Code skill
async function installSkill(prompt: Prompt): Promise<void> {
  const targetDir = join(homedir(), ".config", "claude", "skills", prompt.id);
  const skillPath = join(targetDir, "SKILL.md");

  mkdirSync(targetDir, { recursive: true });
  writeFileSync(skillPath, generateSkillMd(prompt));
  console.log(chalk.green(`✓ Installed "${prompt.title}" → ${targetDir}`));
  console.log(chalk.dim("Restart Claude Code to load the new skill."));
}

// Helper: Export prompt as markdown file
async function exportMarkdown(prompt: Prompt): Promise<void> {
  const filename = `${prompt.id}.md`;
  const content = generatePromptMarkdown(prompt);

  await Bun.write(filename, content);
  console.log(chalk.green(`✓ Exported ${filename}`));
}

async function interactiveMode() {
  const registry = await loadRegistry();
  const selected = await search({
    message: "Search prompts...",
    source: async (input) => {
      if (!input?.trim()) {
        return registry.map((p) => ({
          name: `${p.title} ${chalk.dim(`(${p.category})`)}`,
          value: p,
          description: p.description,
        }));
      }

      return searchPrompts(input, 20, registry).map((item) => {
        const prompt = findPrompt(registry, item.id);
        return {
          name: `${item.title} ${chalk.dim(`(${item.category})`)}`,
          value: prompt ?? item,
          description: item.description,
        };
      });
    },
  });

  // Action menu
  const action = await select({
    message: `${chalk.cyan(selected.title)}`,
    choices: [
      { name: "📋 Copy to clipboard", value: "copy" },
      { name: "👁  View full prompt", value: "view" },
      { name: "📦 Install as Claude skill", value: "install" },
      { name: "💾 Export as markdown", value: "export-md" },
      { name: "🔙 Back to search", value: "back" },
    ],
  });

  switch (action) {
    case "copy":
      await copyToClipboard(selected.content);
      console.log(chalk.green(`✓ Copied "${selected.title}" to clipboard`));
      break;
    case "view":
      showPrompt(selected);
      break;
    case "install":
      await installSkill(selected);
      break;
    case "export-md":
      await exportMarkdown(selected);
      break;
    case "back":
      await interactiveMode();
      break;
  }
}
```

### 6.4 Build Process

```bash
#!/usr/bin/env bash
# scripts/build-cli.sh

set -e

echo "Building jfp CLI..."

# Build data assets (validate + indexes)
echo "Building prompt data..."
bun run scripts/build-data.ts

# Build for current platform
echo "Building for current platform..."
bun build --compile ./jfp.ts --outfile dist/jfp

# Cross-compile
echo "Cross-compiling..."
bun build --compile --target=bun-linux-x64 ./jfp.ts --outfile dist/jfp-linux-x64
bun build --compile --target=bun-darwin-arm64 ./jfp.ts --outfile dist/jfp-darwin-arm64
bun build --compile --target=bun-darwin-x64 ./jfp.ts --outfile dist/jfp-darwin-x64
bun build --compile --target=bun-windows-x64 ./jfp.ts --outfile dist/jfp-windows-x64.exe

echo ""
echo "Built binaries:"
ls -lh dist/

echo ""
echo "Done!"
```

Build-data script should also emit the registry manifest used for integrity checks:

```typescript
// scripts/build-data.ts (excerpt)
import { buildRegistryPayload } from "../packages/core/src/export/json";
import { createHash } from "crypto";

const payload = buildRegistryPayload();
const json = JSON.stringify(payload);
const sha256 = createHash("sha256").update(json).digest("hex");

await Bun.write("apps/web/public/registry.json", json);
await Bun.write(
  "apps/web/public/registry.manifest.json",
  JSON.stringify({ version: payload.version, updatedAt: payload.updatedAt, sha256 }, null, 2)
);
```

Versioning note:
- set `JFP_REGISTRY_VERSION` at build time (e.g., git short SHA or semver tag) so content updates are traceable.

### 6.5 CLI Output Contracts & Golden Tests (NEW)

Because agents depend on stable JSON output, add golden tests for:
- `jfp list --json`
- `jfp search "query" --json`
- `jfp show idea-wizard --json`
- error payloads (not found, invalid args)

This prevents accidental schema drift and keeps agent integrations stable.

### 6.6 Registry Cache (Stale-While-Revalidate)

Prompts are content, and content changes faster than binaries. The CLI should load fast and update quietly:

- Ship with an embedded snapshot (offline-first).
- Read cache from `$HOME/.config/jfp/registry.json` if present.
- In the background (2s timeout by default, configurable), fetch `/api/prompts` (unfiltered) with `If-None-Match` and update cache for next run.
- Store the latest `ETag` and timestamps in `$HOME/.config/jfp/registry.meta.json` to avoid unnecessary downloads.
- Respect `registry.autoRefresh: false` in config to disable background refresh.
- Set `registry.remote` to `/registry.json` if you prefer a purely static CDN snapshot.

```typescript
// packages/cli/src/lib/registry-loader.ts

export async function loadRegistry(): Promise<Prompt[]> {
  const embedded = prompts; // bundled snapshot
  const config = loadConfig();
  const registry = config.registry ?? {};
  const localPrompts = config.localPrompts ?? {};
  const cachePath = registry.cachePath ?? join(homedir(), ".config", "jfp", "registry.json");
  const metaPath = registry.metaPath ?? join(dirname(cachePath), "registry.meta.json");
  const localDir = localPrompts.dir ?? join(homedir(), ".config", "jfp", "local");
  const registryUrl = registry.remote ?? "https://jeffreysprompts.com/api/prompts";
  const manifestUrl = registry.manifestUrl ?? "https://jeffreysprompts.com/registry.manifest.json";
  const timeoutMs = registry.timeoutMs ?? 2000;

  const cached = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, "utf-8"))
    : null;

  // Fire-and-forget refresh (configurable timeout)
  if (registry.autoRefresh !== false) {
    refreshRegistry({ cachePath, metaPath, registryUrl, manifestUrl, timeoutMs }).catch(() => {});
  }

  const base = cached?.prompts ?? embedded;
  const local = localPrompts.enabled === false ? [] : loadLocalPrompts(localDir);
  return mergeLocalPrompts(base, local);
}
```

Suggested helpers:
- `loadLocalPrompts(dir)` reads `*.md` with optional YAML frontmatter.
- `mergeLocalPrompts(base, local)` merges by id (local overrides base).

```typescript
function mergeLocalPrompts(base: Prompt[], local: Prompt[]): Prompt[] {
  const byId = new Map(base.map((p) => [p.id, p]));
  for (const p of local) byId.set(p.id, p);
  return Array.from(byId.values());
}
```

```typescript
function loadLocalPrompts(dir: string): Prompt[] {
  if (!existsSync(dir)) return [];
  // Read *.md files; parse optional YAML frontmatter for id/title/tags.
  // Convert to Prompt objects with category "workflow" or "communication" by default.
  return [];
}
```

```typescript
import { createHash } from "crypto";

async function refreshRegistry({
  cachePath,
  metaPath,
  registryUrl = "https://jeffreysprompts.com/api/prompts",
  manifestUrl,
  timeoutMs = 2000,
}: {
  cachePath: string;
  metaPath: string;
  registryUrl?: string;
  manifestUrl?: string;
  timeoutMs?: number;
}) {
  const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf-8")) : {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(registryUrl, {
    headers: meta.etag ? { "If-None-Match": meta.etag } : {},
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (res.status === 304) return { updated: false, version: meta.version ?? "unknown" };
  const payload = await res.json();
  const isFiltered = payload?.meta?.promptCount && payload.meta.promptCount !== payload.prompts?.length;

  // Optional manifest verification
  const derivedManifestUrl = manifestUrl
    ?? (registryUrl.endsWith("registry.json") ? registryUrl.replace(/registry\\.json$/, "registry.manifest.json") : undefined);
  if (derivedManifestUrl && !isFiltered) {
    const manifestRes = await fetch(derivedManifestUrl);
    if (manifestRes.ok) {
      const manifest = await manifestRes.json();
      const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
      if (hash !== manifest.sha256) throw new Error("Registry checksum mismatch");
    }
  }

  mkdirSync(dirname(cachePath), { recursive: true });
  mkdirSync(dirname(metaPath), { recursive: true });
  writeFileSync(cachePath, JSON.stringify(payload));
  writeFileSync(metaPath, JSON.stringify({
    etag: res.headers.get("etag"),
    version: payload.version,
    updatedAt: payload.updatedAt,
    cachedAt: new Date().toISOString(),
  }, null, 2));

  return { updated: true, version: payload.version };
}
```

CLI commands:
- `jfp registry status` — show cache age/version
- `jfp registry refresh` — force refresh

### 6.6.1 Registry Integrity Verification (Optional, Recommended)

For extra trust, publish a small manifest alongside the registry payload:

- `public/registry.manifest.json`
- Fields: `{ version, updatedAt, sha256 }`

The CLI verifies the checksum **before** writing cache:
- If checksum mismatch → skip write + warn once.
- If checksum matches → write cache + update stored `ETag`.

This adds tamper-resistance without adding heavy signing infrastructure.

Note: checksum verification applies to `/registry.json`. If `/api/prompts` is unfiltered, its payload
should match `/registry.json` and can be verified; if filters are applied, skip verification.
If you host the registry at a custom URL, set `registry.manifestUrl` in config.

### 6.7 Prompt Rendering + Context Injection

Add a render pipeline that fills `{{VARS}}` and can append context:

```
jfp render idea-wizard --PROJECT_NAME="Acme" --GOAL="speed"
jfp copy idea-wizard --fill          # prompts for missing vars
jfp render idea-wizard --context ./README.md
jfp render idea-wizard --stdin       # read context from stdin
```

Guardrails:
- default max context size (e.g., 200KB)
- show truncation note with filename if clipped
- `file` variable type reads file contents (size-capped)
- `path` variable type passes raw path string

### 6.8 Local Prompt Scratchpad (Stickiness)

Local prompts live in `$HOME/.config/jfp/local/`:
- `*.md` with optional YAML frontmatter (id/title/tags)
- merged into registry at runtime
- enables personal prompts without forking the repo

### 6.9 MCP Server Mode (Agent-Native)

`jfp serve` exposes prompts via MCP over stdio:
- resource: `prompt://<id>` → prompt content
- tools: `search_prompts`, `render_prompt`

Provide a copy-paste MCP config snippet for Claude Desktop.

Tool schemas (JSON-ish):
- `search_prompts` input: `{ query: string, category?: string, tags?: string[], limit?: number }`
  output: `{ results: [{ id, title, score, category, tags }] }`
- `render_prompt` input: `{ id: string, variables?: Record<string,string>, context?: string }`
  output: `{ id, rendered }`

Example Claude Desktop MCP config snippet:

```json
{
  "mcpServers": {
    "jfp": {
      "command": "jfp",
      "args": ["serve"]
    }
  }
}
```

### 6.10 CLI Auto-Update (Opt-In)

Add an optional self-update flow (disabled by default):
- `updates.autoUpdate: false` in config
- check weekly (or `jfp update-cli` on demand)
- download from GitHub releases
- verify checksum (`SHA256SUMS.txt`)
- atomic replace (download → verify → rename)
- rollback on failure (keep `jfp.bak`, restore if new binary fails to exec)

This avoids “stale binary” drift for users who want it, without forcing network checks on every run.

---

## Part 7: Web App Components (Detailed)

### 7.0 Registry Data Loading (SWR-Style)

Use `/api/prompts` (unfiltered) as the canonical data source for the web UI. Server components can
fetch with revalidation; client components can revalidate in the background (SWR-style).

```typescript
// apps/web/src/lib/registry-client.ts
import type { RegistryPayload } from "@jeffreysprompts/core/export/json";

export async function fetchRegistry(): Promise<RegistryPayload> {
  const res = await fetch("/api/prompts", { cache: "force-cache" });
  if (res.ok) return res.json();
  // Offline fallback (PWA caches registry.json)
  const fallback = await fetch("/registry.json", { cache: "force-cache" });
  if (!fallback.ok) throw new Error("Failed to load registry");
  return fallback.json();
}
```

Notes:
- For live revalidation on the client, wrap `fetchRegistry` in SWR or a lightweight `useEffect` hook.
- The PWA service worker should cache `/registry.json` for offline fallback.

```tsx
// apps/web/src/app/page.tsx
import dynamic from "next/dynamic";
import { fetchRegistry } from "@/lib/registry-client";
import { PromptGrid } from "@/components/prompt-grid";

const SpotlightSearch = dynamic(
  () => import("@/components/spotlight-search").then((m) => m.SpotlightSearch),
  { ssr: false }
);

export default async function HomePage() {
  const registry = await fetchRegistry();
  return (
    <>
      <SpotlightSearch source={registry.prompts} />
      <PromptGrid prompts={registry.prompts} />
    </>
  );
}
```

### 7.1 PromptCard Component

```tsx
// apps/web/src/components/prompt-card.tsx

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Prompt } from "@jeffreysprompts/core/prompts";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PromptCardProps {
  prompt: Prompt;
  index: number;
  onAddToBasket: () => void;
  isInBasket: boolean;
}

export function PromptCard({
  prompt,
  index,
  onAddToBasket,
  isInBasket,
}: PromptCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group"
    >
      <div
        className={cn(
          "relative h-full rounded-2xl border border-border/50",
          "bg-card/50 backdrop-blur-sm",
          "p-5 sm:p-6",
          "transition-all duration-300",
          "hover:shadow-lg hover:-translate-y-1 hover:border-primary/30",
          "active:scale-[0.98]"
        )}
      >
        {/* Category badge */}
        <Badge
          variant="secondary"
          className="absolute top-4 right-4 capitalize text-xs"
        >
          {prompt.category}
        </Badge>

        {/* Title */}
        <h3 className="font-semibold text-lg text-foreground mb-2 pr-20">
          {prompt.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {prompt.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {prompt.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {prompt.tags.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-muted-foreground">
              +{prompt.tags.length - 4}
            </span>
          )}
        </div>

        {/* Preview (on hover/expand) */}
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4 p-3 bg-muted/50 rounded-lg"
          >
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
              {prompt.content.slice(0, 300)}
              {prompt.content.length > 300 && "..."}
            </pre>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <CopyButton
            text={prompt.content}
            variant="badge"
            label="Copy"
            size="sm"
          />

          <Button
            variant={isInBasket ? "secondary" : "outline"}
            size="sm"
            onClick={onAddToBasket}
            className="gap-1.5"
          >
            {isInBasket ? (
              <>
                <Check className="size-3.5" />
                Added
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                Add
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="ml-auto"
          >
            {expanded ? "Less" : "Preview"}
          </Button>
        </div>

        {/* Difficulty indicator */}
        {prompt.difficulty && (
          <div className="absolute bottom-4 right-4">
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-wider",
                prompt.difficulty === "beginner" && "text-emerald-500",
                prompt.difficulty === "intermediate" && "text-amber-500",
                prompt.difficulty === "advanced" && "text-rose-500"
              )}
            >
              {prompt.difficulty}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

### 7.2 Prompt Detail + Variable Inputs (Mobile-First)

Prompts that define `variables` should render a lightweight input form **above** the prompt content.
Values persist in `localStorage` per prompt id so users don’t need to re-enter them.

Key UX requirements:
- **Mobile**: prompt detail opens as a bottom sheet (thumb-friendly).
- **Fixed action bar** on mobile: Copy / Install / Download (large targets).
- **Swipe-to-copy** on cards (optional, mobile only).
- **Haptics** on copy (`navigator.vibrate(10)` when supported).
- **Rendered copy**: copy uses `renderPrompt()` with filled variables.
- **Context box (optional)**: paste or drop a file snippet (size-capped) to append under `---\nContext:\n`.

```tsx
// apps/web/src/components/prompt-detail.tsx (excerpt)
import { renderPrompt } from "@jeffreysprompts/core/template/render";

const storageKey = `jfp-vars:${prompt.id}`;
const defaults = Object.fromEntries((prompt.variables ?? []).map((v) => [v.name, v.default ?? ""]));
const [values, setValues] = useLocalStorage(storageKey, defaults);

const rendered = renderPrompt(prompt, values);

<CopyButton text={rendered} />
```

```typescript
// apps/web/src/hooks/use-local-storage.ts (sketch)
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initial;
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue] as const;
}
```

```tsx
// apps/web/src/components/prompt-detail-sheet.tsx (sketch)
// Mobile bottom-sheet with fixed action bar + thumb-friendly inputs
import { Drawer } from "@/components/ui/drawer";

export function PromptDetailSheet({ prompt, open, onOpenChange }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* Variable inputs + rendered preview */}
      {/* Fixed bottom bar: Copy / Install / Download */}
    </Drawer>
  );
}
```

### 7.3 SpotlightSearch Component

Adapted from `/data/projects/brenner_bot/apps/web/src/components/search/SpotlightSearch.tsx`:

```tsx
// apps/web/src/components/spotlight-search.tsx

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Prompt } from "@jeffreysprompts/core/prompts";
type SearchResult = import("@/lib/search/engine").SearchResult;

export function SpotlightSearch({ source }: { source: Prompt[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle selection - copy prompt content
  const handleSelect = useCallback((result: SearchResult) => {
    navigator.clipboard.writeText(result.content);
    setOpen(false);
    setQuery("");
  }, []);

  // Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when open
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  // Search on query change (debounced, lazy-loaded only when open)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (query.trim() && source.length) {
        import("@/lib/search/engine").then(({ searchPrompts }) => {
          if (cancelled) return;
          setResults(searchPrompts(query, 20, source));
          setSelectedIndex(0);
        });
      } else {
        setResults([]);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex, handleSelect]
  );

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "absolute top-[20%] left-1/2 -translate-x-1/2",
            "w-full max-w-xl",
            "bg-card rounded-2xl shadow-2xl border border-border/50",
            "overflow-hidden"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Search className="size-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search prompts..."
              className={cn(
                "flex-1 bg-transparent outline-none",
                "text-foreground placeholder:text-muted-foreground"
              )}
            />
            <kbd className="px-2 py-0.5 text-xs bg-muted rounded text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {results.length > 0 ? (
              results.map((result, i) => (
                <div
                  key={result.id}
                  className={cn(
                    "px-4 py-3 cursor-pointer transition-colors",
                    i === selectedIndex
                      ? "bg-primary/10"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => handleSelect(result)}
                >
                  <div className="font-medium text-foreground">
                    {result.title}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {result.description}
                  </div>
                </div>
              ))
            ) : query.trim() ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No results for "{query}"
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground">
                Start typing to search prompts...
              </div>
            )}
          </div>

          {/* Footer hints */}
          <div className="px-4 py-2 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">ESC</kbd>
              Close
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
```

---

### 7.4 Prompt Permalink Pages (SEO + Sharing)

Add `/prompts/[id]` pages with:
- full prompt content
- copy + install buttons
- download SKILL.md + markdown buttons
- related prompts (tag overlap + BM25)
- metadata (author, version, updated)
- changelog accordion (“What changed”) when `prompt.changelog` exists

Use `generateStaticParams` for pre-rendered pages.

### 7.5 Bundle Index Page

Add `/bundles` as a listing page:
- featured bundles first
- short “workflow” preview
- one-click install/download

### 7.6 Bundle Permalink Pages

Add `/bundles/[id]` with:
- bundle description
- included prompts
- one-click “Download as Skill Bundle”

Use `generateStaticParams` for pre-rendered bundle pages.

### 7.7 Workflow Builder (Differentiator)

Let users assemble multi-step workflows:
- choose prompts as steps
- reorder steps
- add short “handoff notes”
- export as markdown or skill bundle

### 7.8 Contribution Page (No DB Required)

Provide a `/contribute` page that:
- collects prompt metadata
- renders a TypeScript object entry
- links to a prefilled GitHub issue/PR

### 7.9 PWA + Offline Support

Add a PWA manifest + service worker:
- cache `/registry.json`, `/registry.manifest.json`, and static assets
- show an offline banner when using cached data
- use SWR-style client fetch to revalidate in background
- optional runtime cache for `/api/prompts` (unfiltered) with `/registry.json` as offline fallback
- keep BM25 search in-browser so offline search still works

### 7.10 Error Boundaries + Privacy Analytics

- Error boundaries around search + prompt grid with fallback UI
- Optional, privacy-respecting analytics (e.g., Plausible) for:
  - prompt_view, prompt_copy
  - search (query length + result count; emit zero_results when count == 0; optionally hash query)
  - export and skill_install
  - workflow_copy

### 7.11 Health Endpoint

Add `GET /api/health` returning:
- status
- prompt count
- build/version
- timestamp
- responseTimeMs

Used for uptime checks and deployment verification.

```typescript
// apps/web/src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { prompts } from "@jeffreysprompts/core/prompts";

export async function GET() {
  const start = Date.now();
  const payload = {
    status: "ok",
    promptCount: prompts.length,
    version: process.env.NEXT_PUBLIC_GIT_SHA ?? "dev",
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - start,
  };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
```

---

## Part 8: Implementation Phases

### Phase 1: Foundation (Day 1)

1. **Initialize monorepo structure**
   ```bash
   mkdir -p apps/web scripts .claude/skills/prompt-formatter .claude/skills/skill-maker
   bun init
   ```

2. **Create Next.js 16 app**
   ```bash
   cd apps/web
   bun create next-app . --typescript --tailwind --eslint --app --src-dir
   bun add framer-motion lucide-react clsx tailwind-merge class-variance-authority
   bun add zod jszip
   bun add -d vitest happy-dom @testing-library/react
   ```

3. **Copy design system from brennerbot**
   - Copy `globals.css` (3,531 lines)
   - Copy base UI components (button, card, badge, dialog, toast, copy-button)
   - Set up Geist fonts

4. **Create shared prompt package**
   - `packages/core/package.json`
   - `packages/core/src/index.ts` (re-exports)
   - `packages/core/src/prompts/types.ts`
   - `packages/core/src/prompts/registry.ts` with first 3 prompts
   - `packages/core/src/prompts/schema.ts`
   - `packages/core/src/search/bm25.ts`
   - `packages/core/src/template/render.ts`

5. **Add data pipeline scripts**
   - `scripts/validate-prompts.ts`
   - `scripts/build-data.ts`

### Phase 2: Core UI (Day 2)

1. **Build main page layout**
   - Hero section with stats
   - Search bar with Cmd+K trigger
   - Category filter pills
   - Prompt grid

2. **Implement PromptCard**
   - Title, description, tags
   - Copy button
   - Add to basket button
   - Preview expansion

3. **Build SpotlightSearch**
   - Command palette UI
   - Keyboard navigation
   - BM25 search (lazy-loaded)

### Phase 3: Export System (Day 3)

1. **Implement export functions**
   - `packages/core/src/export/markdown.ts`
   - `packages/core/src/export/skills.ts`

2. **Build Basket component**
   - Selected prompts list
   - Export buttons
   - Clear all

3. **Create API routes**
   - `GET /api/prompts` → filtered JSON
   - `GET /registry.json` → full registry payload (static)
   - `GET /registry.manifest.json` → checksum manifest (static)
   - `GET /api/skills/[id]` → SKILL.md
   - `GET /api/health` → status
   - `GET /install.sh` → Shell script

### Phase 4: CLI Tool (Day 4)

1. **Create jfp.ts structure**
   - Arg parsing (cac)
   - Command routing
   - Help system

2. **Implement commands**
   - `list`, `search`, `suggest`, `show`, `copy`
   - `render`, `open`, `registry status/refresh`
   - `install`, `uninstall`, `installed`, `update`
   - `skill install|uninstall|installed|update` (aliases)
   - `doctor`
   - `interactive`, `completion`

3. **Build and test**
   - `bun build --compile`
   - Cross-platform builds
   - CLI tests

### Phase 5: Skills Integration (Day 5)

1. **Create project skills**
   - `.claude/skills/prompt-formatter/SKILL.md` — Convert raw text → TypeScript registry
   - `.claude/skills/skill-maker/SKILL.md` — Convert prompts → SKILL.md (meta-skill)

2. **Implement install buttons on web**
   - Single skill install
   - Bulk install

3. **Test full workflow**
   - Web → install → Claude Code

### Phase 6: Deploy & Polish (Day 6)

1. **Configure Vercel**
   - `vercel.json`
   - Environment variables
   - Custom domain

2. **Set up Cloudflare DNS**
   - CNAME records
   - SSL verification

3. **Add PWA + offline support**
   - manifest + service worker
   - offline banner

4. **Add privacy analytics + error boundaries**
   - capture copy/search/export events
   - graceful fallbacks

5. **Add registry SWR + local prompts**
   - CLI cache refresh
   - merge local prompts

6. **Final polish**
   - Accessibility audit
   - Mobile testing
   - Performance optimization

### Phase 7: Differentiators (Week 2)

1. **Workflow builder UI**
2. **Contribution flow page**
3. **Prompt changelog display**

### Phase 8: Agent-Native (Week 3)

1. **MCP server mode (`jfp serve`)**
2. **Publish MCP config snippet**

### Phase 9: Optional Semantic Rerank (Week 4)

1. Add transformers dependency
2. Implement semantic rerank toggle (web + CLI)

---

## Part 9: Success Metrics

### Web App
- [ ] Lighthouse score >90 (all categories)
- [ ] First Contentful Paint <1s
- [ ] Time to Interactive <2s
- [ ] CLS < 0.1, INP < 200ms (lab)
- [ ] Mobile: Works on iPhone SE through iPad Pro
- [ ] Copy-to-clipboard works in Safari, Chrome, Firefox
- [ ] Dark mode works correctly
- [ ] Prompt permalink pages indexable
- [ ] Offline/PWA mode usable

### CLI
- [ ] Binary size <50MB
- [ ] Startup time <100ms
- [ ] `jfp` no-args shows help in <50ms
- [ ] Interactive mode feels instant
- [ ] Works on Linux, macOS, Windows
- [ ] Registry SWR refresh succeeds silently
- [ ] `jfp render` handles variables + context safely

### Skills
- [ ] `jfp install --all` completes in <5s
- [ ] Installed skills appear in Claude Code
- [ ] Skills work correctly when invoked
- [ ] `jfp update --dry-run` shows diffs without writing

### Content
- [ ] All prompts have complete metadata
- [ ] All prompts validate against TypeScript types
- [ ] Search returns relevant results
- [ ] Zero-result searches < 10%

### Analytics (Privacy-Respecting)
- [ ] Copy rate ≥ 25%
- [ ] Install conversion tracked (no PII)

---

## Part 10: "How It Was Made" — The Meta-Story Page

### 10.1 Concept Overview

**URL:** `jeffreysprompts.com/how_it_was_made`

This is a unique, self-referential feature: a dedicated page that tells the complete story of how JeffreysPrompts.com was designed, planned, and implemented **in a single day** using Claude Code.

The page will contain:
1. **The Complete Claude Code Session Transcript** — Every message, tool call, edit, and decision
2. **Visual Presentation** — Syntax highlighting, collapsible sections, timeline visualization
3. **Analytical Commentary** — Annotations explaining key decisions and patterns
4. **Meta-Insights** — What worked well, what prompts were used, lessons learned

This is "eating your own dogfood" at its most recursive: using the prompts to build the site that showcases the prompts, then documenting that process as content for the site.

### 10.2 Why This Page Matters

**For Developers:**
- See a real-world example of agentic coding from start to finish
- Learn prompt engineering patterns from actual successful usage
- Understand how to structure complex planning sessions with AI

**For the AI/Tech Community:**
- Demonstrates transparency in AI-assisted development
- Provides a case study for AI coding agent capabilities
- Shows the practical reality of "vibe coding" / "prompt-driven development"

**For Jeffrey:**
- Unique content that no competitor can replicate
- Living proof of the prompts' effectiveness
- SEO-rich, highly shareable long-form content

**As Marketing:**
- "Built in a day with AI" is a compelling hook
- The transcript IS the product demo
- Creates social proof for the prompts themselves

### 10.3 Transcript Extraction Using `cass` (Claude Agent Session Search)

The Claude Code session transcript is stored locally in JSONL format. The `cass` tool provides a "robot mode" interface for searching and extracting these sessions.

#### What is `cass`?

`cass` is a CLI tool that indexes and searches Claude Code session transcripts. It provides:
- Full-text search across all sessions
- Filtering by date, project, model
- JSON output for programmatic access
- Transcript extraction in multiple formats

#### Session Location

Claude Code stores sessions at:
```
$HOME/.claude/projects/<project-hash>/<session-id>.jsonl
```

For this project:
```
$HOME/.claude/projects/-data-projects-jeffreysprompts-com/<session-id>.jsonl
```

#### Extraction Process

**Step 1: Find the session**

```bash
# List recent sessions for this project
cass list --project jeffreysprompts --limit 10 --json

# Search for sessions containing specific content
cass search "PLAN_TO_MAKE_JEFFREYSPROMPTS" --json

# Get session by date range
cass list --after "2026-01-09T00:00:00" --before "2026-01-10T00:00:00" --json
```

**Step 2: Extract the full transcript**

```bash
# Export as structured JSON (includes all metadata)
cass export <session-id> --format json > session.json

# Export as markdown (human-readable)
cass export <session-id> --format markdown > session.md

# Export with tool call details expanded
cass export <session-id> --format json --expand-tools > session-full.json
```

**Step 3: Process for display**

The raw JSONL contains:
- `type`: Message type (user, assistant, tool_use, tool_result)
- `content`: Message content (text or structured)
- `timestamp`: When the message occurred
- `model`: Which Claude model was used
- `tool_name`: For tool calls, which tool was invoked
- `tool_input`: Parameters passed to the tool
- `tool_output`: Result returned by the tool

#### Robot Mode Output Format

When using `cass` in robot mode (piped output or `--json`), it returns:

```json
{
  "session": {
    "id": "de731228-a391-4ae5-a06f-0fe0badbd347",
    "project": "jeffreysprompts.com",
    "started": "2026-01-09T10:23:45Z",
    "ended": "2026-01-09T18:45:12Z",
    "model": "claude-opus-4-5-20251101",
    "messageCount": 247,
    "toolCallCount": 892,
    "tokensUsed": 1847293
  },
  "messages": [
    {
      "type": "user",
      "timestamp": "2026-01-09T10:23:45Z",
      "content": "Let's build jeffreysprompts.com..."
    },
    {
      "type": "assistant",
      "timestamp": "2026-01-09T10:23:52Z",
      "content": "I'll help you build...",
      "toolCalls": [
        {
          "name": "Read",
          "input": { "file_path": "/data/projects/jeffreysprompts.com/AGENTS.md" },
          "output": "# AGENTS.md — JeffreysPrompts.com Project..."
        }
      ]
    }
  ]
}
```

### 10.4 Data Processing Pipeline

The raw transcript needs processing before display:

### 10.4.5 Redaction + Publication Safety (NEW, REQUIRED)

Before committing or deploying transcript data:
1. Run a redaction pass to remove secrets (API keys, tokens), usernames, and absolute home paths.
2. Run a publication validator that fails CI if suspicious patterns remain.

Scripts:
- `scripts/redact-transcript.ts` → produces `transcript.redacted.json`
- `scripts/validate-publication.ts` → exits non-zero on leaks

```typescript
// apps/web/src/lib/transcript/types.ts

export interface TranscriptMessage {
  id: string;
  type: "user" | "assistant" | "tool_use" | "tool_result" | "system";
  timestamp: string;
  content: string;
  toolCalls?: ToolCall[];
  thinking?: string;  // Extended thinking content
  model?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output: string;
  duration?: number;
  success: boolean;
}

export interface TranscriptSection {
  id: string;
  title: string;
  summary: string;
  startIndex: number;
  endIndex: number;
  tags: string[];  // e.g., ["planning", "implementation", "review"]
}

export interface ProcessedTranscript {
  meta: {
    sessionId: string;
    project: string;
    startTime: string;
    endTime: string;
    duration: string;
    model: string;
    stats: {
      userMessages: number;
      assistantMessages: number;
      toolCalls: number;
      filesEdited: number;
      linesWritten: number;
      tokensUsed: number;
    };
  };
  sections: TranscriptSection[];
  messages: TranscriptMessage[];
  highlights: TranscriptHighlight[];
}

export interface TranscriptHighlight {
  messageId: string;
  type: "key_decision" | "interesting_prompt" | "clever_solution" | "lesson_learned";
  annotation: string;
}
```

```typescript
// apps/web/src/lib/transcript/processor.ts

import {
  type ProcessedTranscript,
  type TranscriptMessage,
  type TranscriptSection,
  type ToolCall,
} from "./types";

/**
 * Process raw JSONL transcript into structured format for display.
 */
export function processTranscript(rawJsonl: string): ProcessedTranscript {
  const lines = rawJsonl.trim().split("\n").map((line) => JSON.parse(line));

  // Extract messages
  const messages: TranscriptMessage[] = lines
    .filter((line) => line.type === "message")
    .map((msg, i) => ({
      id: `msg-${i}`,
      type: msg.role,
      timestamp: msg.timestamp,
      content: extractContent(msg),
      toolCalls: extractToolCalls(msg),
      thinking: extractThinking(msg),
      model: msg.model,
    }));

  // Auto-detect sections based on content patterns
  const sections = detectSections(messages);

  // Calculate statistics
  const stats = calculateStats(messages);

  return {
    meta: {
      sessionId: lines[0]?.session_id ?? "unknown",
      project: "jeffreysprompts.com",
      startTime: messages[0]?.timestamp ?? "",
      endTime: messages[messages.length - 1]?.timestamp ?? "",
      duration: calculateDuration(messages),
      model: "claude-opus-4-5-20251101",
      stats,
    },
    sections,
    messages,
    highlights: [], // Added manually or via separate annotation pass
  };
}

function detectSections(messages: TranscriptMessage[]): TranscriptSection[] {
  const sections: TranscriptSection[] = [];

  // Detect planning phase (mentions of PLAN document, architecture discussion)
  // Detect implementation phases (file edits, code writing)
  // Detect review phases (ultrathink, looking for errors)

  // Heuristics:
  // - "Use ultrathink" usually starts a deep thinking section
  // - "Let me create a todo list" starts an implementation section
  // - Clusters of Read/Edit tools indicate implementation
  // - User messages with questions indicate planning/decision points

  return sections;
}

function calculateStats(messages: TranscriptMessage[]) {
  return {
    userMessages: messages.filter((m) => m.type === "user").length,
    assistantMessages: messages.filter((m) => m.type === "assistant").length,
    toolCalls: messages.reduce((acc, m) => acc + (m.toolCalls?.length ?? 0), 0),
    filesEdited: countUniqueFilesEdited(messages),
    linesWritten: countLinesWritten(messages),
    tokensUsed: estimateTokens(messages),
  };
}

// Helper functions for processing
function extractContent(msg: any): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
  }
  return "";
}

function extractToolCalls(msg: any): ToolCall[] {
  if (!msg.content || !Array.isArray(msg.content)) return [];
  return msg.content
    .filter((c: any) => c.type === "tool_use")
    .map((c: any, i: number) => ({
      id: c.id || `tool-${i}`,
      name: c.name,
      input: c.input,
      output: "", // Filled in from tool_result messages
      success: true,
    }));
}

function extractThinking(msg: any): string | undefined {
  if (!msg.content || !Array.isArray(msg.content)) return undefined;
  const thinking = msg.content.find((c: any) => c.type === "thinking");
  return thinking?.thinking;
}

function calculateDuration(messages: TranscriptMessage[]): string {
  if (messages.length < 2) return "0m";
  const start = new Date(messages[0].timestamp).getTime();
  const end = new Date(messages[messages.length - 1].timestamp).getTime();
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function countUniqueFilesEdited(messages: TranscriptMessage[]): number {
  const files = new Set<string>();
  for (const msg of messages) {
    for (const tool of msg.toolCalls ?? []) {
      if (["Edit", "Write"].includes(tool.name) && tool.input.file_path) {
        files.add(tool.input.file_path as string);
      }
    }
  }
  return files.size;
}

function countLinesWritten(messages: TranscriptMessage[]): number {
  let lines = 0;
  for (const msg of messages) {
    for (const tool of msg.toolCalls ?? []) {
      if (tool.name === "Write" && tool.input.content) {
        lines += (tool.input.content as string).split("\n").length;
      }
      if (tool.name === "Edit" && tool.input.new_string) {
        lines += (tool.input.new_string as string).split("\n").length;
      }
    }
  }
  return lines;
}

function estimateTokens(messages: TranscriptMessage[]): number {
  // Rough estimate: 4 characters per token
  let chars = 0;
  for (const msg of messages) {
    chars += msg.content.length;
    chars += msg.thinking?.length ?? 0;
    for (const tool of msg.toolCalls ?? []) {
      chars += JSON.stringify(tool.input).length;
      chars += tool.output.length;
    }
  }
  return Math.round(chars / 4);
}
```

```typescript
// apps/web/src/lib/transcript/utils.ts

export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(start: string, end: string): string {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const minutes = Math.round((endMs - startMs) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function detectLanguage(content: string): string {
  // Simple heuristics for syntax highlighting
  if (content.startsWith("{") || content.startsWith("[")) return "json";
  if (content.includes("function ") || content.includes("const ")) return "typescript";
  if (content.includes("def ") || content.includes("import ")) return "python";
  if (content.startsWith("#!") || content.includes("#!/bin/bash")) return "bash";
  if (content.includes("<") && content.includes(">")) return "html";
  return "text";
}
```

```typescript
// apps/web/src/lib/transcript/data.ts

import transcriptData from "@/data/transcript.json";

export async function getTranscriptData(): Promise<string> {
  // In production, this returns the pre-processed JSON
  // For static export, the transcript.json is generated at build time
  return JSON.stringify(transcriptData);
}
```

```tsx
// apps/web/src/components/transcript/message-content.tsx
// Renders markdown-like content with code blocks

"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { detectLanguage } from "@/lib/transcript/utils";

interface MessageContentProps {
  content: string;
}

export function MessageContent({ content }: MessageContentProps) {
  // Split content into text and code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          // Extract language and code
          const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
          const lang = match?.[1] || detectLanguage(match?.[2] || "");
          const code = match?.[2] || part.slice(3, -3);

          return (
            <SyntaxHighlighter
              key={i}
              language={lang}
              style={oneDark}
              customStyle={{ fontSize: "13px", borderRadius: "8px", margin: "1em 0" }}
            >
              {code.trim()}
            </SyntaxHighlighter>
          );
        }

        // Regular text - render with basic formatting
        return (
          <div key={i} className="whitespace-pre-wrap">
            {part}
          </div>
        );
      })}
    </>
  );
}
```

```tsx
// apps/web/src/components/transcript/timeline-skeleton.tsx

export function TimelineSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="size-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-muted rounded" />
            <div className="h-3 w-2/3 bg-muted rounded" />
            <div className="space-y-1">
              {[1, 2].map((j) => (
                <div key={j} className="h-16 bg-muted/50 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

```tsx
// apps/web/src/components/transcript/insight-card.tsx

import { Brain, Lightbulb, CheckCircle, AlertTriangle } from "lucide-react";
import { type TranscriptHighlight } from "@/lib/transcript/types";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  highlight: TranscriptHighlight;
}

export function InsightCard({ highlight }: InsightCardProps) {
  const icons = {
    key_decision: Brain,
    interesting_prompt: Lightbulb,
    clever_solution: CheckCircle,
    lesson_learned: AlertTriangle,
  };

  const colors = {
    key_decision: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    interesting_prompt: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    clever_solution: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    lesson_learned: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  };

  const Icon = icons[highlight.type];

  return (
    <div className={cn("p-4 rounded-xl border", colors[highlight.type])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-5" />
        <span className="font-medium capitalize">
          {highlight.type.replace("_", " ")}
        </span>
      </div>
      <p className="text-foreground">{highlight.annotation}</p>
    </div>
  );
}
```

### 10.5 Visual Presentation Components

#### Timeline View

A vertical timeline showing the flow of the session:

```tsx
// apps/web/src/components/transcript/timeline.tsx

"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type TranscriptMessage, type TranscriptSection } from "@/lib/transcript/types";
import { formatDuration, formatTime } from "@/lib/transcript/utils";

interface TimelineProps {
  messages: TranscriptMessage[];
  sections: TranscriptSection[];
  onSelectMessage?: (id: string) => void;
}

export function TranscriptTimeline({ messages, sections, onSelectMessage }: TimelineProps) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-primary opacity-30" />

      {/* Section markers */}
      {sections.map((section, i) => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative mb-8"
        >
          {/* Section header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {i + 1}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{section.title}</h3>
              <p className="text-sm text-muted-foreground">{section.summary}</p>
            </div>
          </div>

          {/* Messages in this section */}
          <div className="ml-12 space-y-2">
            {messages.slice(section.startIndex, section.endIndex + 1).map((msg) => (
              <MessagePreview
                key={msg.id}
                message={msg}
                onClick={() => onSelectMessage?.(msg.id)}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function MessagePreview({ message, onClick }: { message: TranscriptMessage; onClick?: () => void }) {
  const isUser = message.type === "user";
  const hasTools = message.toolCalls && message.toolCalls.length > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 rounded-lg transition-all",
        "hover:bg-muted/50 hover:scale-[1.01]",
        isUser ? "border-l-2 border-accent" : "border-l-2 border-primary"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={cn(
          "text-xs font-medium uppercase tracking-wider",
          isUser ? "text-accent" : "text-primary"
        )}>
          {isUser ? "Jeffrey" : "Claude"}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatTime(message.timestamp)}
        </span>
        {hasTools && (
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
            {message.toolCalls!.length} tools
          </span>
        )}
      </div>
      <p className="text-sm text-foreground line-clamp-2">
        {message.content.slice(0, 150)}...
      </p>
    </button>
  );
}
```

#### Message Detail View

Full message display with syntax highlighting:

```tsx
// apps/web/src/components/transcript/message-detail.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Code, FileText, Brain, Terminal, Search } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { type TranscriptMessage, type ToolCall } from "@/lib/transcript/types";
import { detectLanguage } from "@/lib/transcript/utils";
import { CopyButton } from "@/components/ui/copy-button";
import { MessageContent } from "./message-content";

interface MessageDetailProps {
  message: TranscriptMessage;
  highlight?: {
    type: string;
    annotation: string;
  };
}

export function MessageDetail({ message, highlight }: MessageDetailProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [showThinking, setShowThinking] = useState(false);

  const isUser = message.type === "user";

  const toggleTool = (toolId: string) => {
    const next = new Set(expandedTools);
    if (next.has(toolId)) {
      next.delete(toolId);
    } else {
      next.add(toolId);
    }
    setExpandedTools(next);
  };

  return (
    <div className={cn(
      "rounded-2xl border p-6",
      isUser ? "bg-accent/5 border-accent/20" : "bg-primary/5 border-primary/20"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "size-10 rounded-full flex items-center justify-center",
            isUser ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
          )}>
            {isUser ? "JE" : "C"}
          </div>
          <div>
            <div className="font-medium">
              {isUser ? "Jeffrey Emanuel" : "Claude (Opus 4.5)"}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
        <CopyButton text={message.content} variant="ghost" size="sm" />
      </div>

      {/* Highlight annotation */}
      {highlight && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium mb-1">
            <Brain className="size-4" />
            {highlight.type.replace("_", " ").toUpperCase()}
          </div>
          <p className="text-sm text-foreground">{highlight.annotation}</p>
        </div>
      )}

      {/* Extended thinking (if present) */}
      {message.thinking && (
        <div className="mb-4">
          <button
            onClick={() => setShowThinking(!showThinking)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showThinking ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            <Brain className="size-4" />
            Extended Thinking
          </button>
          <AnimatePresence>
            {showThinking && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 p-3 rounded-lg bg-muted/50 text-sm font-mono whitespace-pre-wrap overflow-x-auto"
              >
                {message.thinking}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Message content */}
      <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
        <MessageContent content={message.content} />
      </div>

      {/* Tool calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Code className="size-4" />
            Tool Calls ({message.toolCalls.length})
          </div>
          {message.toolCalls.map((tool) => (
            <ToolCallDisplay
              key={tool.id}
              tool={tool}
              expanded={expandedTools.has(tool.id)}
              onToggle={() => toggleTool(tool.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolCallDisplay({ tool, expanded, onToggle }: {
  tool: ToolCall;
  expanded: boolean;
  onToggle: () => void;
}) {
  const getToolIcon = (name: string) => {
    switch (name) {
      case "Read": return <FileText className="size-4" />;
      case "Edit": return <Code className="size-4" />;
      case "Write": return <FileText className="size-4" />;
      case "Bash": return <Terminal className="size-4" />;
      case "Grep": return <Search className="size-4" />;
      default: return <Code className="size-4" />;
    }
  };

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {getToolIcon(tool.name)}
        <span className="font-mono text-sm">{tool.name}</span>
        {tool.input.file_path && (
          <span className="text-xs text-muted-foreground truncate">
            {tool.input.file_path as string}
          </span>
        )}
        <span className={cn(
          "ml-auto text-xs px-1.5 py-0.5 rounded",
          tool.success ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
        )}>
          {tool.success ? "success" : "failed"}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="border-t border-border/50"
          >
            <div className="p-3 space-y-3">
              {/* Input */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
                <SyntaxHighlighter
                  language="json"
                  style={oneDark}
                  customStyle={{ fontSize: "12px", borderRadius: "8px" }}
                >
                  {JSON.stringify(tool.input, null, 2)}
                </SyntaxHighlighter>
              </div>

              {/* Output (truncated if large) */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Output {tool.output.length > 1000 && `(${tool.output.length} chars)`}
                </div>
                <SyntaxHighlighter
                  language={detectLanguage(tool.output)}
                  style={oneDark}
                  customStyle={{ fontSize: "12px", borderRadius: "8px", maxHeight: "300px" }}
                >
                  {tool.output.length > 2000 ? tool.output.slice(0, 2000) + "\n..." : tool.output}
                </SyntaxHighlighter>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

#### Statistics Dashboard

Visual summary of the session:

```tsx
// apps/web/src/components/transcript/stats-dashboard.tsx

"use client";

import { motion } from "framer-motion";
import { Clock, MessageSquare, Wrench, FileCode, Code2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ProcessedTranscript } from "@/lib/transcript/types";

interface StatsDashboardProps {
  transcript: ProcessedTranscript;
}

export function StatsDashboard({ transcript }: StatsDashboardProps) {
  const { meta } = transcript;

  const stats = [
    {
      icon: Clock,
      label: "Duration",
      value: meta.duration,
      color: "text-blue-500",
    },
    {
      icon: MessageSquare,
      label: "Messages",
      value: `${meta.stats.userMessages + meta.stats.assistantMessages}`,
      detail: `${meta.stats.userMessages} user, ${meta.stats.assistantMessages} Claude`,
      color: "text-emerald-500",
    },
    {
      icon: Wrench,
      label: "Tool Calls",
      value: meta.stats.toolCalls.toLocaleString(),
      color: "text-amber-500",
    },
    {
      icon: FileCode,
      label: "Files Edited",
      value: meta.stats.filesEdited.toString(),
      color: "text-purple-500",
    },
    {
      icon: Code2,
      label: "Lines Written",
      value: meta.stats.linesWritten.toLocaleString(),
      color: "text-pink-500",
    },
    {
      icon: Zap,
      label: "Tokens Used",
      value: `${(meta.stats.tokensUsed / 1_000_000).toFixed(2)}M`,
      color: "text-cyan-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="p-4 rounded-xl bg-card border border-border/50"
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={cn("size-5", stat.color)} />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </span>
          </div>
          <div className="text-2xl font-bold">{stat.value}</div>
          {stat.detail && (
            <div className="text-xs text-muted-foreground mt-1">{stat.detail}</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
```

### 10.6 Page Structure

```tsx
// apps/web/src/app/how_it_was_made/page.tsx

import { Suspense } from "react";
import { TranscriptTimeline } from "@/components/transcript/timeline";
import { StatsDashboard } from "@/components/transcript/stats-dashboard";
import { MessageDetail } from "@/components/transcript/message-detail";
import { TimelineSkeleton } from "@/components/transcript/timeline-skeleton";
import { InsightCard } from "@/components/transcript/insight-card";
import { processTranscript } from "@/lib/transcript/processor";
import { getTranscriptData } from "@/lib/transcript/data";

export const metadata = {
  title: "How It Was Made | JeffreysPrompts.com",
  description: "The complete story of how JeffreysPrompts.com was designed, planned, and implemented in a single day using Claude Code.",
  openGraph: {
    title: "How JeffreysPrompts.com Was Built in a Single Day",
    description: "Watch the complete Claude Code session that created this site.",
    type: "article",
  },
};

export default async function HowItWasMadePage() {
  const rawTranscript = await getTranscriptData();
  const transcript = processTranscript(rawTranscript);

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-w-4xl mx-auto text-center relative">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Built in a Single Day
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            The complete, unedited transcript of the Claude Code session that designed,
            planned, and implemented JeffreysPrompts.com — from first message to deployment.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>January 9, 2026</span>
            <span>•</span>
            <span>{transcript.meta.duration}</span>
            <span>•</span>
            <span>{transcript.meta.stats.toolCalls.toLocaleString()} tool calls</span>
          </div>
        </div>
      </section>

      {/* Stats Dashboard */}
      <section className="py-12 px-6 border-y border-border/50 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-lg font-semibold mb-6 text-center">Session Statistics</h2>
          <StatsDashboard transcript={transcript} />
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto prose prose-lg dark:prose-invert">
          <h2>The Story</h2>
          <p>
            On January 9, 2026, I sat down with Claude Code (Opus 4.5) to build
            JeffreysPrompts.com from scratch. What you're about to read is the complete,
            unedited transcript of that session.
          </p>
          <p>
            This page exists for three reasons:
          </p>
          <ol>
            <li>
              <strong>Transparency</strong> — AI-assisted development shouldn't be a black box.
              Here's exactly how the sausage was made.
            </li>
            <li>
              <strong>Education</strong> — The best way to learn prompt engineering is to see
              real examples that worked. This is hundreds of them.
            </li>
            <li>
              <strong>Meta-demonstration</strong> — The prompts on this site helped build this
              site. That's the ultimate proof they work.
            </li>
          </ol>
          <p>
            Scroll through the timeline, expand tool calls to see exactly what code was written,
            and read the annotations I've added to highlight key decisions and patterns.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">The Complete Timeline</h2>
          <Suspense fallback={<TimelineSkeleton />}>
            <TranscriptTimeline
              messages={transcript.messages}
              sections={transcript.sections}
            />
          </Suspense>
        </div>
      </section>

      {/* Key Insights */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Key Insights</h2>
          <div className="space-y-8">
            {transcript.highlights.map((highlight) => (
              <InsightCard key={highlight.messageId} highlight={highlight} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-6 text-center bg-gradient-to-t from-primary/5 to-transparent">
        <h2 className="text-3xl font-bold mb-4">Try the Prompts Yourself</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          The prompts used to build this site are available on the homepage.
          Install them as Claude Code skills and start building.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="/" className="...">Browse Prompts</a>
          <a href="/install.sh" className="...">Install All Skills</a>
        </div>
      </section>
    </main>
  );
}
```

### 10.7 Data Storage

The transcript data can be stored as:

**Option A: Static JSON file (simple)**
```
apps/web/src/data/transcript.json
```
- Pre-processed transcript committed to repo
- Fast to load, no runtime processing
- Updated manually when transcript changes

**Option B: Generated at build time**
```typescript
// scripts/extract-transcript.ts
// Run: bun run scripts/extract-transcript.ts

import { $ } from "bun";

const sessionId = process.env.SESSION_ID || await findSessionId();
const result = await $`cass export ${sessionId} --format json --expand-tools`;

await Bun.write(
  "apps/web/src/data/transcript.json",
  JSON.stringify(JSON.parse(result.stdout.toString()), null, 2)
);
```

After processing, run:
- `bun run scripts/redact-transcript.ts`
- `bun run scripts/validate-publication.ts`

**Option C: API route for dynamic loading**
```typescript
// apps/web/src/app/api/transcript/route.ts
// Only for development — production should use static data
```

### 10.8 Annotation System

To add commentary to specific messages:

```typescript
// apps/web/src/data/annotations.ts

export const annotations: Record<string, Annotation> = {
  "msg-42": {
    type: "key_decision",
    annotation: "This is where we decided to use TypeScript-native prompts instead of markdown files. The reasoning: type safety, IDE support, and no parsing overhead.",
  },
  "msg-147": {
    type: "interesting_prompt",
    annotation: "Notice how the 'ultrathink' directive here triggered an especially thorough analysis. The 30→5 idea funnel pattern emerged from this thinking.",
  },
  "msg-203": {
    type: "clever_solution",
    annotation: "The skill-maker meta-skill concept — a skill that creates skills — emerged here. This is the kind of recursive elegance that makes prompt engineering fun.",
  },
  "msg-891": {
    type: "lesson_learned",
    annotation: "Third review caught the missing API routes. The lesson: always check that referenced components actually exist, especially when the plan is large.",
  },
};
```

### 10.9 SEO & Social Sharing

```tsx
// Structured data for search engines
<script type="application/ld+json">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How JeffreysPrompts.com Was Built in a Single Day with Claude Code",
  "author": {
    "@type": "Person",
    "name": "Jeffrey Emanuel",
    "url": "https://twitter.com/doodlestein"
  },
  "datePublished": "2026-01-09",
  "description": "Complete transcript of the AI-assisted development session...",
  "publisher": {
    "@type": "Organization",
    "name": "JeffreysPrompts.com"
  }
})}
</script>
```

### 10.10 Implementation Phase Addition

Add to Phase 6 (or create Phase 7):

**Phase 6.5: Making-Of Page**

1. **Extract transcript using cass**
   ```bash
   cass list --project jeffreysprompts --limit 1 --json
   cass export <session-id> --format json --expand-tools > transcript.json
   bun run scripts/process-transcript.ts
   ```

2. **Create transcript components**
   - `apps/web/src/components/transcript/timeline.tsx`
   - `apps/web/src/components/transcript/message-detail.tsx`
   - `apps/web/src/components/transcript/stats-dashboard.tsx`

3. **Build the page**
   - `apps/web/src/app/how_it_was_made/page.tsx`
   - Add annotations to `apps/web/src/data/annotations.ts`

4. **Add to navigation**
   - Link in footer
   - Maybe a "Making Of" badge in header

---

## Appendix A: File-by-File Copy List from brennerbot.org

| Source | Destination | Modifications |
|--------|-------------|---------------|
| `/data/projects/brenner_bot/apps/web/src/app/globals.css` | `apps/web/src/app/globals.css` | Remove brenner-specific colors |
| `/data/projects/brenner_bot/apps/web/src/components/ui/button.tsx` | `apps/web/src/components/ui/button.tsx` | None |
| `/data/projects/brenner_bot/apps/web/src/components/ui/card.tsx` | `apps/web/src/components/ui/card.tsx` | None |
| `/data/projects/brenner_bot/apps/web/src/components/ui/badge.tsx` | `apps/web/src/components/ui/badge.tsx` | None |
| `/data/projects/brenner_bot/apps/web/src/components/ui/dialog.tsx` | `apps/web/src/components/ui/dialog.tsx` | None |
| `/data/projects/brenner_bot/apps/web/src/components/ui/toast.tsx` | `apps/web/src/components/ui/toast.tsx` | None |
| `/data/projects/brenner_bot/apps/web/src/components/ui/copy-button.tsx` | `apps/web/src/components/ui/copy-button.tsx` | Remove ReferenceCopyButton |
| `/data/projects/brenner_bot/apps/web/src/lib/utils.ts` | `apps/web/src/lib/utils.ts` | None |

---

## Appendix B: Dependencies

### Web App (`apps/web/package.json`)

```json
{
  "dependencies": {
    "next": "16.x",
    "react": "19.x",
    "react-dom": "19.x",
    "framer-motion": "^12.x",
    "lucide-react": "^0.x",
    "clsx": "^2.x",
    "tailwind-merge": "^3.x",
    "class-variance-authority": "^0.x",
    "zod": "^3.x",
    "jszip": "^3.x",
    "@radix-ui/react-dialog": "^1.x",
    "@radix-ui/react-tooltip": "^1.x",
    "react-syntax-highlighter": "^15.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/postcss": "^4.x",
    "vitest": "^4.x",
    "happy-dom": "^20.x",
    "@testing-library/react": "^16.x",
    "eslint": "^9.x",
    "eslint-config-next": "^16.x",
    "oxlint": "^1.x"
  }
}
```

**Optional (semantic rerank):**
- `@xenova/transformers` (lazy-loaded; only if semantic mode is enabled)

**Optional (PWA):**
- `next-pwa` or a small custom service worker

### CLI (root devDependencies for jfp.ts)

```json
{
  "devDependencies": {
    "chalk": "^5.x",
    "boxen": "^8.x",
    "cli-table3": "^0.x",
    "@inquirer/prompts": "^7.x",
    "cac": "^6.x"
  }
}
```

**Note:** The CLI imports prompt types and registry from `packages/core/`. Bun's `--compile` bundles everything into a single binary, so no runtime dependency resolution is needed.

---

*This plan provides a complete, actionable blueprint for building JeffreysPrompts.com with world-class UX, TypeScript-native architecture, seamless Claude Code skills integration, and a meta "Making-Of" page that documents the entire development process.*

---

## Part 11: GitHub Actions CI/CD Pipeline

A production-grade CI/CD pipeline ensures code quality, automated releases, and secure binary distribution.

### 11.1 CI Workflow (Every Push/PR)

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  build-cli-binaries:
    name: Build CLI (${{ matrix.target }})
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: linux-x64
            os: ubuntu-latest
            bun-target: bun-linux-x64
          - target: linux-arm64
            os: ubuntu-latest
            bun-target: bun-linux-arm64
          - target: darwin-x64
            os: macos-latest
            bun-target: bun-darwin-x64
          - target: darwin-arm64
            os: macos-latest
            bun-target: bun-darwin-arm64
          - target: windows-x64
            os: windows-latest
            bun-target: bun-windows-x64

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build data assets
        run: bun run scripts/build-data.ts

      - name: Build CLI
        run: bun build --compile ./jfp.ts --target ${{ matrix.bun-target }} --outfile dist/jfp-${{ matrix.target }}

      - name: Upload CLI artifacts
        uses: actions/upload-artifact@v4
        with:
          name: jfp-${{ matrix.target }}
          path: dist/jfp-${{ matrix.target }}*

  release:
    name: GitHub Release
    needs: build-cli-binaries
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download CLI artifacts
        uses: actions/download-artifact@v4
        with:
          path: release/

      - name: Create checksums
        run: |
          cd release
          find . -type f -maxdepth 2 -print0 | xargs -0 sha256sum > SHA256SUMS.txt

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: release/**
```yaml
# .github/dependabot.yml
version: 2
updates:
  # Bun uses bun.lock; Dependabot doesn't support it yet.
  # Use Renovate or manual updates for JS dependencies.

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    commit-message:
      prefix: "ci"
```

### 11.4 Checksum Verification

The release includes `SHA256SUMS.txt` for binary verification:

```bash
# Verify downloaded binary (example)
curl -L https://github.com/Dicklesworthstone/jeffreysprompts.com/releases/latest/download/jfp-linux-x64 -o jfp
curl -L https://github.com/Dicklesworthstone/jeffreysprompts.com/releases/latest/download/SHA256SUMS.txt -o SHA256SUMS.txt
sha256sum -c SHA256SUMS.txt --ignore-missing
chmod +x jfp
```

---

## Part 12: Ecosystem Integration

### 12.1 About the Author Section (README)

Add to README.md after the "Design Philosophy" section:

```markdown
---

## About the Author

Jeffrey Emanuel ([@doodlestein](https://twitter.com/doodlestein)) is a software engineer and AI researcher focused on agentic coding workflows.

| Resource | Description |
|----------|-------------|
| **[jeffreyemanuel.com](https://jeffreyemanuel.com)** | Personal site with blog, projects, and contact info |
| **[agent-flywheel.com](https://agent-flywheel.com)** | The Agent Flywheel — unified tooling for agentic engineering |

### Part of the Agent Flywheel Ecosystem

JeffreysPrompts.com is one component of a larger ecosystem for agentic coding:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THE AGENT FLYWHEEL ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐        │
│  │ agent-flywheel   │   │ jeffreysprompts  │   │ coding-agent     │        │
│  │ .com             │   │ .com             │   │ -session-search  │        │
│  │                  │   │                  │   │ (cass)           │        │
│  │ Setup &          │   │ Curated prompts  │   │ Search your      │        │
│  │ onboarding       │──▶│ for agents       │──▶│ Claude sessions  │        │
│  │                  │   │                  │   │                  │        │
│  └──────────────────┘   └──────────────────┘   └──────────────────┘        │
│           │                      │                      │                   │
│           ▼                      ▼                      ▼                   │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │                     YOUR AGENTIC WORKSTATION                      │      │
│  │  • Claude Code, Codex CLI, Gemini CLI (three agents)             │      │
│  │  • NTM orchestration (multi-agent workflows)                     │      │
│  │  • tmux persistence (sessions survive disconnects)               │      │
│  │  • Modern terminal (zsh + oh-my-zsh + powerlevel10k)            │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Want the Full Setup?

If you want the complete agentic coding environment (not just the prompts):

1. Visit **[agent-flywheel.com](https://agent-flywheel.com)**
2. Run the setup wizard
3. Get a fully-configured VPS with all tooling in ~15 minutes

The flywheel includes:
- **Three coding agents**: Claude Code, Codex CLI, Gemini CLI
- **NTM**: Multi-agent orchestration with the command palette
- **Modern terminal**: zsh + oh-my-zsh + powerlevel10k + fzf + zoxide
- **Session search**: [`cass`](https://github.com/Dicklesworthstone/coding_agent_session_search) for searching Claude Code transcripts
- **All of Jeffrey's prompts**: Pre-installed as Claude Code skills

> **Note**: `cass` (coding-agent-session-search) provides full-text and semantic search over Claude Code session transcripts and is a useful reference for agent-centric retrieval UX.
```

### 12.2 Web App Footer Integration

```tsx
// apps/web/src/components/footer.tsx

import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-bold text-lg mb-2">JeffreysPrompts.com</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Curated prompts for agentic coding. Browse, copy, install as Claude Code skills.
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Jeffrey Emanuel. MIT License.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-muted-foreground hover:text-foreground">Browse Prompts</Link></li>
              <li><Link href="/how_it_was_made" className="text-muted-foreground hover:text-foreground">How It Was Made</Link></li>
              <li><Link href="/install.sh" className="text-muted-foreground hover:text-foreground">Install All Skills</Link></li>
              <li><a href="https://github.com/Dicklesworthstone/jeffreysprompts.com" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                GitHub <ExternalLink className="size-3" />
              </a></li>
            </ul>
          </div>

          {/* Ecosystem */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Ecosystem</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://jeffreyemanuel.com" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                jeffreyemanuel.com <ExternalLink className="size-3" />
              </a></li>
              <li><a href="https://agent-flywheel.com" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                Agent Flywheel <ExternalLink className="size-3" />
              </a></li>
              <li><a href="https://twitter.com/doodlestein" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                @doodlestein <ExternalLink className="size-3" />
              </a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

### 12.3 CLI `jfp about` Command

```typescript
// Add to jfp.ts (VERSION is already imported in section 3.3)

function showAbout() {
  const banner = `
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   jfp — Jeffrey's Favorite Prompts                               ║
║   v${VERSION}                                                           ║
║                                                                  ║
║   Curated prompts for agentic coding                             ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   Author:     Jeffrey Emanuel (@doodlestein)                     ║
║   Website:    https://jeffreysprompts.com                        ║
║   Personal:   https://jeffreyemanuel.com                         ║
║   Flywheel:   https://agent-flywheel.com                         ║
║   GitHub:     https://github.com/Dicklesworthstone              ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   Part of the Agent Flywheel Ecosystem                           ║
║                                                                  ║
║   The Agent Flywheel provides:                                   ║
║   • Full agentic workstation setup (VPS + tooling)               ║
║   • Three coding agents (Claude, Codex, Gemini)                  ║
║   • NTM multi-agent orchestration                                ║
║   • Session search with 'cass'                                   ║
║                                                                  ║
║   Visit agent-flywheel.com to get started.                       ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`;
  console.log(banner);
}
```

### 12.4 MCP Server Mode (NEW)

Expose prompts to agents via MCP:

- `jfp serve` starts an MCP server over stdio
- Resource: `prompt://<id>` returns prompt content
- Tools: `search_prompts`, `render_prompt`

Provide a copy-paste snippet for Claude Desktop configuration.
Tool schemas are defined in Part 6.9.

---

## Part 13: Prompt Bundles & Collections

### 13.1 Bundle Type Definitions

```typescript
// packages/core/src/prompts/bundles.ts

import { type Prompt } from "./types";
import { prompts, getPrompt } from "./registry";

export interface Bundle {
  /** Unique identifier (kebab-case) */
  id: string;

  /** Human-readable title */
  title: string;

  /** One-line description */
  description: string;

  /** Prompt IDs included in this bundle */
  promptIds: string[];

  /** Suggested workflow for using these prompts together */
  workflow: string;

  /** When to use this bundle */
  whenToUse: string[];

  /** Bundle author */
  author: string;

  /** Featured on homepage */
  featured?: boolean;

  /** Icon for display (Lucide icon name) */
  icon?: string;
}

/**
 * Curated prompt bundles.
 */
export const bundles: Bundle[] = [
  {
    id: "getting-started",
    title: "Getting Started Bundle",
    description: "Jeffrey's three essential meta-prompts for any project",
    promptIds: ["idea-wizard", "readme-reviser", "robot-mode-maker"],
    workflow: `
## Recommended Workflow

Use these prompts in sequence for maximum impact:

1. **Idea Wizard** → Brainstorm 30 ideas, distill to best 5
   - Run at project start or when feeling stuck
   - Produces actionable improvement roadmap

2. **Implement** → Build the top ideas from step 1
   - Focus on the highest-impact improvements
   - Don't try to do everything at once

3. **README Reviser** → Update documentation
   - Run after implementing features
   - Ensures docs reflect actual capabilities

4. **Robot-Mode Maker** → Add agent-friendly CLI
   - Run if your project needs programmatic access
   - Creates JSON-output CLI for agents

5. **Repeat** → Start again with Idea Wizard
   - Each cycle improves the project further
   - The prompts reference each other for continuity
    `,
    whenToUse: [
      "Starting a new project from scratch",
      "Taking over an undocumented codebase",
      "Preparing for a major release",
      "When you want a structured improvement cycle",
    ],
    author: "Jeffrey Emanuel",
    featured: true,
    icon: "Rocket",
  },
  {
    id: "documentation-suite",
    title: "Documentation Suite",
    description: "Documentation prompts (growing collection)",
    promptIds: ["readme-reviser"],
    workflow: `
## Documentation Workflow

**Currently includes:**

1. **README Reviser** → Ensure README reflects actual code
   - Cross-reference implemented features with docs
   - Add missing sections for undocumented features

**Coming soon** (as the registry grows):
- API documentation generator
- Changelog writer
- Code comment enhancer
- Architecture documentation
    `,
    whenToUse: [
      "Before releasing a new version",
      "When onboarding new contributors",
      "After major refactoring",
    ],
    author: "Jeffrey Emanuel",
    featured: false,  // Not featured until it has more prompts
    icon: "FileText",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DERIVED DATA
// ─────────────────────────────────────────────────────────────────────────────

/** Featured bundles for homepage */
export const featuredBundles = bundles.filter((b) => b.featured);

/** Bundle lookup by ID */
export const bundlesById = new Map(bundles.map((b) => [b.id, b]));

/** Get bundle by ID */
export function getBundle(id: string): Bundle | undefined {
  return bundlesById.get(id);
}

/** Get prompts included in a bundle */
export function getBundlePrompts(bundleId: string): Prompt[] {
  const bundle = getBundle(bundleId);
  if (!bundle) return [];
  return bundle.promptIds
    .map((id) => getPrompt(id))
    .filter((p): p is Prompt => p !== undefined);
}

/** Generate combined SKILL.md for a bundle */
export function generateBundleSkillMd(bundle: Bundle): string {
  const q = (value: unknown) => JSON.stringify(value);
  const prompts = getBundlePrompts(bundle.id);

  const promptSections = prompts.map((p, i) => `
## ${i + 1}. ${p.title}

${p.content}
`).join("\n---\n");

  return `---
name: ${q(bundle.id)}
description: ${q(bundle.description)}
author: ${q(bundle.author)}
source: ${q(`https://jeffreysprompts.com/bundles/${bundle.id}`)}
x_jfp_generated: true
---

# ${bundle.title}

${bundle.description}

## Included Prompts

${prompts.map((p, i) => `${i + 1}. **${p.title}** — ${p.description}`).join("\n")}

---

${promptSections}

---

${bundle.workflow}

---

## When to Use This Bundle

${bundle.whenToUse.map((w) => `- ${w}`).join("\n")}

---

*From [JeffreysPrompts.com](https://jeffreysprompts.com/bundles/${bundle.id}) by ${bundle.author}*
`;
}
```

### 13.1.5 Workflow Definitions (NEW)

Workflows are curated multi-step sequences that teach chaining:

```typescript
// packages/core/src/prompts/workflows.ts

export interface WorkflowStep {
  id: string;
  promptId: string;
  note?: string; // handoff instructions
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  steps: WorkflowStep[];
  whenToUse: string[];
}
```

### 13.2 CLI Bundle Commands

> **Note**: The canonical CLI implementation is in **Part 6**. The code below shows the simplified
> bundle-specific logic for reference. In jfp.ts, these functions use dynamic imports
> (see `bundlesCommand` and `bundleShowCommand` in Part 6.1).

```typescript
// Reference implementation — see Part 6 for full CLI integration

// jfp bundles — List available bundles
async function bundlesCommand(flags: Flags) {
  if (flags.json) {
    printJson(bundles.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      promptCount: b.promptIds.length,
      prompts: b.promptIds,
    })), flags);
    return;
  }

  console.log(chalk.bold("Available Bundles:\n"));
  for (const bundle of bundles) {
    console.log(`  ${chalk.cyan(bundle.id)}`);
    console.log(`  ${bundle.title}`);
    console.log(chalk.dim(`  ${bundle.description}`));
    console.log(chalk.dim(`  Includes: ${bundle.promptIds.join(", ")}`));
    console.log();
  }
}

// jfp bundle show <id> — Show bundle details
async function bundleShowCommand(id: string, flags: Flags) {
  const bundle = getBundle(id);
  if (!bundle) {
    console.error(chalk.red(`Bundle not found: ${id}`));
    console.error(chalk.dim(`Available: ${bundles.map((b) => b.id).join(", ")}`));
    process.exit(1);
  }

  if (flags.json) {
    printJson({
      ...bundle,
      prompts: getBundlePrompts(bundle.id),
    }, flags);
    return;
  }

  console.log(chalk.bold(`# ${bundle.title}\n`));
  console.log(`${chalk.dim("Description:")} ${bundle.description}`);
  console.log(`${chalk.dim("Author:")} ${bundle.author}`);
  console.log();

  console.log(chalk.bold("Included Prompts:"));
  const prompts = getBundlePrompts(bundle.id);
  for (const [i, prompt] of prompts.entries()) {
    console.log(`  ${i + 1}. ${chalk.cyan(prompt.title)}`);
    console.log(chalk.dim(`     ${prompt.description}`));
  }

  console.log();
  console.log(chalk.bold("Workflow:"));
  console.log(bundle.workflow);

  console.log();
  console.log(chalk.bold("When to Use:"));
  for (const when of bundle.whenToUse) {
    console.log(`  • ${when}`);
  }

  console.log();
  console.log(chalk.dim(`Install: jfp install --bundle ${bundle.id}`));
}

// jfp install --bundle <id> — Install bundle as single skill
async function installBundleCommand(bundleId: string, flags: Flags) {
  const bundle = getBundle(bundleId);
  if (!bundle) {
    console.error(chalk.red(`Bundle not found: ${bundleId}`));
    process.exit(1);
  }

  const config = loadConfig();
  const skills = config.skills ?? {};
  const personalDir = skills.personalDir ?? join(homedir(), ".config", "claude", "skills");
  const projectDir = skills.projectDir ?? join(process.cwd(), ".claude", "skills");
  const targetDir = flags.project ? projectDir : personalDir;

  const skillDir = join(targetDir, bundle.id);
  const skillPath = join(skillDir, "SKILL.md");

  if (existsSync(skillPath) && !flags.force) {
    console.log(chalk.yellow(`⏭  ${bundle.id} (already installed, use --force to overwrite)`));
    return;
  }

  mkdirSync(skillDir, { recursive: true });
  writeFileSync(skillPath, generateBundleSkillMd(bundle));
  console.log(chalk.green(`✓  Installed bundle "${bundle.title}" → ${skillDir}`));
  console.log(chalk.dim(`   Includes: ${bundle.promptIds.join(", ")}`));
  console.log();
  console.log(chalk.cyan("Restart Claude Code to load the new skill."));
}
```

### 13.3 Web App Bundle Display

```tsx
// apps/web/src/components/bundle-card.tsx

"use client";

import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { type Bundle } from "@jeffreysprompts/core/prompts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BundleCardProps {
  bundle: Bundle;
  index: number;
}

export function BundleCard({ bundle, index }: BundleCardProps) {
  // Get icon dynamically
  const IconComponent = bundle.icon
    ? (Icons as Record<string, React.ComponentType<{ className?: string }>>)[bundle.icon] ?? Icons.Package
    : Icons.Package;

  const handleInstall = async () => {
    const command = `jfp install --bundle ${bundle.id}`;
    await navigator.clipboard.writeText(command);
    // Show toast...
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm",
        "p-6 transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <IconComponent className="size-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{bundle.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {bundle.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {bundle.promptIds.map((id) => (
          <Badge key={id} variant="secondary" className="text-xs">
            {id}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={handleInstall} className="gap-2">
          <Icons.Download className="size-4" />
          Install Bundle
        </Button>
        <Button size="sm" variant="outline">
          View Details
        </Button>
      </div>
    </motion.div>
  );
}
```

```tsx
// apps/web/src/app/bundles/page.tsx
import { bundles } from "@jeffreysprompts/core/prompts";
import { BundleCard } from "@/components/bundle-card";

export default function BundlesPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {bundles.map((bundle, i) => (
        <BundleCard key={bundle.id} bundle={bundle} index={i} />
      ))}
    </div>
  );
}
```

---

## Part 14: Semantic Suggestion System (BM25 + Optional Semantic Rerank)

This phase upgrades “suggest a prompt” beyond pure lexical matching without sacrificing speed.

### 14.1 Overview

- **Default**: BM25 (fast, tiny, deterministic).
- **Optional**: semantic rerank with MiniLM via Transformers.js.
- **Fallback**: if the semantic model isn’t available, use lightweight hash embeddings for approximate rerank.
- **Two-stage pipeline**: BM25 → optional semantic rerank on top N.

### 14.2 CLI Integration

```typescript
// packages/cli/src/commands/suggest.ts

import { searchPrompts } from "@jeffreysprompts/core/search/engine";
import { semanticRerank } from "@jeffreysprompts/core/search/semantic";
import { loadRegistry } from "../lib/registry-loader";

async function suggestCommand(task: string, flags: Flags) {
  if (!task?.trim()) {
    console.error("Usage: jfp suggest <task description>");
    process.exit(2);
  }

  const registry = await loadRegistry();
  const baseline = searchPrompts(task, flags.limit ?? 10, registry);

  const results = flags.semantic
    ? await semanticRerank(task, baseline, { fallback: "hash" })
    : baseline;

  if (flags.json) {
    printJson({ task, count: results.length, suggestions: results }, flags);
    return;
  }

  // render human-friendly suggestions...
}
```

Fallback embedding helper (deterministic, no model download):

```typescript
// packages/core/src/search/hash-embedder.ts
export function hashEmbed(input: string, dims = 128): number[] {
  // Deterministic hashing into a fixed-length vector.
  // Good enough for lightweight fallback similarity.
  // Use a fast non-crypto hash (xxhash/murmur) for `hash`.
  return new Array(dims).fill(0).map((_, i) => hash(input + i) % 1000 / 1000);
}
```

Implementation note: `semanticRerank` should catch model load errors/timeouts and fall back
to hash embeddings without failing the command.

**Note:** The CLI does **not** require a `prompt_embeddings.json` file. For this scale, in-memory
hash embeddings are fast enough as a fallback, and optional model assets can be cached in
`$HOME/.config/jfp/models`.

### 14.3 Web Integration

- Default suggestions use BM25.
- “Improve suggestions” toggle lazy-loads semantic model.
- Run semantic rerank in a Web Worker to avoid blocking UI.

### 14.4 Optional Data Pipeline

If you decide to precompute embeddings for the web:
- generate `/public/embeddings.json` during `build-data.ts`
- fetch via `/embeddings.json` (static asset)

### 14.5 Updated Project Structure Additions

```
packages/core/src/search/
  bm25.ts
  tokenize.ts
  synonyms.ts
  hash-embedder.ts
  semantic.ts
```

### 14.6 Phase Addition

**Phase 4.5: Semantic Rerank (Optional)**
1. Add `@xenova/transformers` dependency (lazy import)
2. Implement `semanticRerank` in core
3. Add CLI flag `--semantic`
4. Add web toggle for “better suggestions”

---

## Appendix C: Full Command Reference (Updated)

```
jfp                           # Quick-start help
jfp help                      # Full documentation
jfp about                     # About + ecosystem info

# Listing & Searching
jfp list                      # List all prompts
jfp list --category ideation  # Filter by category
jfp list --tag ultrathink     # Filter by tag
jfp list --json               # JSON output for agents
jfp list --pretty             # Pretty JSON (human-friendly)
jfp search <query>            # BM25 search
jfp suggest <task>            # Suggest prompts for a task
jfp suggest <task> --semantic # Optional semantic rerank

# Viewing
jfp show <id>                 # Show full prompt
jfp show <id> --raw           # Just the prompt text
jfp show <id> --json          # JSON output

# Copying & Exporting
jfp copy <id>                 # Copy to clipboard
jfp copy <id> --fill          # Prompt for missing variables
jfp render <id>               # Render prompt with variables
jfp render <id> --VAR=value   # Provide variables
jfp export <id>               # Export as SKILL.md
jfp export <id> --format md   # Export as markdown

# Installing (Skills)
jfp install <id>...           # Install as Claude Code skills
jfp install --all             # Install all prompts
jfp install --project         # Install to .claude/skills
jfp install --bundle <id>     # Install bundle as single skill (NEW)
jfp skill install <id>...     # Alias

# Managing Skills
jfp uninstall <id>...         # Remove installed skills
jfp skill uninstall <id>...   # Alias
jfp installed                 # List installed skills
jfp skill installed           # Alias
jfp update                    # Update all installed skills
jfp update --dry-run          # Show changes without writing
jfp update --dry-run --diff   # Show unified diff
jfp skill update              # Alias

# Bundles (NEW)
jfp bundles                   # List available bundles
jfp bundle show <id>          # Show bundle details

# Registry
jfp registry status           # Show registry cache status
jfp registry refresh          # Refresh cached registry

# Utilities
jfp open <id>                 # Open prompt permalink in browser
jfp serve                     # MCP server mode (agent-native)
jfp completion --shell zsh    # Shell completions
jfp update-cli                # Self-update the CLI (opt-in)
jfp doctor                    # Environment + registry checks

# Metadata
jfp categories                # List categories
jfp tags                      # List tags with counts

# Interactive
jfp i                         # Interactive browser (fzf-style)

# Version & Help
jfp --version
jfp --help
```
