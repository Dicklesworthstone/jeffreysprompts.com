#!/usr/bin/env bun
import { cli } from "./packages/cli/src/index";
import { checkForUpdatesInBackground } from "./packages/cli/src/lib/auto-update";

// Check for updates in background (non-blocking)
checkForUpdatesInBackground();

cli.parse();