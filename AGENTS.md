# AGENTS.md — JeffreysPrompts.com Project

## RULE 0 - THE FUNDAMENTAL OVERRIDE PREROGATIVE

If I tell you to do something, even if it goes against what follows below, YOU MUST LISTEN TO ME. I AM IN CHARGE, NOT YOU.

---

## RULE NUMBER 1: NO FILE DELETION

**YOU ARE NEVER ALLOWED TO DELETE A FILE WITHOUT EXPRESS PERMISSION.** Even a new file that you yourself created, such as a test code file. You have a horrible track record of deleting critically important files or otherwise throwing away tons of expensive work. As a result, you have permanently lost any and all rights to determine that a file or folder should be deleted.

**YOU MUST ALWAYS ASK AND RECEIVE CLEAR, WRITTEN PERMISSION BEFORE EVER DELETING A FILE OR FOLDER OF ANY KIND.**

---

## Irreversible Git & Filesystem Actions — DO NOT EVER BREAK GLASS

1. **Absolutely forbidden commands:** `git reset --hard`, `git clean -fd`, `rm -rf`, or any command that can delete or overwrite code/data must never be run unless the user explicitly provides the exact command and states, in the same message, that they understand and want the irreversible consequences.
2. **No guessing:** If there is any uncertainty about what a command might delete or overwrite, stop immediately and ask the user for specific approval. "I think it's safe" is never acceptable.
3. **Safer alternatives first:** When cleanup or rollbacks are needed, request permission to use non-destructive options (`git status`, `git diff`, `git stash`, copying to backups) before ever considering a destructive command.
4. **Mandatory explicit plan:** Even after explicit user authorization, restate the command verbatim, list exactly what will be affected, and wait for a confirmation that your understanding is correct. Only then may you execute it—if anything remains ambiguous, refuse and escalate.
5. **Document the confirmation:** When running any approved destructive command, record (in the session notes / final response) the exact user text that authorized it, the command actually run, and the execution time. If that record is absent, the operation did not happen.

---

## CRITICAL: Domain Ownership (Free vs Pro)

**`jeffreysprompts.com` (this repo) is free/open-source.**  
**`pro.jeffreysprompts.com` is premium and lives in the private repo (`jeffreysprompts-pro`).**

### Hard Rule
- **Never** alias `pro.jeffreysprompts.com` to this repo’s deployment.
- **All pro-domain aliasing is managed in the premium repo only.**

### Why This Matters
If this repo aliases the pro domain, the premium app disappears and Pro breaks.  
This is the root cause of repeated “catastrophically broken CSS” incidents.

### Workflow Note (This Repo)
`.github/workflows/sync-vercel-aliases.yml` is **disabled** here by design.  
Alias syncing now lives in the premium repo to prevent domain fights.
The premium repo workflow also verifies pro-domain CSS chunks (minimum size guard), re-aliases on failure, and fails if CSS is still missing.

### Manual Verification Checklist (Free Site Only)
After any deployment of this repo:
- [ ] `https://jeffreysprompts.com` loads correctly
- [ ] No 404s on static assets

---

## RULE 2 – NO COOKIE CONSENT CODE (ABSOLUTE)

Do NOT introduce, reintroduce, or suggest cookie consent banners, cookie preference managers, cookie acceptance dialogs, or any "consent management" code under any guise — including "best practices", "GDPR compliance", or "legal requirements". This applies to all sites in the ecosystem (jeffreysprompts.com, pro.jeffreysprompts.com, jeffreys-skills.md).

Cookies are used for their normal intended purpose and require no consent mechanism. Analytics are loaded directly when configured. Do not add consent/opt-in flows or privacy-signal gating (DNT/GPC) under the guise of "best practices" or compliance.

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

### C) Prompts Data (`packages/core` and `apps/web/src/lib/prompts/`)
- **Format:** TypeScript-native (no markdown parsing)
- **Source:** registry contains all prompt definitions as typed objects
- **Types:** prompt interfaces define `Prompt`, `PromptCategory`, `PromptMeta`
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
├── packages/
│   ├── core/                     # Prompt registry, exports, search, templates
│   └── cli/                      # CLI library + commands
├── apps/
│   └── web/                      # Next.js 16.x (App Router) + React 19
│       ├── src/app/              # App Router pages
│       ├── src/components/       # UI components
│       ├── src/lib/              # Shared libraries
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
- **uv** — Fast Python tooling
- **rust/cargo** — Rust toolchain
- **go** — Go toolchain

