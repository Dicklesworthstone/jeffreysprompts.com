# Changelog

All notable changes to **JeffreysPrompts.com** are documented here.

This project has no formal releases or tags. The timeline below is reconstructed from the git history (1,274 commits across `main`) and organized by landed capabilities rather than raw diff order. Representative commit links point to [`Dicklesworthstone/jeffreysprompts.com`](https://github.com/Dicklesworthstone/jeffreysprompts.com).

---

## 2026-03-15 — 2026-03-18: CLI Ergonomics & Hydration Fixes

Focused maintenance pass on CLI variable handling and SSR consistency.

### Fixed
- CLI `render` command now reads context from special files (e.g. `AGENTS.md`, `CLAUDE.md`) ([148b0aa](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/148b0aa4f2b8))
- CLI JSON-mode errors sent to stdout instead of stderr so piped consumers get structured output ([11bdb49](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/11bdb49d8d20))
- Relaxed variable name pattern to allow leading digits and underscores ([a987be9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a987be9184d2))
- Eliminated SSR hydration mismatches for date rendering with a new `ClientDate` component ([ffd09ac](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ffd09ac59986), [dc591fe](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/dc591fe9c14e))
- Test fixtures aligned with updated categories; added global `next-intl` mock ([9f125c7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9f125c74bf5d))

---

## 2026-03-05 — 2026-03-07: Locale Routing & Referral Hardening

A concentrated effort on i18n navigation correctness, referral flow resilience, and deploy-safe identity persistence.

### Fixed
- Locale-aware global navigation flows across all page types ([907096d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/907096dc45b6), [01af0e1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/01af0e10eef1))
- Referral code validation, claim persistence, and replay protection hardened ([c464f35](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c464f357d44e))
- Anonymous user identity now persists across Vercel deploys ([0ad03eb](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0ad03eb2d166))
- Roadmap voting resilient to cookie resets ([2444147](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2444147792cf))
- Share dialog rehydration, swap-meet navigation, login bootstrap, and history resolution fixed ([bd24763](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bd247637520d), [a6edc5b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a6edc5b713ec), [1d4d221](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1d4d221c34b0))
- CLI auth, export env resolution, and collections export hardened ([66cf68c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/66cf68cdfa16), [4f0abef](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4f0abef64c0f), [e21eb98](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e21eb984894c))
- README synced with actual architecture ([f4ef353](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f4ef3538c418))

---

## 2026-03-01 — 2026-03-02: Test Coverage Sprint & Production Smoke Tests

### Added
- Production smoke tests and CLI E2E tests with PlaywrightLogger migration ([727b8f2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/727b8f2d58c3))
- 20+ new component test files: Hero, Nav, WorkflowBuilder, BottomTabBar, FloatingActionButton, ShareManagement, BundleCard, ChangelogAccordion, and many more ([71172a2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/71172a216d78) .. [6e83f91](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6e83f918cd68))

### Fixed
- Admin API security hardened; PromptCard timer leak fixed ([29641e6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/29641e6d28e2))
- Reduced mock usage in tests; replaced fragile computed fixture references with literals ([d67e177](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d67e17727eac), [20115d1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/20115d1de905))
- Client JS bundle size limit bumped from 850 KB to 860 KB ([38a93e8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/38a93e8c3349))

---

## 2026-02-26 — 2026-02-28: Search Engine Rewrite & Security Hardening

### Changed
- **Search engine replaced**: BM25 swapped for a single-pass precomputed scorer with multi-signal prefix matching as the primary ranking engine ([a42229f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a42229fb7b27), [8894bba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8894bbad446d))
- Scorer index building and synonym expansion simplified ([8468fce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8468fce536d1))
- Copy across the site rewritten from corporate "we" voice to personal voice ([8894bba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8894bbad446d))

### Fixed
- Memory eviction caps added to all stores to prevent OOM from unbounded growth ([53689d2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/53689d25f401))
- Rate limiting added to all public-facing mutation endpoints ([af1389a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/af1389afd4c8))
- Moderation appeal flow, incident validation, and enforcement logic hardened ([f153180](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f153180338f4))
- CLI config, clipboard, offline sync, and path handling hardened ([df058cc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/df058cc9e6c3))
- `install-cli.sh` made dynamic; `proxy.ts` restored for middleware ([cfa6818](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/cfa681885940), [128d7f9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/128d7f9c0caf))
- `Math.random()` replaced with `crypto.randomUUID()` for cryptographic randomness ([4b5b7ce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4b5b7ce42ef7))
- OpenGraph images fixed: `display:flex` for Satori, async params, Twitter cards ([6c63218](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6c63218ed95e), [8cfbd12](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8cfbd12f9725))
- CLI version now read dynamically from `package.json` instead of hardcoded `"1.0.0"` ([0babed4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0babed429026))

### Added
- Cloudflare R2 as primary CLI binary download host with GitHub fallback ([fe56e1e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fe56e1ed6798))
- Updated pricing table with current model costs across providers ([e30b718](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e30b71812f25))

---

## 2026-02-21 — 2026-02-24: License Change, Mobile Fixes & Deep Audit

### Changed
- License updated to **MIT with OpenAI/Anthropic Rider** ([49df73c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/49df73cd6963))
- GitHub social preview image added ([59df60f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/59df60fbb4a3))

### Fixed
- Mobile responsive layout, search UX, and overflow issues ([1ee09dd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1ee09dd85d6f), [60734b4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/60734b4340f4), [a5268f6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a5268f610eea))
- Deep audit-driven security, reliability, and correctness fixes across the entire codebase ([30d114d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/30d114d175e2), [044a8cd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/044a8cdfd3fc))
- Timing-safe token comparison, DST date arithmetic bugs, and multi-model feedback UI ([6cace8e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6cace8e7979e), [1c2a5f0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1c2a5f046f77))

---

## 2026-02-08 — 2026-02-10: Visual Redesign & E2E Stabilization

### Changed
- Core components redesigned with 3D effects, motion, and glass styling ([d60f8e4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d60f8e480626), [1af4293](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1af4293d546e))
- Service worker rewritten with proper caching strategies and user-controlled activation ([99da0a8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/99da0a83c2fe))
- Navigation bar, button styling, and spotlight search UX polished ([477be89](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/477be89bda68))

### Fixed
- SSR hydration mismatches resolved across redesigned components ([c4eda88](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c4eda88c9d98))
- Mermaid graph node ID collisions and escaping fixed ([6449d6f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6449d6fb47ce), [6caa7ba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6caa7babe22d))
- Locale layout restored with proper `generateStaticParams` ([f395ed1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f395ed133f6e))

### Added
- Massive test coverage sprint: 43 beads across 8 epics covering core, CLI, hooks, components, API routes, and E2E specs ([e042ea0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e042ea026441) .. [b1150cd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b1150cd9196d))
- E2E CI workflow, orchestration script, and visual regression baseline ([7336777](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7336777ad6e3))
- CLI: new command completions, BM25 offline search, and registry merge priority fix ([016b914](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/016b914aeedc))

---

## 2026-02-05 — 2026-02-07: Reviews System & For You Feed

### Added
- Full **Ratings & Reviews** system: `ReviewList` component integrated into prompt detail and bundle pages, sort options (newest, oldest, most helpful), ARIA labels and live regions ([2f2e637](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2f2e63799d74), [89285e7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/89285e7b18c3), [0bea169](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0bea169f7dc9))
- **Recommendation preferences**: tag preferences, tuned "For You" engine, and `/for-you` feed page ([eae9417](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/eae9417f2f9c), [02a119b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/02a119b31785), [7a599dc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7a599dc4e0d8))
- All cookie consent / opt-in tracking code removed ([be0c741](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/be0c74106783), [5695daa](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5695daafa81a))
- Comprehensive test coverage for reviews, recommendations, stores, hooks, and API routes (7 batches) ([cdd1b75](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/cdd1b753d919) .. [84e23fc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/84e23fca19cc))

### Fixed
- Review ID enumeration prevented via response differentiation ([abc389f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/abc389f41314))
- Rate limiting added to reviews and ratings POST endpoints ([14b04d3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/14b04d398995))
- CLI `config set` validation before saving ([72ed9e5](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/72ed9e5a92ea))

---

## 2026-02-01 — 2026-02-03: Ratings, Leaderboard & Reviews Backend

### Added
- **Ratings system**: sort by rating, filter by minimum rating, leaderboard for top-rated prompts ([064c131](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/064c13138319), [d172213](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d172213bc583), [468abf2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/468abf2c15cd))
- **Reviews API and store module** with comprehensive UI components ([58688bc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/58688bc03dcb), [779274f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/779274f9adbd))
- CLI `graph export` extended with meta/collection flags and DOT/Mermaid formats ([932d625](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/932d62594cd6), [a71f997](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a71f997f7f94))
- Budget alert summary in registry status, budget alert log views, budget settings UI ([116012f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/116012f2b7fa), [c2d8eff](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c2d8eff8e562), [7847ade](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7847ade588bb))

### Fixed
- Double-weighting of saved signals in recommendations ([c186255](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c186255ed125))
- Timing attacks and weak RNG across share links and admin auth ([bc05acd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bc05acd1ba25), [9469154](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9469154c97d6))
- Authorization bypass fixed; XSS protection improved ([dc568bb](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/dc568bb8cc48))
- Null/undefined password handling in share link endpoints ([2e0a1a4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2e0a1a4b4d43))
- Server-derived admin role with unified service worker versioning ([eaa93b3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/eaa93b33de30))

---

## 2026-01-28 — 2026-01-31: Rust CLI Port, Premium Packs & Cost Estimator

### Added
- **Rust CLI workspace** (`crates/jfp`) initialized with full command parity tracking ([b6ee63c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b6ee63c859c9))
- **Rust CLI commands**: list, show, search, copy, export, bundles, render, suggest, config, status, doctor, open, completion, interactive, update-cli — all with SQLite-backed storage and JSON output ([98233917](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/98233917c095) .. [6a391e4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6a391e4261b8))
- Rust CLI: quick-start no-args help, `NO_COLOR` env support, GitHub release version checking, embedded registry, tty interactive fallback ([6971866](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6971866b048e) .. [f12871b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f12871b5c220))
- **Premium packs** CLI command for managing curated prompt collections ([b308b91](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b308b9166976), [b4ba1aa](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b4ba1aa157a4))
- **Cost estimator** utility and `jfp cost` CLI command with model listing ([16ae686](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/16ae68601927), [8dcad4b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8dcad4bd0b29))
- **Personalized recommendations** with preference filters ([a1ca3fd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a1ca3fdfb0bd), [fe368f2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fe368f2d3480))
- **Dependency graph** and impact analysis commands with DOT/Mermaid export ([769ed1c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/769ed1c17b88))
- Cost estimation badges on prompt cards in web UI ([fc824eb](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fc824ebdc234))
- Prompt rating system UI components added to web app ([73b5d84](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/73b5d84ee029), [89957dd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/89957dd3b727))
- i18n: middleware migrated from `proxy.ts` pattern for Next.js 16 with `[locale]` folder structure and `next-intl` routing ([1669627](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1669627bc735), [d88b041](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d88b0413e25a), [f9bb909](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f9bb90967949))
- Automatic Vercel alias sync to prevent stale subdomain deployments ([6cb5524](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6cb5524b1526))
- Page Object Model testing infrastructure for E2E tests ([e41c269](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e41c2693ff8d))

### Changed
- Ultrathink directives removed from all prompts ([1f720a9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1f720a9881ea))
- Skills commands removed from `jfp` CLI (skills now managed in JSM) ([259cdd0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/259cdd065372), [0d202f5](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0d202f55a5ba))
- CLI error handling standardized across all commands ([a6718864](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a6718864396c))
- Atomic file writes consolidated into shared utility ([2881cbd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2881cbd19027))
- Free vs premium CLI features clearly documented ([294cc85](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/294cc854928e))

### Fixed
- Modular rate limiting for support tickets and Cache-Control on public APIs ([36c2fd1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/36c2fd1482d1), [2bdb3f3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2bdb3f372127))
- Vercel monorepo build configuration corrected ([58063d8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/58063d8dd893))
- Basket toggle and optional transformer import fix ([233d187](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/233d187c877b))

---

## 2026-01-20 — 2026-01-26: Discovery, Trending, Referrals & Onboarding

### Added
- **Multi-factor trending algorithm** for prompt discovery ([0d680cf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0d680cf0b1ff))
- **Onboarding flow** with improved UI components ([f484ee1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f484ee184f90))
- **Referral system** module with landing, application, rewards, and stats flows ([453e913](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/453e9138546f))
- **Profile system** with E2E tests ([a978744](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a978744db6d8))
- **Moderation queue prioritization** and bulk moderation actions ([fcf899d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fcf899dabe8e), [74bceaa](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/74bceaab30a2))
- **DMCA request flow** with admin queue ([f3b7416](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f3b7416ce269))
- **User appeals system** for moderation decisions ([3bdb3e8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3bdb3e8f3113))
- Sharing UI wired to real API endpoints; share management page ([ef41c2a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ef41c2aec514))
- Ratings API, history system, history page, and comprehensive E2E tests ([d2c7770](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d2c7770f5de4), [9ea98ba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9ea98baa64fe))
- Admin roadmap API ([2067160](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2067160c0858))
- Workflows page ([82adfcc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/82adfcc5a7d7))
- E2E test suites for Swap Meet, Ratings & Reviews, API docs, and Discovery & Trending ([538c4a0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/538c4a0d3114), [7ae5fba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7ae5fba6d546), [1885e41](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1885e4112082), [8571a9c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8571a9cfc998))
- Rust port planning documentation ([3da4f18](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3da4f18f1c8d))

---

## 2026-01-14 — 2026-01-19: CLI Premium Auth, Pro Commands & Security

### Added
- **CLI authentication**: credential storage, device code flow, token refresh, login/logout/whoami commands ([0a3d46f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0a3d46f9ebc4), [0467e70](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0467e703b6c9))
- **`jfp notes`** command for personal prompt annotations ([b679115](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b679115a606c))
- **`jfp save`** command for premium prompt bookmarking ([33e3c8a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/33e3c8a36af2))
- **`jfp collections`** command for premium prompt organization ([8d73288](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8d732885710e))
- **`jfp sync`** command for premium library offline access ([60a7202](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/60a72025cd31))
- **`jfp config`** command for CLI configuration ([251173b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/251173bc4880))
- **`jfp random`** command and `--no-color` flag ([fa791e7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fa791e75c66d))
- Enhanced `jfp list` with personal prompt filtering (`--mine`, `--saved`) ([19518b3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/19518b34763c))
- Enhanced `jfp search` with personal prompt integration and `--all` scope ([3fc20c6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3fc20c6c823b))
- CLI `--output-dir` option for export command ([1d97cf8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1d97cf855e37))
- CLI offline mode and auto-update check ([4cb76ce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4cb76cef6142))
- Pro CTA and Login links added to navigation ([e139065](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e13906516e5f))
- Admin dashboard UI with mock data ([b20fe46](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b20fe4661d8f))
- Changelog page with version history ([54171db](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/54171db14a2b))
- Public user profile pages with OpenGraph images ([d437628](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d43762849bce), [c14d7c9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c14d7c95e588))
- Scroll-triggered animation components and magnetic button ([3c474a6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3c474a67a124), [d1d305f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d1d305f0bec1))
- Bundle size monitoring infrastructure ([9d86bcd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9d86bcda87ea))
- Core Web Vitals performance monitoring ([77fc5ce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/77fc5ce27927))

### Changed
- Migrated from static imports to dynamic registry loading ([8c58c15](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8c58c1510c05))
- CLI commands refactored with shared JSON output helpers ([edb64f7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/edb64f7bd843), [9693f9a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9693f9acd231))
- All CLI commands now use `shouldOutputJson()` for consistent non-TTY output ([39fa6d9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/39fa6d93d786))
- BM25 search optimized with weighted scoring and early slicing ([5ddf5dd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5ddf5dd18c4e))
- Search expanded to include `id` and `content` fields ([e2a17e3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e2a17e3a9bd0))
- Deprecated Claude Code skills removed from repository ([8194873](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8194873a2432))

### Fixed
- Update notifications no longer corrupt JSON output ([36d5e41](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/36d5e411db94))
- Memory exhaustion prevented when reading large context files ([a77c940](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a77c94da6035))
- XSS in JsonLd and CLI ID validation hardened ([32e6137](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/32e61376daf8))
- Password hashing, timing attacks, and admin auth hardened ([907a71b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/907a71be3c04))
- iOS Safari clipboard integration completed across all components ([4f1a5d0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4f1a5d01529a))
- Unicode-aware tokenization with proper i18n support in search ([cdb4f5f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/cdb4f5f45654))
- `useSyncExternalStore` used for correct hydration in `useLocalStorage` ([d740d29](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d740d29e20ac))
- Spam checking added to support ticket replies ([f53190f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f53190f730b6))

---

## 2026-01-12 — 2026-01-13: New Prompts, Swap Meet & Stripe-Level UI Polish

### Added
- **18 new prompts**: 6 from Twitter archive + 12 from curated collection ([47ca59c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/47ca59c67103), [59dead1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/59dead1fb3cc))
- **Swap Meet**: community prompts UI with sharing dialog and public share pages ([d4ec16d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d4ec16d27fe0), [1346daf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1346daf77661))
- **ActiveFilterChips** component for filter visualization ([ca02bde](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ca02bdea5e77))
- Cookie consent banner and analytics gating (later removed in Feb) ([bf63668](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bf63668f943c))
- Contact form and support ticket system ([3f18868](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3f188687bf89))
- View Transitions API support for smooth navigation ([b9ec957](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b9ec957126bd))
- Feedback category for support tickets with contact info in API ([ca92a91](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ca92a9134d74))
- Native Next.js App Router sitemap and `robots.txt` generation ([5f7f256](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5f7f256f3c70))
- Content reporting with in-memory store ([bd3e503](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bd3e5032d556))
- Comprehensive sharing API endpoints ([67084ba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/67084ba493c9))
- User suspension and ban workflow ([8ea6a81](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8ea6a8157cfb))
- Staff picks and featured content system ([d6f3e2f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d6f3e2f74a88))
- Public status page and incident management ([ac0ed69](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ac0ed69a8839))
- PWA install prompt and offline banner ([1ce679c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1ce679c3f850))
- WCAG 2.1 AA accessibility compliance ([1b5d2ab](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1b5d2aba499f))
- Skeleton loading and layout animations for SpotlightSearch ([f0d9c8a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f0d9c8a9c5ef))
- Visual regression test suite ([461d82c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/461d82c67b6d))
- GA4 analytics tracking ([62a3eaf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/62a3eaf9b526))
- Comprehensive API documentation ([b0107de](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b0107de04871))

### Changed
- **Stripe/Linear-inspired UI overhaul**: four-phase polish pass across all components ([a791c3c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a791c3c801d6), [c45710b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c45710bbab98), [c0391e2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c0391e2a78b9))
- Complete color consistency migration to neutral palette ([8fe4725](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8fe4725866f5), [e0aba05](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e0aba05f11c7))
- Satisfying micro-interactions added to copy and basket buttons ([1c98dc0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1c98dc0fee93))
- Basket sidebar rendered via portal to fix stacking context ([8006aec](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8006aecf7472))
- Swipe gesture hints for first-time mobile users ([68181338](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/68181338a831))

---

## 2026-01-11: How It Was Made, Security Headers & Landing Page

### Added
- **How It Was Made page** with real transcript data, Stripe-level UI polish, annotated build guide, plan revision tracking, and narrative context ([385689917](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/385689917efa), [5d8c70e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5d8c70e87518), [c88eb21](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c88eb2163fc4))
- **Security headers and CSP** configuration with E2E tests ([fc1a52a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fc1a52ad7d0a), [67623601](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/67623601241a))
- **Health check endpoints** for monitoring and CI ([08ad6d4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/08ad6d4e1b43))
- **Error pages**: 404, 500, and global-error ([63a20d0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/63a20d041780))
- **Legal pages**: Privacy Policy and Community Guidelines ([a760b20](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a760b2010975))
- **Pricing page** ([810c8bf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/810c8bfeb797))
- **Marketing landing page** for organic discovery ([e852d9d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e852d9d8ed3f))
- **Help center** with docs and Sentry setup ([959d2ac](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/959d2ac2d835))
- Keyboard shortcuts system integrated into app shell ([096e827](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/096e82727eab))

### Changed
- Hooks modernized with React 18+ patterns ([c8d8548](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c8d8548710c4))
- Theme provider simplified; component consistency improved ([b113a3b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b113a3bf2883))

---

## 2026-01-10: Initial Build — Full Stack in One Day

The entire monorepo, web app, and CLI tool were built in a single Claude Code session. This is the founding commit burst.

### Added — Monorepo & Infrastructure
- Monorepo initialized: `packages/core`, `packages/cli`, `apps/web` structure ([4383785](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/43837857f6c2))
- Turbopack configured for monorepo root ([d15f98a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d15f98a71e89))
- Build scripts and static registry pipeline ([c1a15ce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c1a15ce19b58), [fb889ae](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fb889aefdb07))
- CLI build scripts for cross-platform Bun-compiled binaries ([32e7911](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/32e7911f2efc))
- `validate-prompts.ts` CI validation script ([43e2a6b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/43e2a6b06a6a))
- GitHub Actions release workflow ([f295b01](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f295b01e844e))
- `extract-transcript.ts` and `validate-publication.ts` scripts ([b6fdd9b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b6fdd9bc7f79), [9224f66](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9224f665b975))

### Added — Core Package
- TypeScript-native prompt registry with typed definitions ([4383785](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/43837857f6c2))
- BM25 search engine with precomputed term frequency ([92b43bf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/92b43bff2107))
- Enhanced bundle types and `generateBundleSkillMd` ([31f6945](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/31f69454d566))
- Skills manifest.json tracking utilities ([5a63210](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5a63210fbf55))
- Core package unit tests ([26d24e5](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/26d24e5239cd))

### Added — CLI (`jfp`)
- Full command set: `list`, `search`, `show`, `copy`, `export`, `render`, `suggest`, `status`, `refresh`, `categories`, `tags`, `open`, `doctor`, `about`, `help`, `completion`, `update-cli` ([47733493](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/47733493f42c), [3a44fac](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3a44facb7e7b), [006709a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/006709ac7f0a), [25ab299](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/25ab29912c32))
- `jfp i` interactive mode with fzf-style fuzzy search ([74b7fbb](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/74b7fbb7e1b5))
- `jfp suggest` with `--semantic` flag ([9d71510](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9d71510776d5))
- `jfp serve` MCP server mode ([6971d26](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6971d26e862c))
- `jfp install` / `jfp uninstall` with manifest tracking and `--force` option ([282dd6e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/282dd6e418f427), [18a74c2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/18a74c22dbd9))
- Shell completion for bash, zsh, and fish ([c7f6497](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c7f649748954))
- Variable support in `render` and `copy` commands ([18b8780](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/18b8780404f5))
- Comprehensive CLI end-to-end test suite ([16052b7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/16052b75d838))
- CLI package unit tests ([52ebd7c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/52ebd7c47843))

### Added — Web App
- **SpotlightSearch** with `Cmd+K` command palette and semantic search toggle ([352c31b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/352c31bdfb1a), [fe2b570](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fe2b57042ff1))
- **PromptCard** with difficulty badges, basket integration, and animations ([251176c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/251176cfe05d))
- **PromptDetailModal** with variables and mobile bottom sheet ([5740948](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5740948e43dd))
- Prompt permalink pages (`/prompts/[id]`) ([70fa15d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/70fa15de8466))
- **BundleCard** component and `/bundles` index page with bundle permalink pages ([d990712](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d99071234137), [ce2d4c6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ce2d4c6c2e12), [ce5c1cd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ce5c1cdb6ca0))
- **Basket system** with provider, sidebar, Nav button, and bulk export ([f295b01](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f295b01e844e), [7b9bdde](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7b9bddec2507))
- **WorkflowBuilder** component and `/workflows` page ([c058dd0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c058dd085cb4), [9ce5674](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9ce5674037d7))
- Install routes, UI components, and URL-synced filters ([4c80667](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4c806671a857))
- **InstallSkillButton** and **InstallAllSkillsButton** components ([223379c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/223379c0fd1d))
- Design system and UI component library ([4bbf062](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4bbf0622dc2c))
- React hooks library and animation utilities ([feb4c06](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/feb4c064dc45))
- PWA manifest, icons, metadata, and service worker with offline support ([9987ed1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9987ed10f5f0), [db45f13](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/db45f13d5683))
- **How It Was Made** transcript viewer: transcript types, MessageContent, MessageDetail, StatsDashboard, InsightCard, TranscriptTimeline components ([d0cc71a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d0cc71a64b01) .. [e3346bf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e3346bf006e4))
- Toast notifications and improved component types ([ea14946](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ea14946b5b36))
- Comprehensive SEO metadata and OpenGraph images ([78e358f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/78e358f40678), [6da00f1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6da00f11222c))
- E2E test infrastructure with Playwright ([384fc5f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/384fc5f115b1))
- Homepage E2E tests (17 tests) and prompt detail E2E tests (18 tests) ([3e857f9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3e857f9a0693), [501dcec](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/501dcec45dd0))
- Contribute page for prompt submissions ([bd1cc11](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bd1cc11086ef))
- Privacy-respecting Plausible analytics ([8448b24](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8448b241e795))
- Getting-started skill bundle ([45928472](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/45928472be4d))
- Dark mode with automatic theme detection and manual toggle (built into the component library)
- Mobile-optimized touch-friendly UI with 44px touch targets and bottom sheets ([d2b194b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d2b194bf9597), [3c69e3a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3c69e3aa2f3d))

---

## 2026-01-09: Project Genesis — Planning & Architecture

The project was conceived, planned, and the foundational blueprint written in a single evening session.

### Added
- Initial commit: project setup, README with hero illustration, and AGENTS.md ([e677395](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e67739595263), [08ef5f3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/08ef5f398e72))
- Detailed implementation plan (`PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL.md`) covering monorepo architecture, BM25 search, prompt templating, enhanced CLI, GitHub Actions, ecosystem integration, bundles, and semantic search — refined through 8 iterative review passes ([3803a5a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3803a5aaa9b0) .. [1eb82ec](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1eb82ec45145))

---

## Notes for Agents

- **No formal releases or tags exist.** All version references in the codebase (e.g., `--version` output) are derived from `package.json`.
- **Repository**: [`Dicklesworthstone/jeffreysprompts.com`](https://github.com/Dicklesworthstone/jeffreysprompts.com)
- **Default branch**: `main`
- **Commit links**: `https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/<HASH>`
- **Beads references** (e.g., `bd-3ttk`) are internal issue tracker IDs; they are not GitHub Issues.
- **Tech stack**: Next.js 16, React 19, Bun, TypeScript 5, Playwright (E2E), Vitest (unit), Rust (CLI port)
- The project was built in a single Claude Code session on 2026-01-09/10, then iteratively hardened over the following weeks.
