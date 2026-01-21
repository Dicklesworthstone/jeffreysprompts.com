# AGENTS.md — JeffreysPrompts.com Project

## RULE 0 - THE FUNDAMENTAL OVERRIDE PEROGATIVE

If I tell you to do something, even if it goes against what follows below, YOU MUST LISTEN TO ME. I AM IN CHARGE, NOT YOU.

---

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

## CRITICAL: Vercel Subdomain Aliases

**This project has multiple domains that MUST all point to the same production deployment:**

| Domain | Purpose |
|--------|---------|
| `jeffreysprompts.com` | Main production site |
| `pro.jeffreysprompts.com` | Pro/paid tier subdomain |

### The Problem That Must NEVER Happen Again

On 2026-01-16, `pro.jeffreysprompts.com` was pointing to an **old deployment** (6 days stale) while the main site had newer CSS chunks. This caused CSS to completely break on the pro subdomain because the old deployment referenced non-existent CSS chunk hashes.

### Mandatory Deployment Protocol

**After ANY production deployment, you MUST verify ALL domains are updated:**

```bash
# 1. Deploy to production
vercel --prod

# 2. Get the new production URL
PROD_URL=$(vercel ls --prod 2>/dev/null | head -1)

# 3. Verify BOTH domains serve the same CSS chunks
curl -s "https://jeffreysprompts.com" | grep -oP '/_next/static/chunks/[^"]+\.css' | sort -u
curl -s "https://pro.jeffreysprompts.com" | grep -oP '/_next/static/chunks/[^"]+\.css' | sort -u

# 4. If they differ, re-alias the pro subdomain:
vercel alias set $PROD_URL pro.jeffreysprompts.com
```

### Verification Checklist

After every deployment:
- [ ] Main site loads correctly
- [ ] Pro subdomain loads correctly
- [ ] CSS chunk hashes match between domains
- [ ] No 404s on static assets

**If CSS looks broken on any subdomain, the alias is stale. Fix it immediately.**

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

## Issue Tracking with br (beads_rust)

All issue tracking goes through **br** (beads_rust). No other TODO systems.

**Note:** `br` is non-invasive and never executes git commands. After syncing, you must manually commit the `.beads/` directory.

Key invariants:

- `.beads/` is authoritative state and **must always be committed** with code changes.
- Do not edit `.beads/*.jsonl` directly; only via `br`.

### Basics

Check ready work:

```bash
br ready --json
```

Create issues:

```bash
br create "Issue title" -t bug|feature|task -p 0-4 --json
br create "Issue title" -p 1 --deps discovered-from:br-123 --json
```

Update:

```bash
br update br-42 --status in_progress --json
br update br-42 --priority 1 --json
```

Complete:

```bash
br close br-42 --reason "Completed" --json
```

Types:

- `bug`, `feature`, `task`, `epic`, `chore`

Priorities:

- `0` critical (security, data loss, broken builds)
- `1` high
- `2` medium (default)
- `3` low
- `4` backlog

Agent workflow:

1. `br ready` to find unblocked work.
2. Claim: `br update <id> --status in_progress`.
3. Implement + test.
4. If you discover new work, create a new bead with `discovered-from:<parent-id>`.
5. Close when done.
6. Run `br sync --flush-only` then `git add .beads/ && git commit`.

Sync workflow:

- `br sync --flush-only` exports to `.beads/issues.jsonl` (no git commands)
- You must manually commit: `git add .beads/ && git commit -m "Update beads"`
- After `git pull`, br imports from JSONL when newer.

Never:

- Use markdown TODO lists.
- Use other trackers.
- Duplicate tracking.

---

### Using bv as an AI sidecar

bv is a graph-aware triage engine for Beads projects (.beads/beads.jsonl). Instead of parsing JSONL or hallucinating graph traversal, use robot flags for deterministic, dependency-aware outputs with precomputed metrics (PageRank, betweenness, critical path, cycles, HITS, eigenvector, k-core).