### Dev Tools
- **tmux** — Terminal multiplexer
- **ripgrep** (`rg`) — Fast search
- **ast-grep** (`sg`) — Structural search/replace
- **lazygit** — Git TUI
- **bat** — Better cat

### Coding Agents
- **Claude Code** — Anthropic's coding agent
- **Codex CLI** — OpenAI's coding agent
- **Gemini CLI** — Google's coding agent

### Cloud
- **Wrangler** — Cloudflare CLI (for domain verification)
- **Vercel CLI** — Vercel deployment

### Dicklesworthstone Stack (all 8 tools)
1. **ntm** — Named Tmux Manager (agent cockpit)
2. **mcp_agent_mail** — Agent coordination via mail-like messaging
3. **ultimate_bug_scanner** (`ubs`) — Bug scanning with guardrails
4. **beads_viewer** (`bv`) — Task management TUI
5. **coding_agent_session_search** (`cass`) — Unified agent history search
6. **cass_memory_system** (`cm`) — Procedural memory for agents
7. **coding_agent_account_manager** (`caam`) — Agent auth switching
8. **simultaneous_launch_button** (`slb`) — Two-person rule for dangerous commands

---

## MCP Agent Mail — Multi-Agent Coordination

Agent Mail is available as an MCP server for coordinating work across agents.

### CRITICAL: How Agents Access Agent Mail

**Coding agents (Claude Code, Codex, Gemini CLI) access Agent Mail NATIVELY via MCP tools.**

- You do NOT need to implement HTTP wrappers, client classes, or JSON-RPC handling
- MCP tools are available directly in your environment (e.g., `macro_start_session`, `send_message`, `fetch_inbox`)
- If MCP tools aren't available, flag it to the user — they may need to start the Agent Mail server

**Do not** create HTTP wrappers or unify "client code" for agent-to-Agent-Mail communication — this is already handled by your MCP runtime.

What Agent Mail gives:
- Identities, inbox/outbox, searchable threads.
- Advisory file reservations (leases) to avoid agents clobbering each other.
- Persistent artifacts in git (human-auditable).

Core patterns:

1. **Same repo**
   - Register identity:
     - `ensure_project` then `register_agent` with the repo's absolute path as `project_key`.
   - Reserve files before editing:
     - `file_reservation_paths(project_key, agent_name, ["src/**"], ttl_seconds=3600, exclusive=true)`.
   - Communicate:
     - `send_message(..., thread_id="FEAT-123")`.
     - `fetch_inbox`, then `acknowledge_message`.
   - Fast reads:
     - `resource://inbox/{Agent}?project=<abs-path>&limit=20`.
     - `resource://thread/{id}?project=<abs-path>&include_bodies=true`.

2. **Macros vs granular:**
   - Prefer macros when speed is more important than fine-grained control:
     - `macro_start_session`, `macro_prepare_thread`, `macro_file_reservation_cycle`, `macro_contact_handshake`.
   - Use granular tools when you need explicit behavior.

Common pitfalls:
- "from_agent not registered" → call `register_agent` with correct `project_key`.
- `FILE_RESERVATION_CONFLICT` → adjust patterns, wait for expiry, or use non-exclusive reservation.

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

Prompts are defined as TypeScript objects in the registry:

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

<!-- bv-agent-instructions-v1 -->

---

## Beads Workflow Integration

This project uses [beads_rust](https://github.com/Dicklesworthstone/beads_rust) (`br`) for issue tracking. Issues are stored in `.beads/` and tracked in git.

**Important:** `br` is non-invasive—it NEVER executes git commands. After `br sync --flush-only`, you must manually run `git add .beads/ && git commit`.

### Essential Commands

```bash
# View issues (launches TUI - avoid in automated sessions)
bv

# CLI commands for agents (use these instead)
br ready              # Show issues ready to work (no blockers)
br list --status=open # All open issues
br show <id>          # Full issue details with dependencies
br create --title="..." --type=task --priority=2
br update <id> --status=in_progress
br close <id> --reason "Completed"
br close <id1> <id2>  # Close multiple issues at once
br sync --flush-only  # Export to JSONL (NO git operations)
```

### Workflow Pattern

1. **Start**: Run `br ready` to find actionable work
2. **Claim**: Use `br update <id> --status=in_progress`
3. **Work**: Implement the task
4. **Complete**: Use `br close <id>`
5. **Sync**: Run `br sync --flush-only` then manually commit

### Key Concepts

- **Dependencies**: Issues can block other issues. `br ready` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers, not words)
- **Types**: task, bug, feature, epic, question, docs
- **Blocking**: `br dep add <issue> <depends-on>` to add dependencies

