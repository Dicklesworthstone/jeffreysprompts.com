// Registry status and refresh commands

import { existsSync, statSync, readFileSync } from "fs";
import chalk from "chalk";
import boxen from "boxen";
import { loadConfig } from "../lib/config";
import { refreshRegistry, type RegistryMeta } from "../lib/registry-loader";
import { shouldOutputJson } from "../lib/utils";

interface StatusOptions {
  json?: boolean;
}

interface RefreshOptions {
  json?: boolean;
}

function readMetaFile(metaPath: string): RegistryMeta | null {
  if (!existsSync(metaPath)) return null;
  try {
    const raw = readFileSync(metaPath, "utf-8");
    return JSON.parse(raw) as RegistryMeta;
  } catch {
    return null;
  }
}

function formatAge(isoDate: string | undefined | null): string {
  if (!isoDate) return "unknown";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "unknown";
  const ms = Date.now() - date.getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return `${Math.floor(ms / 60000)} min ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours ago`;
  return `${Math.floor(ms / 86400000)} days ago`;
}

function formatTtl(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

/**
 * Show registry status - cache version, timestamps, settings
 */
export function statusCommand(options: StatusOptions) {
  const config = loadConfig();
  const meta = readMetaFile(config.registry.metaPath);

  // Check cache file existence and size
  let cacheSize = 0;
  let cacheExists = false;
  if (existsSync(config.registry.cachePath)) {
    cacheExists = true;
    try {
      cacheSize = statSync(config.registry.cachePath).size;
    } catch {
      // Ignore stat errors
    }
  }

  // Calculate freshness
  const isFresh = meta?.fetchedAt
    ? Date.now() - new Date(meta.fetchedAt).getTime() < config.registry.cacheTtl * 1000
    : false;

  if (shouldOutputJson(options)) {
    console.log(JSON.stringify({
      cache: {
        exists: cacheExists,
        path: config.registry.cachePath,
        size: cacheSize,
        fresh: isFresh,
      },
      meta: meta ? {
        version: meta.version,
        etag: meta.etag,
        fetchedAt: meta.fetchedAt,
        promptCount: meta.promptCount,
      } : null,
      settings: {
        remoteUrl: config.registry.remote,
        autoRefresh: config.registry.autoRefresh,
        cacheTtl: config.registry.cacheTtl,
        timeoutMs: config.registry.timeoutMs,
      },
      localPrompts: {
        enabled: config.localPrompts.enabled,
        dir: config.localPrompts.dir,
      },
    }, null, 2));
    return;
  }

  // Human-readable output
  let content = chalk.bold.cyan("Registry Status") + "\n\n";

  // Cache status
  content += chalk.green("Cache:") + "\n";
  if (cacheExists) {
    content += `  Status: ${isFresh ? chalk.green("✓ Fresh") : chalk.yellow("⚠ Stale")}\n`;
    content += `  Path: ${chalk.dim(config.registry.cachePath)}\n`;
    content += `  Size: ${(cacheSize / 1024).toFixed(1)} KB\n`;
    if (meta) {
      content += `  Version: ${meta.version}\n`;
      content += `  Prompts: ${meta.promptCount}\n`;
      content += `  Fetched: ${formatAge(meta.fetchedAt)} (${meta.fetchedAt})\n`;
      if (meta.etag) {
        content += `  ETag: ${chalk.dim(meta.etag.slice(0, 20))}...\n`;
      }
    }
  } else {
    content += `  Status: ${chalk.red("✗ No cache")}\n`;
    content += `  Path: ${chalk.dim(config.registry.cachePath)}\n`;
  }

  content += "\n" + chalk.green("Settings:") + "\n";
  content += `  Remote URL: ${chalk.dim(config.registry.remote)}\n`;
  content += `  Auto-refresh: ${config.registry.autoRefresh ? chalk.green("enabled") : chalk.dim("disabled")}\n`;
  content += `  Cache TTL: ${formatTtl(config.registry.cacheTtl)}\n`;
  content += `  Timeout: ${config.registry.timeoutMs}ms\n`;

  content += "\n" + chalk.green("Local Prompts:") + "\n";
  content += `  Enabled: ${config.localPrompts.enabled ? chalk.green("yes") : chalk.dim("no")}\n`;
  content += `  Directory: ${chalk.dim(config.localPrompts.dir)}\n`;

  console.log(boxen(content, {
    padding: 1,
    borderStyle: "round",
    borderColor: "cyan",
  }));

  // Hint
  if (!isFresh) {
    console.log(chalk.dim("\nRun 'jfp refresh' to update the cache."));
  }
}

/**
 * Force refresh registry from remote
 */
export async function refreshCommand(options: RefreshOptions) {
  const config = loadConfig();

  if (!shouldOutputJson(options)) {
    console.log(chalk.dim("Refreshing registry from " + config.registry.remote + "..."));
  }

  const startTime = Date.now();

  try {
    const result = await refreshRegistry();
    const elapsed = Date.now() - startTime;

    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({
        success: true,
        source: result.source,
        promptCount: result.prompts.length,
        version: result.meta?.version ?? null,
        fetchedAt: result.meta?.fetchedAt ?? null,
        etag: result.meta?.etag ?? null,
        elapsedMs: elapsed,
      }, null, 2));
    } else {
      if (result.source === "remote") {
        console.log(chalk.green("✓") + " Registry refreshed from remote");
        console.log(`  Version: ${result.meta?.version ?? "unknown"}`);
        console.log(`  Prompts: ${result.prompts.length}`);
        console.log(chalk.dim(`  Completed in ${elapsed}ms`));
      } else if (result.source === "cache") {
        console.log(chalk.yellow("⚠") + " Cache is already up-to-date (304 Not Modified)");
        console.log(`  Version: ${result.meta?.version ?? "unknown"}`);
        console.log(`  Prompts: ${result.prompts.length}`);
      } else {
        console.log(chalk.yellow("⚠") + " Could not reach remote, using bundled prompts");
        console.log(`  Prompts: ${result.prompts.length}`);
      }
    }
  } catch (err) {
    if (shouldOutputJson(options)) {
      console.log(JSON.stringify({
        success: false,
        error: (err as Error).message,
      }));
    } else {
      console.error(chalk.red("✗ Refresh failed: " + (err as Error).message));
    }
    process.exit(1);
  }
}
