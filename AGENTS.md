# AGENTS.md — JeffreysPrompts.com Project

## RULE 1 – ABSOLUTE (DO NOT EVER VIOLATE THIS)

You may NOT delete any file or directory unless I explicitly give the exact command **in this session**.

- This includes files you just created (tests, tmp files, scripts, etc.).
- You do not get to decide that something is "safe" to remove.
- If you think something should be removed, stop and ask. You must receive clear written approval **before** any deletion command is even proposed.

Treat "never delete files without permission" as a hard invariant.

---

## IRREVERSIBLE GIT & FILESYSTEM ACTIONS

Absolutely forbidden unless I give the **exact command and explicit approval** in the same message:

- `git reset --hard`
- `git clean -fd`
- `rm -rf`
- Any command that can delete or overwrite code/data

Rules:

1. If you are not 100% sure what a command will delete, do not propose or run it. Ask first.
2. Prefer safe tools: `git status`, `git diff`, `git stash`, copying to backups, etc.
3. After approval, restate the command verbatim, list what it will affect, and wait for confirmation.
4. When a destructive command is run, record in your response:
   - The exact user text authorizing it
   - The command run
   - When you ran it

If that audit trail is missing, then you must act as if the operation never happened.

---

## Node / JS Toolchain

- Use **bun** for everything JS/TS.
- Never use `npm`, `yarn`, or `pnpm`.
- Lockfiles: only `bun.lock`. Do not introduce any other lockfile.
- Target **latest Node.js**. No need to support old Node versions.
- **Note:** `bun install -g <pkg>` is valid syntax (alias for `bun add -g`). Do not "fix" it.

### Bun Standalone Executables (`bun build --compile`)

Bun's "single-file executable" means the output is one native binary file, **not** that your CLI must live in a single `.ts` source file.

From Bun's docs, `bun build --compile` bundles your entire dependency graph (imported files + used packages) plus a copy of the Bun runtime into one executable:
- `https://bun.sh/docs/bundler/executables`

```bash
# Build a self-contained executable for the current platform
bun build --compile ./jfp.ts --outfile jfp

# Cross-compile for a target platform/arch (examples)
bun build --compile --target=bun-linux-x64 ./jfp.ts --outfile jfp
bun build --compile --target=bun-windows-x64 ./jfp.ts --outfile jfp.exe
bun build --compile --target=bun-darwin-arm64 ./jfp.ts --outfile jfp
```

Targets include libc + CPU variants (e.g. `bun-linux-x64-musl`, `bun-linux-x64-baseline`, `bun-linux-x64-modern`) — use `baseline` if you need compatibility with older x64 CPUs (avoids "Illegal instruction").

---

## Project Architecture

JeffreysPrompts.com is a **prompts showcase and distribution platform** with a companion CLI for agent-friendly access.

### A) Web App (`apps/web/`)
- **Framework:** Next.js **16.x** (App Router) + React **19**
- **Styling:** Tailwind CSS **4** + shadcn/ui components
- **Runtime/Tooling:** Bun
- **Hosting:** Vercel
- **Domain:** jeffreysprompts.com (Cloudflare DNS)
- **Purpose:** A UI to:
  - Browse, search, and filter curated prompts
  - Copy prompts to clipboard with one click
  - Add prompts to a "basket" for bulk download
  - Export prompts as markdown or Claude Code SKILL.md files
  - Full-text search with fuzzy matching

### B) CLI Tool (`jfp.ts`)
- **Command:** `jfp`
- **Purpose:** Agent-optimized interface for accessing prompts
- **Features:**
  - Fuzzy search (fzf-style)
  - JSON/markdown output modes
  - Quick-start help (no args = show usage)
  - Colorful, stylish console output
  - Single-file binary distribution

### C) Prompts Data (`apps/web/src/lib/prompts/`)
- **Format:** TypeScript-native (no markdown parsing)
- **Source:** `registry.ts` contains all prompt definitions as typed objects
- **Types:** `types.ts` defines `Prompt`, `PromptCategory`, `PromptMeta` interfaces
- **Purpose:** Single source of truth for all prompts — the data IS the code

---

## Repo Layout