### Session Protocol

**Before ending any session, run this checklist:**

```bash
git status              # Check what changed
git add <files>         # Stage code changes
br sync --flush-only    # Export beads to JSONL
git add .beads/         # Stage beads changes
git commit -m "..."     # Commit everything together
git push                # Push to remote
```

### Best Practices

- Check `br ready` at session start to find available work
- Update status as you work (in_progress → closed)
- Create new issues with `br create` when you discover tasks
- Use descriptive titles and set appropriate priority/type
- Always `br sync --flush-only && git add .beads/` before ending session

<!-- end-bv-agent-instructions -->

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

## Beads (br) — Dependency-Aware Issue Tracking

Beads provides a lightweight, dependency-aware issue database and CLI (`br` - beads_rust) for selecting "ready work," setting priorities, and tracking status. It complements MCP Agent Mail's messaging and file reservations.

**Important:** `br` is non-invasive—it NEVER runs git commands automatically. You must manually commit changes after `br sync --flush-only`.

### Conventions

- **Single source of truth:** Beads for task status/priority/dependencies; Agent Mail for conversation and audit
- **Shared identifiers:** Use Beads issue ID (e.g., `br-123`) as Mail `thread_id` and prefix subjects with `[br-123]`
- **Reservations:** When starting a task, call `file_reservation_paths()` with the issue ID in `reason`

### Typical Agent Flow

1. **Pick ready work (Beads):**
   ```bash
   br ready --json  # Choose highest priority, no blockers
   ```

2. **Reserve edit surface (Mail):**
   ```
   file_reservation_paths(project_key, agent_name, ["src/**"], ttl_seconds=3600, exclusive=true, reason="br-123")
   ```

3. **Announce start (Mail):**
   ```
   send_message(..., thread_id="br-123", subject="[br-123] Start: <title>", ack_required=true)
   ```

4. **Work and update:** Reply in-thread with progress

5. **Complete and release:**
   ```bash
   br close 123 --reason "Completed"
   br sync --flush-only  # Export to JSONL (no git operations)
   ```
   ```
   release_file_reservations(project_key, agent_name, paths=["src/**"])
   ```
   Final Mail reply: `[br-123] Completed` with summary

### Mapping Cheat Sheet

| Concept | Value |
|---------|-------|
| Mail `thread_id` | `br-###` |
| Mail subject | `[br-###] ...` |
| File reservation `reason` | `br-###` |
| Commit messages | Include `br-###` for traceability |

---

## bv — Graph-Aware Triage Engine

bv is a graph-aware triage engine for Beads projects (`.beads/beads.jsonl`). It computes PageRank, betweenness, critical path, cycles, HITS, eigenvector, and k-core metrics deterministically.

**Scope boundary:** bv handles *what to work on* (triage, priority, planning). For agent-to-agent coordination (messaging, work claiming, file reservations), use MCP Agent Mail.

**CRITICAL: Use ONLY `--robot-*` flags. Bare `bv` launches an interactive TUI that blocks your session.**

### The Workflow: Start With Triage

**`bv --robot-triage` is your single entry point.** It returns:
- `quick_ref`: at-a-glance counts + top 3 picks
- `recommendations`: ranked actionable items with scores, reasons, unblock info
- `quick_wins`: low-effort high-impact items
- `blockers_to_clear`: items that unblock the most downstream work
- `project_health`: status/type/priority distributions, graph metrics
- `commands`: copy-paste shell commands for next steps

```bash
bv --robot-triage        # THE MEGA-COMMAND: start here
bv --robot-next          # Minimal: just the single top pick + claim command
```

### Command Reference

**Planning:**
| Command | Returns |
|---------|---------|
| `--robot-plan` | Parallel execution tracks with `unblocks` lists |
| `--robot-priority` | Priority misalignment detection with confidence |

