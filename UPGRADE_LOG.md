# Dependency Upgrade Log

**Date:** 2026-11-22  |  **Project:** jeffreysprompts.com  |  **Language:** TypeScript / Bun

## Summary
- **CLI & Core Runtime Upgrades:** `@modelcontextprotocol/sdk` `1.25.2 -> 1.32.2`, `zod` `4.3.5 -> 4.6.7`, `ora` `9.0.0 -> 9.4.1`, `open` `11.0.0 -> 11.0.4`, `@inquirer/prompts` `7.2.0 -> 7.10.1`, plus transitive security refreshes (`hono`, `@hono/node-server`, `express`, `body-parser`, `qs`, `proxy-addr`, `path-to-regexp`, `ajv`, `fast-uri`).
- **Web App & Tooling Upgrades:** `next` `16.1.1 -> 16.4.6`, `react` / `react-dom` `19.2.3 -> 19.3.1`, `@sentry/nextjs` `10.32.1 -> 10.78.0`, `next-intl` `4.7.0 -> 4.15.3`, `framer-motion` `12.25.0 -> 12.43.0`, `tailwindcss` / `@tailwindcss/postcss` `4.1.18 -> 4.3.5`, `vitest` / `@vitest/coverage-v8` `4.0.16 -> 4.1.12`, `happy-dom` `20.1.0 -> 21.0.4`, `playwright` / `@playwright/test` / `playwright-core` `1.57.0 -> 1.65.1`, `@axe-core/playwright` `4.11.1 -> 4.14.0`, `oxlint` `1.38.0 -> 1.94.0`, `eslint` `9.39.2 -> 9.39.5`, `jszip` `3.10.1 -> 3.10.2`, `tailwind-merge` `3.4.0 -> 3.7.1`, `web-vitals` `5.1.0 -> 5.3.0`, `@radix-ui/react-*`, `bun-types` / `@types/bun` `1.3.9 -> 1.4.5`.
- **Intentional Pins:** `typescript` kept on `5.9.3` (7.x is incompatible with Next.js 16 / ESLint toolchain), `eslint-config-next` kept on `16.1.1` with `eslint-plugin-react-hooks` pinned to `7.0.1` via root `overrides` to preserve existing zero-error ESLint behavior across pre-existing web components.

## Security Audit
- **Before:** `bun audit` reported `229 vulnerabilities (8 critical, 91 high, 115 moderate, 15 low)`.
- **After:** `bun audit` reports `11 vulnerabilities (0 critical, 7 high, 4 moderate)` — all 11 are in dev-only transitive chains (`@size-limit/preset-app` / `estimo` / `puppeteer-core`, `@sentry/bundler-plugins`, and `eslint-plugin-react-hooks` Zod v3). **0 vulnerabilities** remain in `@jeffreysprompts/cli` or `@jeffreysprompts/core` runtime dependencies.

## Verification
- `bun run validate`: 21 prompts, 2 bundles, 1 workflow validated.
- `packages/core` / `packages/cli` / `apps/web` `tsc --noEmit`: 0 errors.
- `apps/web` `eslint && oxlint`: 0 errors.
- `apps/web` production build (`bun run build`): compiled cleanly (`Next.js 16.4.6`), 483/483 static pages generated.
- `apps/web` unit tests (`vitest`): 225/225 test files (3,718 passed, 11 skipped).
- `jfp.test.ts` (16/16), `e2e/cli-workflow.test.ts` (44/44), `packages/core` tests, and `packages/cli` command/lib tests: all passing.