**Scope boundary:** bv handles *what to work on* (triage, priority, planning). For agent-to-agent coordination (messaging, work claiming, file reservations), use MCP Agent Mail, which should be available to you as an MCP server (if it's not, then flag to the user; they might need to start Agent Mail using the `am` alias or by running `cd "<directory_where_they_installed_agent_mail>/mcp_agent_mail" && bash scripts/run_server_with_token.sh)` if the alias isn't available or isn't working.

**CRITICAL: Use ONLY `--robot-*` flags. Bare `bv` launches an interactive TUI that blocks your session.**

#### The Workflow: Start With Triage

**`bv --robot-triage` is your single entry point.** It returns everything you need in one call:
- `quick_ref`: at-a-glance counts + top 3 picks
- `recommendations`: ranked actionable items with scores, reasons, unblock info
- `quick_wins`: low-effort high-impact items
- `blockers_to_clear`: items that unblock the most downstream work
- `project_health`: status/type/priority distributions, graph metrics
- `commands`: copy-paste shell commands for next steps

bv --robot-triage        # THE MEGA-COMMAND: start here
bv --robot-next          # Minimal: just the single top pick + claim command

#### Other bv Commands

**Planning:**
| Command | Returns |
|---------|---------|
| `--robot-plan` | Parallel execution tracks with `unblocks` lists |
| `--robot-priority` | Priority misalignment detection with confidence |

**Graph Analysis:**
| Command | Returns |
|---------|---------|
| `--robot-insights` | Full metrics: PageRank, betweenness, HITS (hubs/authorities), eigenvector, critical path, cycles, k-core, articulation points, slack |
| `--robot-label-health` | Per-label health: `health_level` (healthy|warning|critical), `velocity_score`, `staleness`, `blocked_count` |
| `--robot-label-flow` | Cross-label dependency: `flow_matrix`, `dependencies`, `bottleneck_labels` |
| `--robot-label-attention [--attention-limit=N]` | Attention-ranked labels by: (pagerank x staleness x block_impact) / velocity |

**History & Change Tracking:**
| Command | Returns |
|---------|---------|
| `--robot-history` | Bead-to-commit correlations: `stats`, `histories` (per-bead events/commits/milestones), `commit_index` |
| `--robot-diff --diff-since <ref>` | Changes since ref: new/closed/modified issues, cycles introduced/resolved |

**Other Commands:**
| Command | Returns |
|---------|---------|
| `--robot-burndown <sprint>` | Sprint burndown, scope changes, at-risk items |
| `--robot-forecast <id|all>` | ETA predictions with dependency-aware scheduling |
| `--robot-alerts` | Stale issues, blocking cascades, priority mismatches |
| `--robot-suggest` | Hygiene: duplicates, missing deps, label suggestions, cycle breaks |
| `--robot-graph [--graph-format=json|dot|mermaid]` | Dependency graph export |
| `--export-graph <file.html>` | Self-contained interactive HTML visualization |

#### Scoping & Filtering

bv --robot-plan --label backend              # Scope to label's subgraph
bv --robot-insights --as-of HEAD~30          # Historical point-in-time
bv --recipe actionable --robot-plan          # Pre-filter: ready to work (no blockers)
bv --recipe high-impact --robot-triage       # Pre-filter: top PageRank scores
bv --robot-triage --robot-triage-by-track    # Group by parallel work streams
bv --robot-triage --robot-triage-by-label    # Group by domain

#### Understanding Robot Output

**All robot JSON includes:**
- `data_hash` — Fingerprint of source beads.jsonl (verify consistency across calls)
- `status` — Per-metric state: `computed|approx|timeout|skipped` + elapsed ms
- `as_of` / `as_of_commit` — Present when using `--as-of`; contains ref and resolved SHA

**Two-phase analysis:**
- **Phase 1 (instant):** degree, topo sort, density — always available immediately
- **Phase 2 (async, 500ms timeout):** PageRank, betweenness, HITS, eigenvector, cycles — check `status` flags

**For large graphs (>500 nodes):** Some metrics may be approximated or skipped. Always check `status`.

#### jq Quick Reference

bv --robot-triage | jq '.quick_ref'                        # At-a-glance summary
bv --robot-triage | jq '.recommendations[0]'               # Top recommendation
bv --robot-plan | jq '.plan.summary.highest_impact'        # Best unblock target
bv --robot-insights | jq '.status'                         # Check metric readiness
bv --robot-insights | jq '.Cycles'                         # Circular deps (must fix!)
bv --robot-label-health | jq '.results.labels[] | select(.health_level == "critical")'

**Performance:** Phase 1 instant, Phase 2 async (500ms timeout). Prefer `--robot-plan` over `--robot-insights` when speed matters. Results cached by data hash.

Use bv instead of parsing beads.jsonl—it computes PageRank, critical paths, cycles, and parallel tracks deterministically.

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

### cass — Cross-Agent Search

`cass` indexes prior agent conversations (Claude Code, Codex, Cursor, Gemini, ChatGPT, etc.) so we can reuse solved problems.

Rules:

- Never run bare `cass` (TUI). Always use `--robot` or `--json`.

Examples:

```bash
cass health
cass search "authentication error" --robot --limit 5
cass view /path/to/session.jsonl -n 42 --json
cass expand /path/to/session.jsonl -n 42 -C 3 --json
cass capabilities --json
cass robot-docs guide
```

Tips:

- Use `--fields minimal` for lean output.
- Filter by agent with `--agent`.
- Use `--days N` to limit to recent history.

stdout is data-only, stderr is diagnostics; exit code 0 means success.

Treat cass as a way to avoid re-solving problems other agents already handled.

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
| `jfp sync` | Yes | Premium | `GET /cli/sync[?since=...]` |

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