**Graph Analysis:**
| Command | Returns |
|---------|---------|
| `--robot-insights` | Full metrics: PageRank, betweenness, HITS, eigenvector, critical path, cycles, k-core, articulation points, slack |
| `--robot-label-health` | Per-label health: `health_level`, `velocity_score`, `staleness`, `blocked_count` |
| `--robot-label-flow` | Cross-label dependency: `flow_matrix`, `dependencies`, `bottleneck_labels` |
| `--robot-label-attention [--attention-limit=N]` | Attention-ranked labels |

**History & Change Tracking:**
| Command | Returns |
|---------|---------|
| `--robot-history` | Bead-to-commit correlations |
| `--robot-diff --diff-since <ref>` | Changes since ref: new/closed/modified issues, cycles |

**Other:**
| Command | Returns |
|---------|---------|
| `--robot-burndown <sprint>` | Sprint burndown, scope changes, at-risk items |
| `--robot-forecast <id\|all>` | ETA predictions with dependency-aware scheduling |
| `--robot-alerts` | Stale issues, blocking cascades, priority mismatches |
| `--robot-suggest` | Hygiene: duplicates, missing deps, label suggestions |
| `--robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export |
| `--export-graph <file.html>` | Interactive HTML visualization |

### Scoping & Filtering

```bash
bv --robot-plan --label backend              # Scope to label's subgraph
bv --robot-insights --as-of HEAD~30          # Historical point-in-time
bv --recipe actionable --robot-plan          # Pre-filter: ready to work
bv --recipe high-impact --robot-triage       # Pre-filter: top PageRank
bv --robot-triage --robot-triage-by-track    # Group by parallel work streams
bv --robot-triage --robot-triage-by-label    # Group by domain
```

### Understanding Robot Output

**All robot JSON includes:**
- `data_hash` — Fingerprint of source beads.jsonl
- `status` — Per-metric state: `computed|approx|timeout|skipped` + elapsed ms
- `as_of` / `as_of_commit` — Present when using `--as-of`

**Two-phase analysis:**
- **Phase 1 (instant):** degree, topo sort, density
- **Phase 2 (async, 500ms timeout):** PageRank, betweenness, HITS, eigenvector, cycles

### jq Quick Reference

```bash
bv --robot-triage | jq '.quick_ref'                        # At-a-glance summary
bv --robot-triage | jq '.recommendations[0]'               # Top recommendation
bv --robot-plan | jq '.plan.summary.highest_impact'        # Best unblock target
bv --robot-insights | jq '.status'                         # Check metric readiness
bv --robot-insights | jq '.Cycles'                         # Circular deps (must fix!)
```

---

### Morph Warp Grep — AI-Powered Code Search

Use `mcp__morph-mcp__warp_grep` for "how does X work?" discovery across the codebase.

When to use:

- You don't know where something lives.
- You want data flow across multiple files (API → service → schema → types).
- You want all touchpoints of a cross-cutting concern (e.g., moderation, billing).

Example:

```
mcp__morph-mcp__warp_grep(
  repoPath: "/data/projects/jeffreysprompts.com",
  query: "How is the search engine implemented?"
)
```

Warp Grep:

- Expands a natural-language query to multiple search patterns.
- Runs targeted greps, reads code, follows imports, then returns concise snippets with line numbers.
- Reduces token usage by returning only relevant slices, not entire files.

When **not** to use Warp Grep:

- You already know the function/identifier name; use `rg`.
- You know the exact file; just open it.
- You only need a yes/no existence check.

Comparison:

| Scenario | Tool |
| ---------------------------------- | ---------- |
| "How is auth session validated?" | warp_grep |
| "Where is `handleSubmit` defined?" | `rg` |
| "Replace `var` with `let`" | `ast-grep` |

---

## Memory System: cass-memory

The Cass Memory System (cm) is a tool for giving agents an effective memory based on the ability to quickly search across previous coding agent sessions across an array of different coding agent tools (e.g., Claude Code, Codex, Gemini-CLI, Cursor, etc) and projects (and even across multiple machines, optionally) and then reflect on what they find and learn in new sessions to draw out useful lessons and takeaways; these lessons are then stored and can be queried and retrieved later, much like how human memory works.

The `cm onboard` command guides you through analyzing historical sessions and extracting valuable rules.

### Quick Start

```bash
# 1. Check status and see recommendations
cm onboard status

# 2. Get sessions to analyze (filtered by gaps in your playbook)
cm onboard sample --fill-gaps

# 3. Read a session with rich context
cm onboard read /path/to/session.jsonl --template