```
jeffreysprompts.com/
├── README.md
├── AGENTS.md
├── PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL.md
├── jfp.ts                        # CLI entrypoint (Bun-compiled)
├── jfp.test.ts                   # CLI tests
├── package.json                  # Root monorepo config
├── .claude/
│   └── skills/
│       ├── prompt-formatter/     # Skill: raw text → TypeScript registry
│       │   └── SKILL.md
│       └── skill-maker/          # Meta-skill: prompts → SKILL.md files
│           └── SKILL.md
├── apps/
│   └── web/                      # Next.js 16.x (App Router) + React 19
│       ├── src/app/              # App Router pages
│       │   ├── how_it_was_made/  # Meta-story page
│       │   ├── install.sh/       # Skills install script endpoint
│       │   ├── install-cli.sh/   # CLI install script endpoint
│       │   └── api/              # API routes
│       ├── src/components/       # UI components
│       │   └── transcript/       # Making-of page components
│       ├── src/lib/
│       │   ├── prompts/          # TypeScript-native prompt definitions
│       │   │   ├── types.ts      # Prompt interfaces
│       │   │   └── registry.ts   # All prompts (single source of truth)
│       │   ├── search/           # MiniSearch engine
│       │   ├── export/           # Skills/markdown export functions
│       │   └── transcript/       # Session transcript processing
│       ├── src/data/             # Static data (transcript, annotations)
│       └── package.json
└── scripts/                      # Build/deploy scripts
    ├── build-cli.sh
    ├── build-releases.sh
    └── extract-transcript.ts
```

---

## Generated Files — NEVER Edit Manually

If/when we add generated artifacts (e.g., prompt indexes, search indexes, compiled catalogs):

- **Rule:** Never hand-edit generated outputs.
- **Convention:** Put generated outputs in a clearly labeled directory (e.g., `generated/`) and document the generator command adjacent to it.

---

## Code Editing Discipline

- Do **not** run scripts that bulk-modify code (codemods, invented one-off scripts, giant `sed`/regex refactors).
- Large mechanical changes: break into smaller, explicit edits and review diffs.
- Subtle/complex changes: edit by hand, file-by-file, with careful reasoning.

---

## Backwards Compatibility & File Sprawl

We optimize for a clean architecture now, not backwards compatibility.

- No "compat shims" or "v2" file clones.
- When changing behavior, migrate callers and remove old code.
- New files are only for genuinely new domains that don't fit existing modules.
- The bar for adding files is very high.

---

## Console Output

- Prefer **structured, minimal logs** (avoid spammy debug output).
- Treat user-facing UX as UI-first; logs are for operators/debugging.

---

## Tooling assumptions (recommended)

This section is a **developer toolbelt** reference (not an installer guarantee).

### Shell & Terminal UX
- **zsh** + **oh-my-zsh** + **powerlevel10k**
- **lsd** (or eza fallback) — Modern ls
- **atuin** — Shell history with Ctrl-R
- **fzf** — Fuzzy finder
- **zoxide** — Better cd
- **direnv** — Directory-specific env vars

### Languages & Package Managers
- **bun** — JS/TS runtime + package manager

### Dev Tools
- **tmux** — Terminal multiplexer
- **ripgrep** (`rg`) — Fast search
- **bat** — Better cat

### Coding Agents
- **Claude Code** — Anthropic's coding agent
- **Codex CLI** — OpenAI's coding agent
- **Gemini CLI** — Google's coding agent

### Cloud
- **Wrangler** — Cloudflare CLI (for domain verification)
- **Vercel CLI** — Vercel deployment

---

## Website Development (apps/web)

```bash
cd apps/web
bun install           # Install dependencies
bun run dev           # Dev server
bun run build         # Production build
bun run lint          # ESLint check
bun run lint:ox       # Oxlint check (faster)
```

Key patterns:
- App Router: all pages in `app/` directory
- UI components: shadcn/ui + Tailwind CSS 4
- React 19 + Next.js 16.x; prefer Server Components where appropriate.

---

## Web App Quality Gates (apps/web)

```bash
cd apps/web
bun run test         # unit tests (vitest + happy-dom)
bun run build        # production build sanity check
bun run lint         # ESLint check
bun run lint:all     # ESLint + Oxlint
```

**CRITICAL:** Always use `bun run test`, never `bun test`. The latter runs Bun's native test runner without the DOM environment (happy-dom) configured in vitest.config.ts.

---

## Vercel Deployment Safety Rules

