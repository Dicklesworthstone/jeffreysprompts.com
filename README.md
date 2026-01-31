<div align="center">

<img src="illustration.webp" alt="JeffreysPrompts.com - A friendly robot shopping for prompts in a cozy prompt shop, with shelves of labeled prompt scrolls and a terminal showing 'jfp export idea-wizard'">

# JeffreysPrompts.com

**A curated collection of battle-tested prompts for agentic coding**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Bun](https://img.shields.io/badge/Bun-1.x-FBF0DF?style=flat-square&logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

---

*"Where'd you get that prompt?! It's lovely!"*<br>
*"Oh, this old thing? I got it at JeffreysPrompts.com."*

---

**Browse. Copy. Export markdown. Ship faster.**

</div>

## What is JeffreysPrompts.com?

JeffreysPrompts.com is a platform for discovering, copying, and exporting curated prompts that supercharge your work with AI coding agents like Claude Code, Codex CLI, and Gemini CLI.

It's two things in one:

| Component | Purpose |
|-----------|---------|
| **Web App** | Beautiful UI to browse, search, filter, and copy prompts |
| **CLI Tool (`jfp`)** | Agent-optimized command-line interface with JSON output |

Claude Code skills are managed separately in **Jeffrey's Skills.md** (`jsm`). JFP focuses on prompts and markdown export.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   YOU                    jeffreysprompts.com                   AGENT    │
│    │                            │                                  │    │
│    ├─── Browse prompts ────────►│                                  │    │
│    │                            │                                  │    │
│    ├─── Copy/export ───────────►│────── jfp export ───────────────►│    │
│    │                            │            prompt.md             │    │
│    │◄───── Agent uses prompt ───│◄─────────────────────────────────│    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Prompts

These prompts come from Jeffrey Emanuel's "My Favorite Prompts" series on Twitter. They're battle-tested patterns refined through extensive real-world usage with AI coding agents.

### The Idea Wizard

> *Generate 30 improvement ideas, rigorously evaluate each, distill to the very best 5*

The key insight: by forcing the agent to generate many ideas and then critically evaluate them, you get much better results than asking for "5 good ideas" directly.

### The README Reviser

> *Update documentation for recent changes, framing them as "how it always was"*

Addresses documentation drift. The framing trick produces cleaner, more professional docs.

### The Robot-Mode Maker

> *Create an agent-optimized CLI for any project*

Builds what the agent would want to use, because it WILL be using it. JSON output, token efficiency, quick-start mode.

**...and more.** Each prompt includes when to use it, tips, and examples.

---

## Table of Contents

- [Quick Start](#quick-start)
  - [Web App](#web-app)
  - [CLI Tool](#cli-tool)
- [Features](#features)
  - [Web App Features](#web-app-features)
  - [CLI Features](#cli-features)
- [The jfp CLI](#the-jfp-cli)
  - [Installation](#cli-installation)
  - [Commands](#cli-commands)
  - [Robot Mode](#robot-mode)
- [Architecture](#architecture)
  - [TypeScript-Native Prompts](#typescript-native-prompts)
  - [Project Structure](#project-structure)
- [Development](#development)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Quality Gates](#quality-gates)
- [The Making-Of Page](#the-making-of-page)
- [Design Philosophy](#design-philosophy)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

### Web App

Visit **[jeffreysprompts.com](https://jeffreysprompts.com)** to:

1. Browse all prompts with search and filtering
2. Click any prompt to copy it to your clipboard
3. Add prompts to your basket for bulk export
4. Download as markdown

### CLI Tool

```bash
curl -fsSL "https://jeffreysprompts.com/install-cli.sh?$(date +%s)" | bash
```

Usage:

```bash
# List all prompts
jfp list

# Fuzzy search
jfp search "brainstorm"

# View a prompt
jfp show idea-wizard

# Copy to clipboard
jfp copy idea-wizard

# Interactive mode (fzf-style)
jfp i
```

### Skills (JSM)

Claude Code skills are managed in **Jeffrey's Skills.md** (`jsm`). Use JFP for prompts and markdown export; use JSM for skills management.

---

## Features

### Web App Features

| Feature | Description |
|---------|-------------|
| **SpotlightSearch** | `Cmd+K` command palette with fuzzy search |
| **One-Click Copy** | Copy any prompt with animated feedback |
| **Basket System** | Collect multiple prompts for bulk export |
| **Category Filters** | Filter by ideation, documentation, automation, etc. |
| **Tag Filters** | Multi-select tags for precise filtering |
| **Dark Mode** | Automatic theme detection with manual toggle |
| **Mobile Optimized** | Touch-friendly UI with bottom sheets |
| **Markdown Export** | Download prompts as .md files |

### CLI Features

| Feature | Description |
|---------|-------------|
| **JSON Output** | `--json` flag on every command for agent parsing |
| **Fuzzy Search** | fzf-style interactive search |
| **Quick Start** | No args shows intuitive help in ~100 tokens |
| **TTY Detection** | Auto-switches to JSON when piped |
| **Single Binary** | Bun-compiled, no runtime dependencies |
| **Cross-Platform** | Linux, macOS, Windows builds |

### CLI: Free vs Premium (Paid)

The `jfp` CLI is **open source** and **builds without any Pro account**. Pro is only required to authenticate and access private/premium cloud data.

Premium features require an active Pro subscription (**$10/month**) at:
https://pro.jeffreysprompts.com/pricing

If you are not subscribed, Pro commands still exist but will return a clear upgrade hint. The CLI remains fully usable for the public registry without login.

**Free (no subscription required):**
- `jfp list`, `jfp search`, `jfp show`, `jfp copy`, `jfp export`, `jfp render`, `jfp suggest`
- `jfp bundles`, `jfp bundle`, `jfp categories`, `jfp tags`
- `jfp status`, `jfp refresh`, `jfp open`, `jfp doctor`, `jfp about`, `jfp completion`, `jfp update-cli`
- `jfp i` (interactive browser)

**Premium (paid Pro required):**
- `jfp login`, `jfp logout`, `jfp whoami`
- `jfp save`, `jfp notes`, `jfp collections`, `jfp sync`
- `jfp recommend`
- `jfp list --mine`, `jfp search --mine`, `jfp list --saved`, `jfp search --saved`, `jfp search --all`

**Build (free):**
- `bun install`
- `bun run jfp.ts list`
- `bun build --compile ./jfp.ts --outfile jfp`

---

## The jfp CLI

### CLI Installation

**Quick install:**

```bash
curl -fsSL "https://jeffreysprompts.com/install-cli.sh?$(date +%s)" | bash
```

**Manual install:**

Download for your platform from GitHub Releases:

Linux x64:

```bash
curl -L https://github.com/Dicklesworthstone/jeffreysprompts.com/releases/latest/download/jfp-linux-x64 -o ~/.local/bin/jfp
chmod +x ~/.local/bin/jfp
```

macOS ARM:

```bash
curl -L https://github.com/Dicklesworthstone/jeffreysprompts.com/releases/latest/download/jfp-darwin-arm64 -o ~/.local/bin/jfp
chmod +x ~/.local/bin/jfp
```

### CLI Commands

```
jfp                           # Quick-start help
jfp help                      # Full documentation
jfp list                      # List all prompts
jfp list --category ideation  # Filter by category
jfp list --tag ultrathink     # Filter by tag
jfp list --json               # JSON output for agents

jfp search <query>            # Fuzzy search
jfp search "robot" --json     # JSON output

jfp show <id>                 # Show full prompt
jfp show idea-wizard --json   # JSON output
jfp show idea-wizard --raw    # Just the prompt text

jfp recommend                 # Personalized recommendations (Pro)
jfp recommend idea-wizard     # Related prompts (Pro)

jfp impact <id>               # Show downstream dependencies
jfp graph export              # Export prompt dependency graph

jfp packs --installed         # List installed premium packs (Pro)
jfp packs install <id>        # Install/subscribe to premium packs (Pro)
jfp packs update <id>         # Update a premium pack (Pro)
jfp packs changelog <id>      # View a pack changelog (Pro)

jfp copy <id>                 # Copy to clipboard

jfp export <id>               # Export as markdown
jfp export <id> --format md   # Export as markdown (explicit)

jfp i                         # Interactive browser (fzf-style)

jfp categories                # List categories
jfp tags                      # List tags with counts

jfp completion --shell zsh    # Generate shell completion script

jfp --version
jfp --help
```

### Robot Mode

The CLI is designed **agent-first**. When an AI coding agent uses `jfp`:

**TTY Detection:**
```bash
# Human in terminal — gets pretty output
jfp search "brainstorm"

# Agent piping output — automatically gets JSON
results=$(jfp search "brainstorm")
echo $results | jq '.results[0].id'
```

**Structured Errors:**
```json
{
  "error": "prompt_not_found",
  "message": "No prompt with id 'foo-bar'",
  "suggestions": ["foo-baz", "idea-wizard"],
  "exitCode": 1
}
```

**Exit Codes:**

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Not found (prompt) |
| 2 | Invalid arguments |
| 3 | Export failed |
| 4 | Network error |
| 5 | Permission denied |

**Quick Start Output (~100 tokens):**
```
jfp — Jeffrey's Prompts CLI

QUICK START:
  jfp list                    List all prompts
  jfp search "idea"           Fuzzy search
  jfp show idea-wizard        View full prompt
  jfp export idea-wizard      Export as markdown

ADD --json TO ANY COMMAND FOR MACHINE-READABLE OUTPUT

EXPLORE:
  jfp i                       Interactive browser (fzf-style)

MORE: jfp help | Docs: jeffreysprompts.com
```

---

## Architecture

### TypeScript-Native Prompts

Prompts are defined as TypeScript objects, not markdown files:

```typescript
// apps/web/src/lib/prompts/registry.ts

export const prompts: Prompt[] = [
  {
    id: "idea-wizard",
    title: "The Idea Wizard",
    description: "Generate 30 ideas, rigorously evaluate, distill to best 5",
    category: "ideation",
    tags: ["brainstorming", "improvement", "ultrathink"],
    author: "Jeffrey Emanuel",
    twitter: "@doodlestein",
    version: "1.0.0",
    featured: true,
    difficulty: "intermediate",
    estimatedTokens: 500,
    created: "2025-01-09",
    content: `Come up with your very best ideas for improving this project...`,
    whenToUse: [
      "When starting a new feature or project",
      "When reviewing a codebase for improvements",
    ],
    tips: [
      "Run this at the start of a session for fresh perspective",
      "Combine with ultrathink for deeper analysis",
    ],
  },
];
```

**Why TypeScript-native?**

| Benefit | Explanation |
|---------|-------------|
| **Type Safety** | TypeScript catches missing fields, typos at compile time |
| **IDE Support** | Full autocomplete for categories, tags, fields |
| **No Parsing** | No gray-matter, no markdown AST, no regex |
| **Single Source** | The data IS the code |

### Project Structure

```
jeffreysprompts.com/
├── README.md
├── AGENTS.md                      # Rules for AI agents
├── PLAN_TO_MAKE_...md             # Detailed implementation blueprint
├── package.json
├── bun.lock
│
├── jfp.ts                         # CLI entrypoint
├── jfp.test.ts                    # CLI tests
│
├── .claude/
│   └── skills/                    # Internal authoring helpers (not shipped)
│       ├── prompt-formatter/
│       │   └── SKILL.md
│       └── skill-maker/
│           └── SKILL.md
│
├── apps/
│   └── web/                       # Next.js 16 App
│       ├── src/
│       │   ├── app/               # App Router pages
│       │   ├── components/        # React components
│       │   └── lib/
│       │       ├── prompts/       # Prompt types & registry
│       │       ├── search/        # MiniSearch engine
│       │       ├── export/        # Markdown export
│       │       └── transcript/    # Making-of page processing
│       └── package.json
│
└── scripts/
    ├── build-cli.sh               # Build jfp binaries
    └── extract-transcript.ts      # Extract Claude Code session
```

---

## Development

### Prerequisites

- **Bun** 1.x — JavaScript runtime and package manager
- **Node.js** 20+ — For Next.js compatibility
- **Git** — Version control

### Setup

```bash
# Clone the repository
git clone https://github.com/Dicklesworthstone/jeffreysprompts.com.git
cd jeffreysprompts.com

# Install dependencies
bun install

# Start development server
cd apps/web
bun run dev

# Run CLI in development
bun run jfp.ts list

# Build CLI binary
bun build --compile ./jfp.ts --outfile jfp
```

### Quality Gates

```bash
# Web app
cd apps/web
bun run test          # Unit tests (vitest + happy-dom)
bun run build         # Production build
bun run lint          # ESLint
bun run lint:all      # ESLint + Oxlint

# CLI
bun test jfp.test.ts
```

**Important:** Always use `bun run test`, never `bun test`. The latter bypasses vitest's DOM environment configuration.

---

## The Making-Of Page

Visit **[jeffreysprompts.com/how_it_was_made](https://jeffreysprompts.com/how_it_was_made)** for a unique meta-feature:

**The complete, unedited Claude Code session transcript** that designed, planned, and implemented this entire site — in a single day.

This page includes:

- **Session Statistics** — Duration, messages, tool calls, files edited, lines written
- **Visual Timeline** — Every message with expandable tool calls
- **Syntax Highlighting** — Code shown with proper highlighting
- **Annotations** — Commentary on key decisions and patterns
- **Extended Thinking** — Claude's reasoning process exposed

**Why this exists:**

1. **Transparency** — AI-assisted development shouldn't be a black box
2. **Education** — Learn prompt engineering from hundreds of real examples
3. **Meta-demonstration** — The prompts on this site helped build this site

---

## Design Philosophy

### 1. Agent-First, Human-Compatible

Every feature considers the AI agent user first:

- `--json` flag on every CLI command
- Quick-start mode is token-dense (~100 tokens)
- Predictable response shapes
- Meaningful exit codes

### 2. Copy Is King

The primary action is copying prompts:

- Copy button prominent on every card
- One-click with visual feedback
- Bulk export for collections

### 3. Prompts First, Skills Elsewhere

JFP is for prompt discovery, copying, and markdown export:

- Clean, shareable markdown export
- Clear boundary: prompts in JFP, skills in JSM
- Agent-friendly CLI output

### 4. TypeScript-Native Data

No markdown files, no parsing:

- Type safety catches errors at compile time
- IDE autocomplete for all fields
- Single source of truth

### 5. Mobile Excellence

Following brennerbot.org patterns:

- Touch targets are 44px minimum
- Bottom sheet for mobile interactions
- No horizontal scroll
- iOS Safari visual viewport fixes

---

## Contributing

This project welcomes contributions, but please note:

**The prompts themselves are curated by Jeffrey Emanuel.** If you have a prompt suggestion, open an issue to discuss it first.

**Bug fixes, performance improvements, and documentation enhancements** are always welcome via pull request.

Before contributing:

1. Read `AGENTS.md` for project conventions
2. Read `PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL.md` for architecture context
3. Run quality gates before submitting

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**[jeffreysprompts.com](https://jeffreysprompts.com)** — Curated prompts for agentic coding

Made with Claude Code by [@doodlestein](https://twitter.com/doodlestein)

</div>