# 4. Add extracted rules (one at a time or batch)
cm playbook add "Your rule content" --category "debugging"
# Or batch add:
cm playbook add --file rules.json

# 5. Mark session as processed
cm onboard mark-done /path/to/session.jsonl
```

Before starting complex tasks, retrieve relevant context:

```bash
cm context "<task description>" --json
```

This returns:
- **relevantBullets**: Rules that may help with your task
- **antiPatterns**: Pitfalls to avoid
- **historySnippets**: Past sessions that solved similar problems
- **suggestedCassQueries**: Searches for deeper investigation

### Protocol

1. **START**: Run `cm context "<task>" --json` before non-trivial work
2. **WORK**: Reference rule IDs when following them (e.g., "Following b-8f3a2c...")
3. **FEEDBACK**: Leave inline comments when rules help/hurt:
   - `// [cass: helpful b-xyz] - reason`
   - `// [cass: harmful b-xyz] - reason`
4. **END**: Just finish your work. Learning happens automatically.

### Key Flags

| Flag | Purpose |
|------|---------|
| `--json` | Machine-readable JSON output (required!) |
| `--limit N` | Cap number of rules returned |
| `--no-history` | Skip historical snippets for faster response |

stdout = data only, stderr = diagnostics. Exit 0 = success.

---

## UBS Quick Reference for AI Agents

UBS stands for "Ultimate Bug Scanner": **The AI Coding Agent's Secret Weapon: Flagging Likely Bugs for Fixing Early On**

**Golden Rule:** `ubs <changed-files>` before every commit. Exit 0 = safe. Exit >0 = fix & re-run.

**Commands:**
```bash
ubs file.ts file2.py                    # Specific files (< 1s) — USE THIS
ubs $(git diff --name-only --cached)    # Staged files — before commit
ubs --only=js,python src/               # Language filter (3-5x faster)
ubs --ci --fail-on-warning .            # CI mode — before PR
ubs --help                              # Full command reference
ubs sessions --entries 1                # Tail the latest install session log
ubs .                                   # Whole project (ignores things like .venv and node_modules automatically)
```

**Output Format:**
```
⚠️  Category (N errors)
    file.ts:42:5 – Issue description
    💡 Suggested fix
Exit code: 1
```
Parse: `file:line:col` → location | 💡 → how to fix | Exit 0/1 → pass/fail

**Fix Workflow:**
1. Read finding → category + fix suggestion
2. Navigate `file:line:col` → view context
3. Verify real issue (not false positive)
4. Fix root cause (not symptom)
5. Re-run `ubs <file>` → exit 0
6. Commit

**Speed Critical:** Scope to changed files. `ubs src/file.ts` (< 1s) vs `ubs .` (30s). Never full scan for small edits.

**Bug Severity:**
- **Critical** (always fix): Null safety, XSS/injection, async/await, memory leaks
- **Important** (production): Type narrowing, division-by-zero, resource leaks
- **Contextual** (judgment): TODO/FIXME, console logs

**Anti-Patterns:**
- Ignore findings → Investigate each
- Full scan per edit → Scope to file
- Fix symptom (`if (x) { x.y }`) → Root cause (`x?.y`)

---

## RCH — Remote Compilation Helper

RCH offloads `cargo build`, `cargo test`, `cargo clippy`, and other compilation commands to a fleet of 8 remote Contabo VPS workers instead of building locally. This prevents compilation storms from overwhelming csd when many agents run simultaneously.

**RCH is installed at `~/.local/bin/rch` and is hooked into Claude Code's PreToolUse automatically.** Most of the time you don't need to do anything if you are Claude Code — builds are intercepted and offloaded transparently.

To manually offload a build:
```bash
rch exec -- cargo build --release
rch exec -- cargo test
rch exec -- cargo clippy
```

Quick commands:
```bash
rch doctor                    # Health check
rch workers probe --all       # Test connectivity to all 8 workers
rch status                    # Overview of current state
rch queue                     # See active/waiting builds
```

If rch or its workers are unavailable, it fails open — builds run locally as normal.

**Note for Codex/GPT-5.2:** Codex does not have the automatic PreToolUse hook, but you can (and should) still manually offload compute-intensive compilation commands using `rch exec -- <command>`. This avoids local resource contention when multiple agents are building simultaneously.

---

## ast-grep vs ripgrep

