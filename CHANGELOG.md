# Changelog

All notable changes to **JeffreysPrompts.com** are documented here.

This project has no formal releases or tags. The timeline below is reconstructed from the full git history (1,274 commits on `main`) and organized by capability rather than raw diff order. Each section groups related work under thematic headings so readers can find what matters to them. Commit links point to the canonical repository at [`Dicklesworthstone/jeffreysprompts.com`](https://github.com/Dicklesworthstone/jeffreysprompts.com).

---

## 2026-03-15 -- 2026-03-18: CLI Ergonomics & SSR Hydration Fixes

A focused maintenance pass on CLI variable handling and server-side rendering consistency.

### CLI

- `render` command now reads context from special files such as `AGENTS.md` and `CLAUDE.md` ([71da3b1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/71da3b1cca59d07afd302b89336592ae888850d7))
- JSON-mode errors sent to stdout instead of stderr so piped consumers receive structured output ([11bdb49](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/11bdb49d8d20756ea535cf5b6a23457e4eb27b5d))
- Variable name pattern relaxed to allow leading digits and underscores ([a987be9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a987be9184d22bd7b6ff047737266ddb5af41efa))

### Web App

- Eliminated SSR hydration mismatches for date rendering with a new `ClientDate` component ([ffd09ac](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ffd09ac59986b863c75f1e4118a3b0a0d7e1fdbc), [dc591fe](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/dc591fe9c14ea5493ea208d230ff101a2e8bd8fc))

### Tests

- Test fixtures aligned with updated categories; added global `next-intl` mock ([9f125c7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9f125c74bf5d0f3f33d48cf409fe7eb9ff618914))

---

## 2026-03-05 -- 2026-03-07: Locale Routing, Referral Hardening & Store Resilience

Concentrated work on i18n navigation correctness, referral flow resilience, and deploy-safe identity persistence.

### Internationalization & Navigation

- Locale-aware global navigation flows corrected across all page types ([907096d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/907096dc45b68a7e225306c679c3a2000c3d2bde), [01af0e1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/01af0e10eef12c26218ea2fbfd6da69eea50289e))
- Locale normalization tightened for nav safety ([74185d8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/74185d876d3163e622b8551d39fa41076e96551d))
- Roadmap voting resilient to cookie resets ([2444147](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2444147792cfdf9d8a1716c6333dd8570814d542))

### Referral System

- Referral code validation, claim persistence, and replay protection hardened ([c464f35](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c464f357d44e9e37384d13c750f6162abc2cde8e))
- Referral identity now persists across Vercel deploys ([0ad03eb](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0ad03eb2d1666505657e7adbc267504c4dc963e7))
- Referral landing and claim flow fixed ([b68e035](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b68e035dce4d7287262d4ad5b31f60155d1c800c))
- Production fallback added for anonymous user IDs ([f5ba786](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f5ba786de34c8bb13c32427724d8ba8afecf6579))

### Web App Fixes

- Share dialog rehydration and refresh feedback fixed ([bd24763](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bd247637520dcadff2464ab1166de1556139b191))
- Swap-meet navigation and history resolution fixed ([a6edc5b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a6edc5b713ec354e9a29563b00a5e75d834c76a8))
- Login bootstrap and locale history regressions fixed ([1d4d221](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1d4d221c34b03ce880b66c36b94e2337debd497c))
- Stores hardened with persistent storage; history client expanded ([e9f5bfc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e9f5bfc53f25009377f99fe57bd7755218fca0eb))

### CLI Fixes

- CLI auth, export env resolution, and collections export hardened ([66cf68c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/66cf68cdfa169a55599fb3cdbb06ed8d245021de), [4f0abef](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4f0abef64c0fbe3de3be867fdd252715024af755), [e21eb98](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e21eb984894cb9ac42c95a95868545b5f33dbf78))
- Personal prompt and share/review flow inconsistencies fixed ([1115e52](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1115e52dcc63cff96ba608854875c03158b2337f), [b0cd805](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b0cd805245b78e4362edb828c0e3b5ffd91b005e))

### Documentation

- README synced with actual architecture ([f4ef353](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f4ef3538c4186c67a07c46e0ceb40eb27657d8f7))

---

## 2026-03-01 -- 2026-03-02: Test Coverage Sprint & Production Smoke Tests

### Test Infrastructure

- Production smoke tests and CLI E2E tests with PlaywrightLogger migration ([727b8f2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/727b8f2d58c362fbbd39558f6272404b2e35839d))
- 20+ new component test files covering Hero, Nav, WorkflowBuilder, BottomTabBar, FloatingActionButton, ShareManagement, BundleCard, ChangelogAccordion, ThemeToggle, RatingFilter, and more ([71172a2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/71172a216d789469e2f42dfa13fde68e50c3219f) through [6e83f91](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6e83f918cd68cb2fc32a855e60fcf321d834d92f))
- Reduced mock usage in tests; replaced fragile computed fixture references with literals ([d67e177](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d67e17727eac885af1052a30f7c88bb792705161), [20115d1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/20115d1de9059b7461af2eda0ea681e3573fd4db))

### Security & Reliability

- Admin API security hardened; PromptCard timer leak fixed ([29641e6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/29641e6d28e2e016414ad58bcc96191d123ac70d))
- CLI error helper extracted; imports cleaned and code organization improved ([61c091f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/61c091f9e79720ecced0828f4cdb9d0b407caf66))
- Bundle budget test error handling and CLI sync lock logic improved ([12ecd30](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/12ecd3038301bec1ad1176e6dedb3f6f8ab0acbd))

### Housekeeping

- Client JS bundle size limit bumped from 850 KB to 860 KB ([38a93e8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/38a93e8c3349765b8f3cc1f8a85763ecf5f0fa51))

---

## 2026-02-26 -- 2026-02-28: Search Engine Rewrite, CDN Distribution & Security Hardening

### Search Engine

- **BM25 replaced** with a single-pass precomputed scorer featuring multi-signal prefix matching as the primary ranking engine ([a42229f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a42229fb7b27e580f9b5272e482d69c5327e6eb1), [8894bba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8894bbad446dcee6b55ee925b4937f4f069d3dab))
- Scorer index building and synonym expansion simplified ([8468fce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8468fce536d1081206fb341ec745b0bdea090ede))
- Standalone BM25-only fallback hits removed from merged results ([fd08b33](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fd08b33adf2f13f8ba8341880069f0da4db6933f))

### CLI Distribution

- Cloudflare R2 added as primary CLI binary download host with GitHub fallback ([fe56e1e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fe56e1ed67985f8f0532bef29fe9776941f13885))
- CLI version now read dynamically from `package.json` instead of hardcoded `"1.0.0"` ([0babed4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0babed4290264ed92655d9af03d3d31ff2e1373d))
- `install-cli.sh` made dynamic; middleware restored ([cfa6818](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/cfa681885940134ad4da016abc9ffdc1debe104f), [128d7f9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/128d7f9c0caf64b8cefd2eb0aeaac4900bbc9790))

### Security

- `Math.random()` replaced with `crypto.randomUUID()` for cryptographic randomness across the codebase ([4b5b7ce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4b5b7ce42ef737b28a85980c7426533b2eda2e9b))
- Memory eviction caps added to all stores to prevent OOM from unbounded growth ([53689d2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/53689d25f401abebf35f319511116de57bd152a3))
- Rate limiting added to all public-facing mutation endpoints ([af1389a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/af1389afd4c8a643ca936f8713118ca82a7a29b8))
- Moderation appeal flow, incident validation, and enforcement logic hardened ([f153180](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f153180338f40f9f7bdac0bb5c07d868dfa74f47))
- Security and correctness fixes across API routes ([211770c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/211770cc59e1cff9c5ba33fe4d8a0d5cec6d9d95))
- Data-integrity and correctness issues addressed across stores ([377d359](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/377d3591d240a5ab37f4281e208f03b092b5084a))

### Web App

- OpenGraph images fixed: `display:flex` for Satori, async params, Twitter card images added ([6c63218](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6c63218ed95e256943e9c99f720ba4725fe4bd26), [8cfbd12](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8cfbd12f97254e044c8fccd7e272a81f713f9ca1))
- Scroll-driven parallax eliminated; hover effects skipped on touch devices; grid animations simplified ([76ac0ab](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/76ac0ab0bf5cc41500fa9c5b418dbd90b9f16bd0))
- OpenGraph/Twitter image routes excluded from middleware matcher ([45ddab8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/45ddab8acda075b8351cad2413c251444b68f720))
- `useLocalStorage` handles undefined values and non-serializable data ([23e8021](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/23e80214bb97b0ef3ba950cde5dd862e2b3a8cc0))

### CLI Fixes

- Config, clipboard, offline sync, and path handling hardened ([df058cc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/df058cc9e6c375a4d94737e449a4e143ae4dd0aa))
- Share link rate-limit endpoints stabilized; hook refresh callbacks fixed ([3197b71](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3197b717ce387bbcf89fc5de628fc5ffea152ddf))

### Content

- Pricing table updated with current model costs across providers ([e30b718](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e30b71812f253c8fba8b73ca1cc437dae95a4300))
- Site copy rewritten from corporate "we" voice to personal voice ([8894bba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8894bbad446dcee6b55ee925b4937f4f069d3dab))

---

## 2026-02-21 -- 2026-02-25: License Change, Deep Audit & Mobile Fixes

### License

- License updated to **MIT with OpenAI/Anthropic Rider** ([49df73c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/49df73cd6963c71d1f3b5e61658aa570b5e62da7), [544aa4e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/544aa4e2be392d6527bd148061cc4fd3c71b1d84))
- GitHub social preview image added ([59df60f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/59df60fbb4a3c5106fc8f353b1906d97cdb3be56))

### Security Audit

- Deep audit-driven security, reliability, and correctness fixes across the entire codebase ([30d114d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/30d114d175e26974e7f438aa7d668fb5bd79845e), [044a8cd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/044a8cdfd3fce65b43b8eac076a4e62034a4231c), [ba97003](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ba97003e5ebcdffef0fbdf19caeb6dca305bdc77))
- Timing-safe token comparison for length-mismatch edge cases ([6cace8e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6cace8e7979e747b5d0202473e58a9d43a932906))

### Mobile & Layout

- Mobile responsive layout, search UX, and overflow issues fixed ([1ee09dd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1ee09dd85d6f8af08c78a36f2e39fc35115724b3))
- Nav header overflow prevented; full-width nav container ensured ([a5268f6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a5268f610eea8fb78e8160a7f2da42fdf9aea719))
- `overflow-x: hidden` added to main content sections and footer ([60734b4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/60734b4340f49c80b2fbb3a65408838f9e04c0f0))
- Mobile viewport E2E test failures and flakiness fixed ([c78003f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c78003fd94a42c5000e5cb972ea673cfaa858713))

### CLI & Tests

- Date arithmetic DST bugs fixed, CLI output improvements, multi-model feedback UI added ([1c2a5f0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1c2a5f046f772b5f6b5bb33faed4c00ec7031e80))
- SpotlightSearch syntax error and framer-motion mock loose equality resolved ([c778984](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c778984b03f874dfdd0217e4f168b7fda4a648ac))
- Unused imports and dead variables cleaned from tests ([56e0f4e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/56e0f4e70ec21f769ae34b1c5bdeaea081944439))
- Correctness and type-safety fixes across web app, tests, and CLI ([2dc45fd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2dc45fd97122c014262296f8fe201eb29e648231))

---

## 2026-02-08 -- 2026-02-10: Visual Redesign, Massive Test Coverage Sprint & E2E Stabilization

### Visual Redesign

- Core components redesigned with 3D effects, motion, and glass styling ([d60f8e4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d60f8e480626c9b9008bea175dc42a874591c03a), [1af4293](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1af4293d546ec50c99da389fe347b2584192b63a))
- New hooks and components for premium UI interaction layer ([5626b1f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5626b1f17df35458b785ab85b3d18c7ed1fa86c7))
- CSS utilities, layout, and TypeScript config updated for redesign ([c6cdff1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c6cdff18f1901ff8be2ebcf88c7c97df976ce64b))
- Navigation bar, button styling, and spotlight search UX polished ([477be89](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/477be89bda68f25a55cb751176c2bac650da1e64))

### Service Worker

- Service worker rewritten with proper caching strategies and user-controlled activation ([99da0a8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/99da0a83c2fea87d9a662fada77877d052d6f389))

### SSR & Hydration

- SSR hydration mismatches resolved; non-functional MouseSpotlight removed ([c4eda88](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c4eda88c9d984b9d68111f57b737eaa8c6743ab5))
- Locale layout restored with proper `generateStaticParams` ([f395ed1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f395ed133f6ef52051334c72d0be9567cc329bcd))

### Test Coverage Sprint

- Comprehensive test coverage structure created: 8 epics, 43 beads ([e042ea0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e042ea0264415fc0578472a110d971f56aaa6918))
- Mock-free unit tests for core prompts, CLI lib modules, export, template, and semantic modules ([6b4f170](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6b4f170a886e2f5b219d1de8d5ed6d350e6be167), [f352411](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f35241111b4d8fb8da48da70ff79a182146e034a))
- CLI utility, premium command, bundles, accessibility, admin, health, SEO, and performance tests ([537a6e3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/537a6e304880c001da5f88ebcca9939f99848930), [db1ceb6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/db1ceb669e3cf8c72be7fa478538656d5895f131))
- 12 hook test files for platform, feature, and gesture hooks ([8652efe](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8652efe2b8d99b6b8f897dbaedb4821afbef38a5))
- 13 feature component tests; swipe gesture threshold fixed ([a533ee3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a533ee37856ae639660977b94bf5be6bb8e8b74b))
- 11 transcript component tests ([582b8c3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/582b8c30e463667c8003a023f636bd7a92e5ce86))
- Admin and public API route tests ([60edf1c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/60edf1c9ccb47a6f620589ea0a915d7c1a6a79d6), [cdbcf11](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/cdbcf11a137cd35a01fc896b6cf95d0a46bbee3f))
- Unit tests for health and prompts API routes ([ddf7b84](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ddf7b84c24d3f444e0eb9ffcdb3765d9fe584e18))
- Status, share, and roadmap route tests ([5ca04d1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5ca04d131427b9693d34d346acce4605e5923bac))

### E2E Stabilization

- E2E CI workflow, orchestration script, and visual regression baseline ([7336777](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7336777ad6e385293b964d461efbf5b0c0ddcabc))
- Core homepage and install flow E2E specs hardened against Turbopack streaming and framer-motion ([bb51ac9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bb51ac9d305b4e91eeb1bb9fd313383b43a683d1), [75cfe17](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/75cfe17446cea2a11bafa7d4c655093accbd111a))
- Theme E2E specs hardened with atomic evaluate strategy ([834ac55](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/834ac55b1940ec24754bea4f83a6576fe962b108))

### Rust CLI

- TTY interactive fallback mode added ([f12871b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f12871b5c220ff7a12ebf767fb973bb9cb771b8f))
- Bundle placeholders replaced with embedded registry ([0f86fab](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0f86fabf80be125cabf269750f5bc4e10e667b58))
- `update-cli` GitHub release check implemented ([5c6c7f0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5c6c7f066dd26085523999ce2302489f214d6667))
- Quick-start no-args help and `NO_COLOR` env fix ([6971866](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6971866b048eeca44df7793718f32b4ae333a86f))

### CLI (TypeScript)

- New command completions, BM25 offline search, and registry merge priority fix ([016b914](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/016b914aeedc7da74e41e5cf3261ec75fb419da3))

### Bug Fixes

- Mermaid graph node ID collisions and escaping fixed ([6449d6f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6449d6fb47ce2a8e389bbe664012985c54b8e81c), [6caa7ba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6caa7babe22d03db720c2835850945b479fd097a))
- Homepage prompt count label fixed ([9da8266](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9da8266cd52157ddae2f6b8fe9927330e711b19b))
- Stale modal timer cleared on prompt click ([9d41f00](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9d41f001735dc355cb15f0cb07659a10a1f416ee))
- Featured-store multi-type resource consistency fixed ([2f66a7a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2f66a7afd38387a36c10e7f29f1c44005008a4f8))
- Referral apply GET validation for self/used codes fixed ([e3b172e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e3b172eb6c62ea0a39a3d014be950b8d8296152e))
- History-store prune key retention prevented ([4d67b3f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4d67b3fdc806837d963076bc98ea12d02ee2f8fc))
- Share-link verify rate limiter bounded to prevent unbounded memory growth ([07b0086](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/07b00862bc427c26938fb862272c1fc0b0b820e3), [8272b70](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8272b70ca230fcf7ec0137cd3769635cce4f2748))

---

## 2026-02-05 -- 2026-02-07: Reviews System, For You Feed & Deep Hardening

### Reviews & Recommendations

- Full **Ratings & Reviews** system: `ReviewList` integrated into prompt detail and bundle pages, sort options (newest, oldest, most helpful), ARIA labels and live regions ([2f2e637](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2f2e63799d741ae4cfcf2ce7b312788e49490c67), [189c9d8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/189c9d82286041f96a1eeb3da5d2a70a89279de5), [89285e7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/89285e7b18c3d274ec8afc724878c59917ca91b5))
- Reviews API and store module with comprehensive UI components ([58688bc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/58688bc03dcbb144e849402f040864d6fc34661a), [779274f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/779274f9adbd055997033576ab73963e64a57568))
- **Recommendation preferences**: tag preferences, tuned "For You" engine, and `/for-you` feed page ([eae9417](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/eae9417f2f9c662f749f6b792a07a951a09db274), [02a119b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/02a119b317850829cbad773ce57c98d4507c6fd7), [7a599dc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7a599dc4e0d8440a5c7376cda087f7912aac1031))

### Privacy

- All cookie consent / opt-in tracking code removed ([be0c741](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/be0c741067837335448f74125068479bc5641a14), [5695daa](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5695daafa81a43124956ffb5f8a87320b39745f1), [653753d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/653753da0d027bc85283d21eeeb8e3b8c873df2a))

### Security

- Review ID enumeration prevented via response differentiation ([abc389f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/abc389f41314582ab9780c3d49ab5bdfc5995e84))
- Rate limiting added to reviews and ratings POST endpoints ([14b04d3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/14b04d3989954e09d73139776c64f61b3d773f76))
- Skills 404 ID echo removed; GA config sanitized ([d21a053](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d21a053139e69804a61af027d2b1dd9d724913d6))
- Deep hardening pass for filesystem safety, sync validation, and API auth ([9d1ec90](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9d1ec90db332bea0031f6b9137de7357084150b6))

### Rust CLI Hardening

- Config parse-safety tests and helper wiring ([983b56a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/983b56abaad30fc1304e6f39d510dbbf4f1519e5))
- Runtime unwraps removed from config/random commands ([ef9762f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ef9762fec171340c7dddb3bf4ba53d9fc418befe))
- Database and JSONL storage tests made Result-based ([6d3c1c6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6d3c1c6377389936ef87d289a4b18b1175adcc59), [708f86e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/708f86e0657f23e8ece3452dca0a2857a32d2efb))
- CI: cargo test job added ([5a4812a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5a4812ab69e96a9f2af6ea509aaf1f7a8f62e797))

### Test Coverage

- Comprehensive test suites for reviews, recommendations, stores, hooks, and API routes across 7 test batches ([cdd1b75](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/cdd1b753d91944d32a7fa7109fd2e5d976865c3f) through [84e23fc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/84e23fca19ccbc44cb33f2da42bc75e6f28296df))
- Export and install.sh route tests ([477e93e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/477e93e86cae1ba940b7a004d392d6dbe498aac1))
- CLI `config set` validation before saving ([72ed9e5](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/72ed9e5a92ea27795120c3a3d36ecacdbff87a92))
- Premium pack offline cache repaired ([6f4fbaa](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6f4fbaad3d798856eff13c30143ca0df7d1a45c3))
- CLI test timeouts stabilized ([c87eac2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c87eac2525d6350c71458bcfffb6d045f5a6d049))

---

## 2026-02-01 -- 2026-02-03: Ratings, Leaderboard, Budget Alerts & Graph Export

### Ratings System

- Sort by rating, filter by minimum rating, leaderboard for top-rated prompts ([064c131](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/064c1313831980ddbf91fee880ec64516f840aaa), [d172213](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d172213bc583c537f3f540ef58b685fa558734ea), [468abf2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/468abf2c15cdd644a3592bcfc62d434c2bafd28f))
- Rating display added to prompt cards ([89957dd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/89957dd3b727bc1eb0ad2ae27ec4a370304982ce))
- Prompt rating system UI components ([73b5d84](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/73b5d84ee0290a6a4ba3070f8ddc14365d6a0160))

### Budget & Cost

- Budget alert summary surfaced in registry status ([c2d8eff](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c2d8eff8e562d1cf906803dabcf9fa63ee41f3aa))
- Budget alert log views added ([7847ade](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7847ade588bb78a675d77586a68b0bace5c12522))
- Budget settings UI and CLI budget alerts ([116012f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/116012f2b7fa9ba3fb71c7b36bcd7f9633f8a194))

### Graph & Impact Analysis

- CLI `graph export` extended with meta/collection flags; DOT and Mermaid export formats ([932d625](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/932d62594cd64a4ad076334e39fbd909af9bcc0a), [a71f997](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a71f997f7f94c9a0efb92a4dfe699b23d0db3212))
- Mermaid node-id de-duplication in CLI ([fdedb40](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fdedb40b6a4a930be3a7a9076928ea4e52469f68))

### Security

- Timing attacks and weak RNG across share links and admin auth fixed ([bc05acd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bc05acd1ba25b19804c0eaff0a47372aa78a1a28), [9469154](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9469154c97d67beb640888f6f0d7e20271eebf36))
- Authorization bypass fixed; XSS protection improved ([dc568bb](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/dc568bb8cc482c2ccd9d2dea6392726e88080abf))
- Null/undefined password handling in share link endpoints ([2e0a1a4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2e0a1a4b4d43a950379946f470a53ce79ad61879))
- Server-derived admin role; unified service worker versioning ([eaa93b3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/eaa93b33de309e7a37967bd32d48bc2f35347b92))
- Anonymous user identity hardened ([24a21cc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/24a21cc881c032cef1ea70a758150fffa293a43d))
- No-store headers added for admin APIs ([2921919](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2921919064909a314543a8ccd7393a77d35b0d96))
- Bulk moderation control flow simplified ([60611b3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/60611b337f9f4ac4f4cf64d9edf21daba6c3e3b5))

### CLI Fixes

- Double-weighting of saved signals in recommendations fixed ([c186255](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c186255ed125fef5b87b9a99fa97cce4e248d310))
- `JFP_TOKEN` env variable skips user lookup ([3a5c775](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3a5c7756e415c21b376d915f2ec10298a0879e65))
- Share link password verification API added; revoke flow hardened ([3c11d24](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3c11d2426076a2e414daa199c847506e3d50636f), [285897a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/285897a6b43a4cf66c809f9e203667adf1f89704))
- Clipboard reliability improved ([ac39554](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ac39554184b12bd1ca2c92f22114cac3b85c38a7))

---

## 2026-01-28 -- 2026-01-31: Rust CLI Port, Premium Packs & Cost Estimator

### Rust CLI Port

- **Rust CLI workspace** (`crates/jfp`) initialized with full command parity tracking ([b6ee63c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b6ee63c859c9eb9d0e3f43742a837bf29c734830))
- Full command set implemented with SQLite-backed storage and JSON output: list, show, search, copy, export, bundles, render, suggest, config, status, doctor, open, completion, interactive, update-cli ([9823391](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/98233917c095aacb28a56fc8efdbcd85ee764388), [16af740](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/16af740d40beb7403ee7a3e338e64c36a03cf3b7), [1a4561f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1a4561f80864dfa7764bef758aa9de60f5748f83), [f6cacec](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f6cacec34b7ed1e7249d73eefe88ce5611cfc9b4), [a6d05c1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a6d05c161c3347b952adea8a4902c5689ec0b15a), [6a391e4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6a391e4261b8bd5fe232ee15dfe911a9717b2363))
- Registry refresh implemented ([586cd3d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/586cd3da7bdef3815f21977b7cc6bf66ee3bb9ba))

### Cost Estimator

- Cost estimator utility and `jfp cost` CLI command ([16ae686](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/16ae6860192759db3dea7700cb0d81aa697579a5))
- Cost model listing in CLI ([8dcad4b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8dcad4bd0b293bd606f7c2e623dd272b58df41b0))
- Cost estimation badges on prompt cards in web UI ([fc824eb](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fc824ebdc2347d3571e93ad0f138e3bd4cd2e1ed))

### Premium Packs

- Premium packs CLI command for managing curated prompt collections ([b308b91](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b308b91669760f625345ce26408033869fe55164), [b4ba1aa](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b4ba1aa157a451bac677a9588f26c20fea6942d5))
- Premium pack offline cache and update notifications ([9018cb8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9018cb887678766a456c606c24ffd321dd87871f))

### Recommendations & Graph

- Personalized prompt recommendations with preference filters ([a1ca3fd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a1ca3fdfb0bdac46e9c38006aecdfedce44532b1), [fe368f2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fe368f2d3480998b345e7b127ca81ce712e48076))
- Dependency graph and impact analysis commands with DOT/Mermaid export ([769ed1c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/769ed1c17b884a836a067cf8fbf2957e7288ad94))

### Internationalization

- i18n: middleware migrated for Next.js 16 with `[locale]` folder structure and `next-intl` routing ([1669627](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1669627bc735d5cdac7708994b7affc85069f231), [d88b041](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d88b0413e25a0ad1fbeceacd45185cca79f7a19c), [f9bb909](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f9bb90967949ce854419fad28374bbc44b3ffd2a))

### Deployment

- Automatic Vercel alias sync to prevent stale subdomain deployments ([6cb5524](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6cb5524b152662544d2daab1914da34099eee91b))
- Vercel monorepo build configuration corrected ([58063d8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/58063d8dd89325657035e36613b1927d5e0c5fe5))

### CLI Changes

- Ultrathink directives removed from all prompts ([1f720a9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1f720a9881eae2de18b9253eca9ad7d02a0c214c))
- Skills commands removed from `jfp` CLI; skills now managed in JSM ([259cdd0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/259cdd065372f01205f9eed238419057028b48ae), [0d202f5](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0d202f55a5bafe6fe360bb9dde85c5633fe54d60))
- Atomic file writes consolidated into shared utility ([2881cbd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2881cbd190271aba68229e414d45da999a215417))
- Error handling standardized across CLI commands ([a671886](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a6718864396c9d316cc31fe0704271faec0d7c8f))
- Free vs premium CLI features clearly documented ([294cc85](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/294cc854928eeb70ce325ea002b6957f9f492909))

### Testing

- Page Object Model testing infrastructure for E2E tests ([e41c269](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e41c2693ff8db43c57d85e993af0441f80ad62c9))
- Metadata assistant exports, CLI wiring, and tests ([44d7921](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/44d7921975fab2339ca9d0f1002cc0045c2a86fa))
- Ratings API tests and unified rating user ID ([5016d17](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5016d172ae0bc30dca660030c33b9df4d27a00c2))

---

## 2026-01-20 -- 2026-01-26: Discovery, Trending, Referrals & Moderation

### Discovery & Trending

- **Multi-factor trending algorithm** for prompt discovery ([0d680cf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0d680cf0b1ff2f19bd677ff9d3108810e784b09c))
- Discovery & Trending E2E tests ([8571a9c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8571a9cfc9980854c5d84ff77e1ce0909642d645))

### Referral System

- Referral system module with landing, application, rewards, and stats flows ([453e913](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/453e9138546f12b53d50d10c58581694aa34e6a5))
- Referral E2E tests for landing, application, rewards, and stats ([40487747](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/40487747bffe365e50ea0e9a05d36c75504455dd), [5cd7e70](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5cd7e7031a99829744a4f60d1b9f9800d2c3a5de))

### Moderation & Trust & Safety

- Moderation queue prioritization ([fcf899d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fcf899dabe8e4514812aed785869d00d92cbd373))
- Bulk moderation actions ([74bceaa](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/74bceaab30a2d6dffbefbf0ed0ef0a9894bc5b2c))
- DMCA request flow with admin queue ([f3b7416](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f3b7416ce26997c821f244b44a1a98a29270c825))
- User appeals system for moderation decisions ([3bdb3e8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3bdb3e8f31131190f5b151bb24d43c38b17d8ba2))

### User & Social Features

- Profile system with E2E tests ([a978744](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a978744db6d8a27fa1f069e0df6d53769e524614))
- Onboarding flow with improved UI components ([f484ee1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f484ee184f90ea493d6a3313fada7e3f2f7f4c33))
- Sharing UI wired to real API endpoints; share management page ([ef41c2a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ef41c2aec514fcfe11f48ea7ee0e5beddfd25e04))
- Ratings API, history system, history page, and history tracker component ([d2c7770](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d2c7770f5de4df7d2dfa7bfb08576e7f3fe1d817), [9ea98ba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9ea98baa64fed422337774d10fb28d1f20ae890c), [00da053](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/00da0539486133deb58a51cccabe3fc291e3bf63))

### Admin

- Admin roadmap API ([2067160](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2067160c085893a7c6674e1994ff2c8fa21a6070))
- Admin dashboard E2E test infrastructure ([806325e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/806325e3236bfd9ad370c83427d51abd89371415))
- Workflows page added ([82adfcc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/82adfcc5a7d7ca6fe17f5cdd68d445b3097e5dfa))

### E2E Coverage

- Swap Meet, Ratings & Reviews, API docs, semantic search toggle E2E tests ([538c4a0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/538c4a0d31142976bc38b0b9bc540ff2dec2d987), [7ae5fba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7ae5fba6d5469222afc563703a73999c4d004183), [1885e41](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1885e4112082237ef67377bc1380692cba5c1ca1), [b7fb623](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b7fb6236ecfc63bdf281d42178216a40b8a4ed2b))

---

## 2026-01-14 -- 2026-01-19: CLI Premium Auth, Pro Commands & Security Hardening

### CLI Authentication & Premium Commands

- **Credential storage** module for CLI authentication ([0a3d46f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0a3d46f9ebc49d3808e5e0305595f0b911a548e7))
- **Login, logout, whoami** commands with device code flow and token refresh ([0467e70](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0467e703b6c93c5afa51be3558c64cffce660580))
- Authenticated API client for CLI ([25866366](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/25866366d84c98fdd521b8103590a93d4aef0529))
- Automatic token refresh with `needsRefresh` helper ([6f4fe73](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6f4fe73b9b9bcb2a24421bf4e2b25509bc276c23))
- **`jfp notes`** for personal prompt annotations ([b679115](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b679115a606cfedc17aba9631db06a70230974c5))
- **`jfp save`** for premium prompt bookmarking ([33e3c8a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/33e3c8a36af2484b01daf597988425c60b604e1b))
- **`jfp collections`** for premium prompt organization ([8d73288](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8d732885710efd971183999292f4727b9d1841fe))
- **`jfp sync`** for premium library offline access ([60a7202](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/60a72025cd313fb30928f527a78fbf047c5a8867))
- **`jfp config`** for CLI configuration ([251173b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/251173bc4880a6cb7923525144c49b4c5d278498))
- **`jfp random`** command and `--no-color` flag ([fa791e7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fa791e75c66decee2db3d0fe4a956ad0a05286b2))
- Enhanced `jfp list` with personal prompt filtering (`--mine`, `--saved`) ([19518b3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/19518b34763cd138eb611428889f266ccb355dde))
- Enhanced `jfp search` with personal prompt integration and `--all` scope ([3fc20c6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3fc20c6c823beeaa6b479290c5e2c2d3e9362f5d))
- `--output-dir` option for export command ([1d97cf8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1d97cf855e376de76829cd666fdaa2434c8de2ea))
- Offline mode and auto-update check ([4cb76ce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4cb76cef614292fc0e8775b8b22bfe59bc6e0d47))
- Collection export functionality and offline prompt lookup ([3f37531](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3f3753115fd870e82ad7aff8d9789a7103b9cd8d))

### CLI Architecture Changes

- Migrated from static imports to dynamic registry loading ([8c58c15](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8c58c1510c0519d0d787e334d171664d0c1ea0f9))
- CLI commands refactored with shared JSON output helpers ([edb64f7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/edb64f7bd843d6ca5d1da5c79fc9e692f6b82a67), [9693f9a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9693f9acd231afcae2402d9702a693dda84f091e))
- All CLI commands use `shouldOutputJson()` for consistent non-TTY output ([39fa6d9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/39fa6d93d7868cca68fbdef5dd999570c104716b))
- Environment injection pattern for improved testability ([d28d8e4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d28d8e47fc087c86f0acec069b342968e9801bf3))
- Deprecated Claude Code skills removed from repository ([8194873](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8194873a243225de680f0254d2ca0574cfdd1a44))

### Search Engine

- BM25 search optimized with weighted scoring and early slicing ([5ddf5dd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5ddf5dd18c4edf57bb7c31ebd34645d1b5db5c7d))
- Search expanded to include `id` and `content` fields ([e2a17e3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e2a17e3a9bd0142b333854ffa3b6be0d25eb1e59))
- Stopword list reduced; tag weight increased for BM25 ([1e6f918](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1e6f9184190a73d7e2bc8c133ab91dbc87ef2fbc))
- C++ and C# preserved in search tokens ([54e0dfa](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/54e0dfa9f47680f481fa3d682ed363651f889edc))
- Unicode-aware tokenization with proper i18n support ([cdb4f5f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/cdb4f5f4565462f96e9f6685e3c8e87a99345701))
- Programming language term tokenization improved ([9d672d3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9d672d3423a3e7c2a14b76e3a0aabdf11e6b89f7))

### Web App Features

- Pro CTA and Login links added to navigation ([e139065](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e13906516e5f3cec282a9a287e3dce57b08ebad0))
- Admin dashboard UI with mock data ([b20fe46](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b20fe4661d8fa87f1a3f37a0058059659f24588b))
- Changelog page with version history ([54171db](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/54171db14a2bbcc7a0a3c60fdc05f5a15c4c384f))
- Public user profile pages with OpenGraph images ([d437628](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d43762849bce46fbaa7b35311bf20c104ea3d9c9), [c14d7c9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c14d7c95e5884e7d07b2806eec871574f4cdd3dd))
- Bundle size monitoring infrastructure ([9d86bcd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9d86bcda87eafc2569755d05489bcb5fcb1219f5))
- Core Web Vitals performance monitoring ([77fc5ce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/77fc5ce279272295750cff720fd4ffc2dc09ff5f))
- OpenGraph images for bundles and workflows pages ([4b09dcc](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4b09dccedc97c65b32a71d2627c225c42dd42c2c))

### Security

- XSS in JsonLd and CLI ID validation hardened ([32e6137](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/32e61376daf889b23dc65803c196ab6995db6f93))
- Password hashing, timing attacks, and admin auth hardened ([907a71b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/907a71be3c04df1df73c21852557bff03f261d45))
- iOS Safari clipboard integration completed across all components ([4f1a5d0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4f1a5d01529ae7dd47260e89507ee8baa5d8fdc2), [2d8a95f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2d8a95fcf6d9c6c26612fbb874705b9f8d37a117))
- Shell injection prevention in InstallSkillButton ([be04765](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/be0476551e3c20dd628fb74887c29a84ecf084f5))
- Spam checking added to support ticket replies ([f53190f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f53190f730b6e9e9a7e8edc1b111ebb722adfdeb))

### Fixes

- Update notifications no longer corrupt JSON output ([36d5e41](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/36d5e411db94a2f62fd622ae4627c5a556f6b5e5))
- Memory exhaustion prevented when reading large context files ([a77c940](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a77c94da603571d3fee0f128f41d96df433a1456))
- `useSyncExternalStore` used for correct hydration in `useLocalStorage` ([d740d29](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d740d29e20ac862e5e97f2111db88a39a287f26c))
- Clipboard hangs prevented; search tokenization improved ([7a93208](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7a9320836ee556656665537b95bb414b745b49e1))
- Orphaned skill files protected from accidental overwrite ([7c6ee49](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7c6ee498936a1fcdf06a66b6bc5f4731a5b6e166))
- Prompt variable select support with proper z-indexing ([6786b30](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6786b3063e2e7caa584802bff806e99d8c348c32))

---

## 2026-01-12 -- 2026-01-13: Swap Meet, New Prompts & Stripe-Level UI Polish

### Prompt Content

- **18 new prompts** added: 6 from Twitter archive + 12 from curated collection ([47ca59c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/47ca59c67103545b37c59c7506e7b75aa78daa97), [59dead1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/59dead1fb3ccbf01f7cbd29b8e8271cde691ca2e))

### Swap Meet

- **Swap Meet** community prompts UI with sharing dialog and public share pages ([d4ec16d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d4ec16d27fe0925d51be0e5b331d4007d5daa76d), [1346daf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1346daf77661574a838502a9ce03e41c1ebfb622))
- Singular/plural forms corrected in relative date formatting ([859d3a7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/859d3a71cdb66572e31291893774dc24ddc89c38))

### UI Design Overhaul

- **Stripe/Linear-inspired UI overhaul**: four-phase polish pass (Phase 1-4) across all components ([a791c3c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a791c3c801d681f4ef2ed645928b12b81f3ed3a9), [c45710b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c45710bbab98bb21bf9d72fe83d8f78f2932da86), [c0391e2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c0391e2a78b9fabe8adbb69d31b695f85cedb418), [f5299a0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f5299a01810b9f1ef0169559285d66f059093886))
- Complete color consistency migration to neutral palette ([8fe4725](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8fe4725866f5bdfc4bca40f2ef86acb8ab78750e), [e0aba05](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e0aba05f11c7aa55fba5f87c4e68e7748f3028ea))
- Satisfying micro-interactions for copy and basket buttons ([1c98dc0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1c98dc0fee93a104f34919b243db61e56e8e7fc3))
- Basket sidebar rendered via portal to fix stacking context ([8006aec](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8006aecf74729fd7acb7c91b706cf2c7385b1dea))
- Swipe gesture hints for first-time mobile users ([6818133](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/68181338a831835dc233bd3880657d43fc8b393a))
- ActiveFilterChips component for filter visualization ([ca02bde](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ca02bdea5e77fb3f4e445b463cf5bcf3a11623dd))
- Fade transitions when filter results change ([683c86a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/683c86ab77eb744359c5402640c89f9ef5984ff0))
- Skeleton loading and layout animations for SpotlightSearch ([f0d9c8a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f0d9c8a9c5ef30e10557311a4950be76a95f2286))
- Basket button added to PromptCard ([5d2ad34](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5d2ad34843d1101da3b96f8ba1e2d95008b8c218))

### Platform Features

- Cookie consent banner and analytics gating ([bf63668](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bf63668f943ca6f8e8dcecce5138ba0200a90227)) (later removed in Feb)
- Contact form and support ticket system ([3f18868](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3f188687bf89bce4ca634af7be3c74be068a1af7))
- View Transitions API support for smooth navigation ([b9ec957](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b9ec957126bdfa8d57326db729cb704351b13126))
- Native Next.js App Router sitemap and `robots.txt` generation ([5f7f256](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5f7f256f3c70653e032a195942e7dde7b7d42198))
- Content reporting with in-memory store ([bd3e503](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bd3e5032d5565b8667f106d30b8b752828b63225))
- Comprehensive sharing API endpoints ([67084ba](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/67084ba493c9736249ba6980c29ae247d0536ca0))
- User suspension and ban workflow ([8ea6a81](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8ea6a8157cfb98418d26fea0e0a65b1da9b37530))
- Staff picks and featured content system ([d6f3e2f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d6f3e2f74a8801524633232c50cee3faa79560b8))
- Public status page and incident management ([ac0ed69](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ac0ed69a8839ffe709e9cfffd5ccb16d779d2b7c))
- PWA install prompt and offline banner ([1ce679c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1ce679c3f850f368c5d9cb70fb3487f32ac53098))
- GA4 analytics tracking ([62a3eaf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/62a3eaf9b526721439700f2d8f01960bb7d45df5))
- Comprehensive API documentation ([b0107de](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b0107de0487111f348dc601c74744ed85043ca8c))
- CLI collection export functionality and offline prompt lookup ([3f37531](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3f3753115fd870e82ad7aff8d9789a7103b9cd8d))

### Accessibility

- WCAG 2.1 AA accessibility compliance ([1b5d2ab](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1b5d2aba499ffc418f28c14ab0bbbc6146f52c0d))
- Accessibility improvements to SwipeablePromptCard ([14d328e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/14d328e2f143f91ccf2edd2375badcb12f9c8a21))
- Touch target sizes increased to meet 44px minimum ([a9da67b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a9da67bac4c63a03fce1a4cd71ebc4eb299f2178))
- Missing aria-labels added for screen reader accessibility ([bc37a26](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bc37a26bc59930e5a94d6fda704b426fa4c68284))

### Testing

- Visual regression test suite ([461d82c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/461d82c67b6d10a6dbe47c76848dfaa72a47a03e))
- Automated color palette validation tests ([48efe50](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/48efe50fb3613195d636c2468bb494f31452f854))
- E2E tests for cookie consent, analytics, help center, moderation, keyboard shortcuts, social sharing, network resilience, basket operations, marketing landing page ([80ba6e0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/80ba6e09bbc84ad13e4c2a2310f52006da983df9), [1c10a32](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1c10a329e3bfc968c45998cd2b1dafbcf5524540), [6b68202](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6b68202d7e935058ed95a3e25f61f8adb310fbf6), [875b454](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/875b454115c488a22f02b7a16df3397cb6019c9e), [dc4a1f8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/dc4a1f8e71f57072230fd5091ff8339e5c254c2f), [704a1e8](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/704a1e8f975dd786800daf7f556de0534e0ae493))
- Integration tests for SEO and performance ([5080229](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5080229bf5dec3029527ab843ec2cde21e98b768))
- Sharing E2E coverage and helpers ([b092c77](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b092c7751bc80f1e082bbadd2125b05eab1801a8))

---

## 2026-01-11: How It Was Made, Security Headers, Landing Page & Landing Page

### How It Was Made

- **How It Was Made page** with real transcript data, Stripe-level UI polish, annotated build guide, plan revision tracking, and narrative context ([3856899](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/385689917efa329c5053f8e882e70981b3116199), [5d8c70e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5d8c70e875183a1cee1f5a0fc33805348db8ed2f), [c88eb21](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c88eb2163fc4d2b77a9a528f6e6bed4908bf344c))
- FloatingOrb animation fixed to actually float ([36d4909](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/36d49090b8533538656074ac3fbeea4dc1df2bf5))

### Security & Infrastructure

- **Security headers and CSP** configuration with E2E tests ([fc1a52a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fc1a52ad7d0a2749d041be0a3b1c295c0dd346c2), [6762360](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/67623601241a2fb2208783b4c4522120451ebfb8))
- **Health check endpoints** for monitoring and CI ([08ad6d4](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/08ad6d4e1b43ea71e880f54d1437a318066e6c88))

### Public Pages

- **Error pages**: 404, 500, and global-error ([63a20d0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/63a20d04178083e851c8c8991544f6a3fd198870))
- **Legal pages**: Privacy Policy and Community Guidelines ([a760b20](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/a760b201097578e5ec32287022b7472b8d71e690))
- **Pricing page** ([810c8bf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/810c8bfeb79723e2d26c2d4ec2a4b6d5a00f3e0b))
- **Marketing landing page** for organic discovery ([e852d9d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e852d9d8ed3fd28f861cfd093a235e25dc52550b))
- **Help center** with docs and Sentry setup ([959d2ac](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/959d2ac2d835ec56ac4e840e235193c900aa4043))
- Content reporting and timer cleanups ([c4bfa84](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c4bfa8441980d92751af894c8046bb64894ff4bd))

### UI & UX

- Keyboard shortcuts system integrated into app shell ([096e827](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/096e82727eabcfd706c56b003b5097034175838c))
- Hooks modernized with React 18+ patterns ([c8d8548](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c8d8548710c452177751e9bda0cb6874d23c0a50))
- Theme provider simplified; component consistency improved ([b113a3b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b113a3bf28832dc76bd1ea903f3bcbdf6b218c86))
- Landing page redesigned for utility-first UX ([aea6a10](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/aea6a1056d452f09a4f2b491a6e92677dae30023))

### E2E Tests

- Dark mode and theme toggle E2E tests ([da31141](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/da3114196448ea04146db2e8d046a573a0ee879f))
- OpenGraph metadata and image E2E tests ([7031d28](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7031d2821276196f531a705e9bfc79e30b0570e3))
- Mobile responsive layout E2E tests ([57b4390](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/57b4390e4f123539103c107f481082006bb2f1f2))
- Health check E2E tests ([98a55ec](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/98a55eca5ee1685a45e18d113d6b261a4b2d11a1))
- Marketing landing page and SEO E2E tests ([9634747](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9634747f5320ce2c4660fb90f14e42fc84ea4d81))

---

## 2026-01-10: Initial Build -- Full Stack in One Day

The entire monorepo, web app, and CLI tool were built in a single Claude Code session. This is the founding commit burst, spanning over 500 commits.

### Monorepo & Build Infrastructure

- Monorepo initialized: `packages/core`, `packages/cli`, `apps/web` structure ([4383785](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/43837857f6c2d412ac0170c1b6b97b2d4a86716b))
- Turbopack configured for monorepo root ([d15f98a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d15f98a71e890182f9d5e7f1cc220b48a3f78aeb))
- Build scripts and static registry pipeline ([c1a15ce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c1a15ce19b5813d8c0a8a86bff7030e5429e638f), [fb889ae](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fb889aefdb073fbe1842381ae8805aff6d66345f))
- CLI build scripts for cross-platform Bun-compiled binaries ([32e7911](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/32e7911f2efc3864249eb76309de6cb0335cf997))
- `validate-prompts.ts` CI validation script ([43e2a6b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/43e2a6b06a6a38459372971840732ce97dea8488))
- GitHub Actions release workflow ([f295b01](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f295b01e844ed490ca6844fb5f9a79aabae3e124))
- `extract-transcript.ts` and `validate-publication.ts` scripts ([b6fdd9b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b6fdd9bc7f79bcdb7dc9e09135d4b432a6cb74c2), [9224f66](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9224f665b97530faca54518312fe002bfd94f38d))
- CI/CD with parallel browser matrix for E2E tests ([f3e044f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f3e044f3133af316b55c4d91e4b93b5298ed3ee2))
- E2E test infrastructure with Playwright ([384fc5f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/384fc5f115b160d36194a53284809c80e11aff82))
- E2E logging infrastructure: TestLogger and CLI spawn wrapper ([71d47d1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/71d47d1c19b7ec1fef5139b2c0801b49bbf27085))
- Pre-release test gates ([2655ecf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/2655ecf84ca5daa650ba23917ea887d18a805c95))
- Vercel.json relocated to `apps/web` with build optimization script ([e1e61a3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e1e61a357b3a11afe986274e06e279bbd525a08d))

### Core Package

- TypeScript-native prompt registry with typed definitions ([4383785](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/43837857f6c2d412ac0170c1b6b97b2d4a86716b))
- BM25 search engine with precomputed term frequency ([92b43bf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/92b43bff21079d66f42fdf91689fa7024f552ec2))
- Enhanced bundle types and `generateBundleSkillMd` ([31f6945](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/31f69454d56677db2e6969723daf7628c9396ee2))
- Skills manifest.json tracking utilities ([5a63210](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5a63210fbf55aa1bc4c93b439eca9864895efa6d))
- Hash embedder as search fallback mechanism ([321f09b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/321f09bac1ee617529aaddd51f02500bc6a214f2))
- Workflow export functions ([f514e05](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f514e05c0eb79bf7cbdb212e4320689d41d07cb1))
- Core package unit tests ([26d24e5](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/26d24e5239cdd58f8b2576a105c078f8bbf2b9a2))
- Core search engine unit tests ([88ba6d9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/88ba6d94545fe2029763dbe3f8e2c9e54788856f))

### CLI (`jfp`)

- Full command set: `list`, `search`, `show`, `copy`, `export`, `render`, `suggest`, `status`, `refresh`, `categories`, `tags`, `open`, `doctor`, `about`, `help`, `completion`, `update-cli` ([4773349](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/47733493f42c983880ee883d23e661a3d8fe0a0c), [3a44fac](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3a44facb7e7b01df73c21852557bff03f261d45), [006709a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/006709ac7f0ab23ffa569d2f60c2db39d80bdd39), [25ab299](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/25ab29912c32156d1acc06e3c120d1ff9eb62274))
- `jfp i` interactive mode with fzf-style fuzzy search ([74b7fbb](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/74b7fbb7e1b5d5ed8330dd002ce293a17a6ecbe4))
- `jfp suggest` with `--semantic` flag ([9d71510](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9d71510776d5ce2565b56b62585808550352fc7d))
- `jfp serve` MCP server mode ([6971d26](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6971d26e862c42ff56b2ac28d6e9485fc0644360))
- `jfp install` / `jfp uninstall` with manifest tracking and `--force` option ([282dd6e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/282dd6e418f427a8dc4a4b2ed3bf64227d5cc680), [18a74c2](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/18a74c22dbd93b1c4a74de7138c4f0f6f2fde952))
- Shell completion for bash, zsh, and fish ([c7f6497](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c7f649748954c063a4e74335b90d7b6669a277fd))
- Variable support in `render` and `copy` commands ([18b8780](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/18b8780404f50df87db581403bb099d5a993931c))
- `update-cli` self-update command with checksum verification ([25ab299](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/25ab29912c32156d1acc06e3c120d1ff9eb62274), [55693ed](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/55693ede6a1d1b1532957be9958b91a43cf516db))
- TTY detection: auto-switches to JSON when piped ([bf6bd9e](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bf6bd9eabc9beff11c639142021a8590088fcee4))
- Comprehensive CLI end-to-end test suite ([16052b7](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/16052b75d838badd20fe64c8c370bfe50e3a652e))
- CLI package unit tests ([52ebd7c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/52ebd7c47843971f942d2e53944e4dbcfce62666))
- JSON schema golden tests for CLI commands ([4bfcd8a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4bfcd8a441e663c0216af655520ad5d978f4ef42))

### Web App

- **SpotlightSearch** with `Cmd+K` command palette and semantic search toggle ([352c31b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/352c31bdfb1a7d5ec56e20cfa49b8b9bfe506b7f), [fe2b570](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/fe2b57042ff1d4e6368d4e44ca8e3873e137573c))
- **PromptCard** with difficulty badges, basket integration, and animations ([251176c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/251176cfe05d76a0fd3d188ab689682d364b15fa))
- **PromptDetailModal** with variables and mobile bottom sheet ([5740948](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/5740948e43ddd31821c8f366724a2c53b3074d8d))
- Prompt permalink pages (`/prompts/[id]`) ([70fa15d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/70fa15de846686fa7e037193cbffc0c7e08bd39c))
- **BundleCard** component, `/bundles` index page, and bundle permalink pages ([d990712](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d99071234137)) ([ce2d4c6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ce2d4c6c2e12117d3a63585df7f025e98e8fc5cc), [ce5c1cd](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ce5c1cdb6ca0471d080629e26407c6cf3d0e786a))
- **Basket system** with provider, sidebar, Nav button, and bulk export ([f295b01](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f295b01e844ed490ca6844fb5f9a79aabae3e124), [7b9bdde](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/7b9bddec25073c6bd9f30d23524111ef7841b475))
- **WorkflowBuilder** component and `/workflows` page ([c058dd0](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c058dd085cb46bb98086adaa98a17b4e79c0e36b), [9ce5674](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9ce5674037d79e777f44ebaf96e85ebfba19648a))
- Install routes, UI components, and URL-synced filters ([4c80667](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4c806671a85768524062c98e39d5bb99b883323a))
- **InstallSkillButton** and **InstallAllSkillsButton** components ([223379c](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/223379c0fd1dee3111187efe8da7c48379188325))
- Design system and UI component library ([4bbf062](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4bbf0622dc2cb76ee3b69bd5262658ae0f48428a))
- React hooks library and animation utilities ([feb4c06](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/feb4c064dc453c11c2b0d70328117c7a11110882))
- PWA manifest, icons, metadata, and service worker with offline support ([9987ed1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9987ed10f5f087963d86f0b1a46de656156eac37), [db45f13](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/db45f13d5683c6d6daab11424a1893965238caf2))
- **How It Was Made** transcript viewer: transcript types, MessageContent, MessageDetail, StatsDashboard, InsightCard, TranscriptTimeline ([d0cc71a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d0cc71a64b0174867c9648c835f229f41bcdc00b) through [e3346bf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e3346bf006e4cbee878c9962d17c3d1d03e1a4b7))
- Toast notifications and improved component types ([ea14946](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/ea14946b5b36014b0a3e690a660b34dac038d55b))
- Comprehensive SEO metadata and OpenGraph images ([78e358f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/78e358f40678457b80508f6bf643f81589c92a76), [6da00f1](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/6da00f11222c249f343ea97ce7f8b2582a137bc1))
- Contribute page for prompt submissions ([bd1cc11](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/bd1cc11086ef4de42703a1158c5f664f441e7b38))
- Privacy-respecting Plausible analytics ([8448b24](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/8448b241e795e34821c5ca9b25dc14e170982ae9))
- Getting-started skill bundle ([4592847](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/45928472be4d611339d1ea84bde06f5795ad919c))
- Error boundary fallback UI with retry ([65bac15](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/65bac155f35bb06ca751c119e3c63335981b4a6c))
- ChangelogAccordion component for prompt version history ([1539cce](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1539cced748b29a0e70046eb4fe01874f6285173))
- OfflineBanner component for PWA mode ([7722293](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/77222932ea6103805f75f3343415482a72ce5aa7))
- Dark mode with automatic theme detection and smooth CSS transitions ([9c190ad](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9c190adea234aa5a4657b6b96baee7b40124b6f6))
- Mobile-optimized touch-friendly UI with 44px touch targets and bottom sheets ([d2b194b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d2b194bf9597a60a3b31330283e6086a11402ecd), [3c69e3a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3c69e3aa2f3dd2a291fe4a5eabf947f61aaede90))
- World-class modal animations ([9135bc3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9135bc39580dd7b43ca7f0bf85954c0316411b0a))
- Scroll-triggered animation components, MagneticButton, and PullToRefresh ([3c474a6](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3c474a67a1245342e76d56cb7b4876d52180c326), [d1d305f](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d1d305f0bec18eb9e09137568910776dbff59968))
- Hero component with animation integration and parallax ([9764e11](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/9764e11ef97ebcae60f65d0110e91b94181dc16f))
- World-class UI/UX enhancements for desktop and mobile ([15cac76](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/15cac76c4e1ae6c23f715f877588f1168f4642ea))

### E2E Test Coverage (Day One)

- Homepage E2E tests (17 tests) ([3e857f9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3e857f9a0693a606f85f5d15dcd967b21be53819))
- Prompt detail page E2E tests (18 tests) ([501dcec](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/501dcec45dd035e7eac7bae90eff4847be2f4b5e))
- CLI discovery flow E2E tests ([f8c7afa](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/f8c7afae39c89b0d22c527f73709742d77e25e11))
- Basket add/remove and export E2E tests ([29b5b11](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/29b5b11e9b2c155b2756f19012675d06482ff44c), [54852bb](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/54852bbf603544384b630f40caf4b4673e341291))
- Multi-tag and category filtering E2E tests ([0f11dbf](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/0f11dbf826fe9b546d97332728618ff47e784e56))
- TTY vs pipe output mode E2E tests ([4a18755](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/4a187558745110a31cc3fcab8ddae5eb43db4af7))
- Network failure handling E2E tests ([364191827](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/364191827a559c67e0a8c69fbd7b0cb6682f8a34))
- Full skill lifecycle E2E tests ([b0cb7a9](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/b0cb7a92db89eb0a42586171d9cb61b8d2b86f49))
- Release binary smoke tests ([e4d2e32](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e4d2e325159b29f73be9f585e008302843cdc64a))
- CLI authentication E2E tests ([d771f88](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d771f88fb87bbee681d8cc5e586720968715c482), [e71e69b](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e71e69bff95d77cac74e1ca4af1eee5a267351f8))
- PromptGrid component unit tests (20 tests) ([d5ced09](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/d5ced09d5f0f425f518ac38dd76d23617a174084))
- BasketSidebar component unit tests (27 tests) ([c669b3d](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/c669b3ddd029900378fb64bf3a52c142d3055552))
- useFilterState hook unit tests (33 tests) ([3590a06](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3590a0653cf82f767cc96a710b087a88c5278b7e))

---

## 2026-01-09: Project Genesis -- Planning & Architecture

The project was conceived, planned, and the foundational blueprint written in a single evening session.

### Planning

- Initial commit: project setup, README with hero illustration, and AGENTS.md ([e677395](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/e67739595263ef0e21b5fa37e48a3c46639f5550), [08ef5f3](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/08ef5f398e721aa55e3eec545c9f5a711f216cfe))
- Detailed implementation plan (`PLAN_TO_MAKE_JEFFREYSPROMPTS_WEBAPP_AND_CLI_TOOL.md`) covering monorepo architecture, BM25 search, prompt templating, enhanced CLI, GitHub Actions, ecosystem integration, bundles, and semantic search ([3803a5a](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/3803a5aaa9b0ee16445297b82cb1d9a514b89446))
- Plan refined through 8 iterative review passes, adding Parts 11-14 (CI/CD, ecosystem, bundles, semantic search) ([59cb339](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/59cb33917a34afdee40c585845d0494ff7fe1395) through [1eb82ec](https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/1eb82ec451451fc516e65771341698dd28d740d7))

---

## Notes for Agents

- **No formal releases or tags exist.** All version references in the codebase (e.g., `--version` output) are derived from `package.json`.
- **Repository**: [`Dicklesworthstone/jeffreysprompts.com`](https://github.com/Dicklesworthstone/jeffreysprompts.com)
- **Default branch**: `main`
- **Commit links**: `https://github.com/Dicklesworthstone/jeffreysprompts.com/commit/<FULL_HASH>`
- **Beads references** (e.g., `bd-3ttk`) are internal issue tracker IDs; they are not GitHub Issues.
- **Tech stack**: Next.js 16, React 19, Bun, TypeScript 5, Playwright (E2E), Vitest (unit), Rust (CLI port in `crates/jfp`)
- The project was built in a single Claude Code session on 2026-01-09/10, then iteratively hardened over the following weeks.
- This changelog covers 1,274 commits. Roughly 270 are beads sync / metadata commits that are excluded from the capability-grouped entries above.
