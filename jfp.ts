#!/usr/bin/env bun
import { cli } from "./packages/cli/src/index";
import { checkForUpdatesInBackground } from "./packages/cli/src/lib/auto-update";

// Check for updates in background (non-blocking)
// IMPORTANT: Skip for update-check-internal to prevent fork bomb (infinite recursive spawning)
if (!process.argv.includes("update-check-internal")) {
  checkForUpdatesInBackground();
}

cli.parse();