**Use `ast-grep` when structure matters.** It parses code and matches AST nodes, ignoring comments/strings, and can **safely rewrite** code.

- Refactors/codemods: rename APIs, change import forms
- Policy checks: enforce patterns across a repo
- Editor/automation: LSP mode, `--json` output

**Use `ripgrep` when text is enough.** Fastest way to grep literals/regex.

- Recon: find strings, TODOs, log lines, config values
- Pre-filter: narrow candidate files before ast-grep

### Rule of Thumb

- Need correctness or **applying changes** → `ast-grep`
- Need raw speed or **hunting text** → `rg`
- Often combine: `rg` to shortlist files, then `ast-grep` to match/modify

### Rust Examples

```bash
# Find structured code (ignores comments)
ast-grep run -l Rust -p 'fn $NAME($$ARGS) -> $RET { $$BODY }'

# Find all unwrap() calls
ast-grep run -l Rust -p '$EXPR.unwrap()'

# Quick textual hunt
rg -n 'println!' -t rust

# Combine speed + precision
rg -l -t rust 'unwrap\(' | xargs ast-grep run -l Rust -p '$X.unwrap()' --json
```

---

## CLI Cross-Repo Dependency Matrix

This matrix documents dependencies between the public CLI (`jfp`) in this repo and the premium backend APIs in `jeffreysprompts_premium`. Use this when planning CLI work to ensure both repos stay in sync.

### Beads Cross-References

**Public CLI (this repo) → Premium Backend Dependencies:**

| Public Bead | CLI Feature | Premium Dependencies |
|-------------|-------------|----------------------|
| `jeffreysprompts.com-uw7z` | CLI login | `jeffreysprompts_premium-0o1` (device code endpoints), `jeffreysprompts_premium-qdm` (verification page), `jeffreysprompts_premium-mn0` (CLI auth page), `jeffreysprompts_premium-qnl` (JWT/token utils), `jeffreysprompts_premium-0ve` (refresh/revoke), `jeffreysprompts_premium-h8r` (device_codes schema), `jeffreysprompts_premium-wdao` (device code tests) |
| `jeffreysprompts.com-hiff` | CLI sync | `jeffreysprompts_premium-67o` (CLI sync endpoints) |
| `jeffreysprompts.com-wlg3` | CLI collections | `jeffreysprompts_premium-67o` (CLI collections via sync endpoints) |
| `jeffreysprompts.com-xzgq` | CLI offline/cache | `jeffreysprompts_premium-67o` (CLI sync endpoints) |
| `jeffreysprompts.com-t524` | CLI API docs | `jeffreysprompts_premium-67o`, `jeffreysprompts_premium-0o1`, `jeffreysprompts_premium-0ve`, `jeffreysprompts_premium-qnl` |
| `jeffreysprompts.com-rd99` | CLI integration docs | `jeffreysprompts_premium-0o1`, `jeffreysprompts_premium-qdm`, `jeffreysprompts_premium-mn0`, `jeffreysprompts_premium-qnl`, `jeffreysprompts_premium-0ve`, `jeffreysprompts_premium-67o` |

**Premium Backend → Public CLI Consumers:**

| Premium Bead | Premium Feature | Public CLI Consumers |
|--------------|-----------------|----------------------|
| `jeffreysprompts_premium-6x3` | Skills CRUD + install/export endpoints | `jeffreysprompts.com-bojj` (CLI skills commands), `jeffreysprompts.com-t524` (API docs), `jeffreysprompts.com-rd99` (integration docs) |

### CLI Command → Premium API Endpoints

| CLI Command | Auth Required | Premium Only | API Endpoints |
|-------------|---------------|--------------|---------------|
| `jfp login` | No | - | `POST /api/cli/device-code`, `POST /api/cli/device-token`, OAuth redirect |
| `jfp logout` | Yes | - | `POST /cli/revoke` (optional) |
| `jfp whoami` | Yes | - | Local token validation |
| `jfp list --mine` | Yes | Premium | `GET /cli/prompts/mine` |
| `jfp list --saved` | Yes | Premium | `GET /cli/prompts/saved` |
| `jfp search --mine` | Yes | Premium | `GET /cli/search/mine?q={query}` |
| `jfp search --saved` | Yes | Premium | `GET /cli/search/saved?q={query}` |
| `jfp save` | Yes | Premium | `POST /cli/saved-prompts` |
| `jfp notes` | Yes | Premium | `GET/POST/DELETE /cli/notes/{promptId}` |
| `jfp collections` | Yes | Premium | `GET/POST /cli/collections/*` |
| `jfp sync` | Yes | Premium | `GET /cli/prompts?page={n}&limit=100` |