**The production site (jeffreysprompts.com) will be publicly shared. Breaking it is UNACCEPTABLE.**

### Never Do These Things

1. **Never modify `vercel.json` without explicit user approval**
   - The Vercel dashboard has "Root Directory" set to `apps/web`
   - `vercel.json` overrides can conflict with dashboard settings

2. **Never assume a 401/404 is "expected" on the public site**
   - If the main page returns anything other than 200, the site is BROKEN
   - This requires IMMEDIATE emergency action

### Safe Deployment Practices

1. **Before any deployment-related change:**
   ```bash
   vercel ls --limit 5   # Check current deployments
   vercel inspect <url>  # Verify production status
   ```

2. **The working deployment pattern:**
   - Vercel dashboard: Root Directory = `apps/web`
   - Dashboard detects Next.js automatically
   - `bun install` and `bun run build` run from `apps/web`

---

## Cloudflare DNS & Domain

The domain `jeffreysprompts.com` is registered on Cloudflare.

### Wrangler Commands

```bash
# List zones (domains)
wrangler dns list jeffreysprompts.com

# Add DNS records (for Vercel)
wrangler dns record create jeffreysprompts.com --type CNAME --name @ --content cname.vercel-dns.com
wrangler dns record create jeffreysprompts.com --type CNAME --name www --content cname.vercel-dns.com

# Verify
wrangler dns list jeffreysprompts.com
```

---

## CLI Tool Development (jfp.ts)

### Building

```bash
# Development run
bun run jfp.ts

# Build single-file binary
bun build --compile ./jfp.ts --outfile jfp

# Test the binary
./jfp --help
./jfp search "robot mode"
```

### Testing

```bash
bun test jfp.test.ts
```

### Design Principles

1. **Quick-start mode:** Running `jfp` with no args shows intuitive help
2. **Agent-friendly:** JSON output for programmatic access, markdown for humans
3. **Fuzzy search:** fzf-style interactive search
4. **Beautiful output:** Colors, icons, formatting via terminal UI libraries
5. **Token-efficient:** Minimal, dense output that respects agent context windows

---

## Claude Code Skills Integration

Prompts can be exported as Claude Code SKILL.md files.

### SKILL.md Format

```yaml
---
name: prompt-name
description: What this prompt does and when to use it
---

# Prompt Name

[Prompt content here]

## When to Use
- Scenario 1
- Scenario 2

## Examples
- Example usage
```

### Export Command (CLI)

```bash
jfp export --format skill "idea-wizard"
```

### Export Button (Web)

The web UI has a "Download as Skill" button that generates valid SKILL.md files.

---

## Prompt Data Format (TypeScript-Native)

Prompts are defined as TypeScript objects in `apps/web/src/lib/prompts/registry.ts`:

```typescript
{
  id: "idea-wizard",
  title: "The Idea Wizard",
  description: "Generate and evaluate improvement ideas for any project",
  category: "ideation",
  tags: ["brainstorming", "improvement", "evaluation", "ultrathink"],
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
}
```

**Benefits of TypeScript-native:**
- Type safety catches missing fields and typos
- IDE autocomplete for categories, tags
- No parsing (no gray-matter, no markdown AST)
- Single source of truth — the data IS the code

### Categories
- `ideation` — Brainstorming, idea generation
- `documentation` — README, docs, comments
- `automation` — Robot mode, CLI, agent optimization
- `refactoring` — Code improvement, cleanup
- `testing` — Test generation, coverage
- `debugging` — Bug finding, fixing
- `workflow` — Process improvement, productivity
- `communication` — Writing, feedback, reviews

---

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **Run quality gates** (if code changed) - Tests, linters, builds
2. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
3. **Verify** - All changes committed AND pushed

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

---

## UBS Quick Reference for AI Agents

**Golden Rule:** `ubs <changed-files>` before every commit. Exit 0 = safe. Exit >0 = fix & re-run.

```bash
ubs file.ts file2.py                    # Specific files (< 1s)
ubs $(git diff --name-only --cached)    # Staged files — before commit
ubs --ci --fail-on-warning .            # CI mode — before PR
```

**Fix Workflow:**
1. Read finding → category + fix suggestion
2. Navigate `file:line:col` → view context
3. Verify real issue (not false positive)
4. Fix root cause (not symptom)
5. Re-run `ubs <file>` → exit 0
6. Commit