### Update Rules

1. **Adding a new CLI command**: Add the premium dependency to this matrix
2. **Adding a new premium CLI endpoint**: Add the public CLI consumer to this matrix
3. **Cross-repo changes**: Update both repos' beads simultaneously
4. **Breaking API changes**: Create migration beads in both repos

### Premium API Base URL

```
Production: https://pro.jeffreysprompts.com/api
Configurable via:
  - JFP_PREMIUM_API_URL (for API calls, default: https://pro.jeffreysprompts.com/api)
  - JFP_PREMIUM_URL (for auth/login, default: https://pro.jeffreysprompts.com)
```

### Authentication Flow

1. **Browser OAuth** (interactive): Local callback server → OAuth redirect → Token exchange
2. **Device Code** (headless): `POST /api/cli/device-code` → Poll `/api/cli/device-token` → Token received
3. **Token Storage**: `~/.config/jfp/credentials.json` or `JFP_TOKEN` env var
4. **Token Refresh**: Automatic on 401, uses refresh token if available

### Premium Endpoint Summary

| Endpoint Category | Bead ID | Description |
|-------------------|---------|-------------|
| Device Code Auth | `jeffreysprompts_premium-0o1` | OAuth device flow endpoints |
| Verification UI | `jeffreysprompts_premium-qdm` | User verification page |
| CLI Auth UI | `jeffreysprompts_premium-mn0` | CLI authentication page |
| JWT Utils | `jeffreysprompts_premium-qnl` | Token generation/validation |
| Token Lifecycle | `jeffreysprompts_premium-0ve` | Refresh and revocation |
| Device Codes Schema | `jeffreysprompts_premium-h8r` | Database schema for device codes |
| CLI Sync | `jeffreysprompts_premium-67o` | Library sync, collections, offline |
| Skills CRUD | `jeffreysprompts_premium-6x3` | Skills management API |
| Device Code Tests | `jeffreysprompts_premium-wdao` | E2E tests for device code flow |

### Cross-Repo Mirror

This matrix is mirrored in the premium repo (`jeffreysprompts_premium-zqsv`). Keep both copies in sync when making updates.

---

## cass — Cross-Agent Session Search

`cass` indexes prior agent conversations (Claude Code, Codex, Cursor, Gemini, ChatGPT, etc.) so we can reuse solved problems.

**Rules:** Never run bare `cass` (TUI). Always use `--robot` or `--json`.

### Examples

```bash
cass health
cass search "async runtime" --robot --limit 5
cass view /path/to/session.jsonl -n 42 --json
cass expand /path/to/session.jsonl -n 42 -C 3 --json
cass capabilities --json
cass robot-docs guide
```

### Tips

- Use `--fields minimal` for lean output
- Filter by agent with `--agent`
- Use `--days N` to limit to recent history

stdout is data-only, stderr is diagnostics; exit code 0 means success.

Treat cass as a way to avoid re-solving problems other agents already handled.

---

## Note for Codex/GPT-5.2

You constantly bother me and stop working with concerned questions that look similar to this:

```
Unexpected changes (need guidance)

- Working tree still shows edits I did not make in Cargo.toml, Cargo.lock, src/main.rs, src/patterns.rs. Please advise whether to keep/commit/revert these before any further work. I did not touch them.

Next steps (pick one)

1. Decide how to handle the unrelated modified files above so we can resume cleanly.
```

NEVER EVER DO THAT AGAIN. The answer is literally ALWAYS the same: those are changes created by the potentially dozen of other agents working on the project at the same time. This is not only a common occurence, it happens multiple times PER MINUTE. The way to deal with it is simple: you NEVER, under ANY CIRCUMSTANCE, stash, revert, overwrite, or otherwise disturb in ANY way the work of other agents. Just treat those changes identically to changes that you yourself made. Just fool yourself into thinking YOU made the changes and simply don't recall it for some reason.

---

## Note on Built-in TODO Functionality

Also, if I ask you to explicitly use your built-in TODO functionality, don't complain about this and say you need to use beads. You can use built-in TODOs if I tell you specifically to do so. Always comply with such orders.
