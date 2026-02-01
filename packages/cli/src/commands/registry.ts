// Registry status and refresh commands

import { existsSync, statSync, readFileSync } from "fs";
import chalk from "chalk";
import boxen from "boxen";
import { join } from "path";
import { loadConfig, getConfigDir } from "../lib/config";
import { getAccessToken, isExpired, loadCredentials } from "../lib/credentials";
import { refreshRegistry, type RegistryMeta } from "../lib/registry-loader";
import { shouldOutputJson } from "../lib/utils";

interface StatusOptions {
  json?: boolean;
}

interface RefreshOptions {
  json?: boolean;
}

interface BudgetAlertSummary {
  count: number;
  last?: {
    type?: string;
    capUsd?: number;
    totalCostUsd?: number;
    currency?: string;
    promptId?: string;
    promptTitle?: string;
    model?: string;
    createdAt?: string;
  } | null;
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
  if (Number.isNaN(date.getTime())) return "unknown";
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

function readBudgetAlertSummary(): BudgetAlertSummary {
  const alertPath = join(getConfigDir(), "budget-alerts.jsonl");
  if (!existsSync(alertPath)) {
    return { count: 0, last: null };
  }

  try {
    const raw = readFileSync(alertPath, "utf-8").trim();
    if (!raw) return { count: 0, last: null };
    const lines = raw.split("\n").filter(Boolean);
    const lastLine = lines[lines.length - 1];
    const last = lastLine ? (JSON.parse(lastLine) as BudgetAlertSummary["last"]) : null;
    return { count: lines.length, last };
  } catch {
    return { count: 0, last: null };
  }
}

interface AuthStatus {
  authenticated: boolean;
  source: "credentials_file" | "environment" | "none";
  email?: string;
  tier?: string;
  expiresAt?: string;
  expiresInSeconds?: number;
  expired?: boolean;
}

function formatExpiresIn(expiresAt?: string): string {
  if (!expiresAt) return "unknown";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "unknown";
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "expired";
  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

async function getAuthStatus(): Promise<AuthStatus> {
  const envToken = process.env.JFP_TOKEN;
  if (envToken) {
    return {
      authenticated: true,
      source: "environment",
    };
  }

  // Trigger refresh if needed (updates credentials file on success)
  await getAccessToken();
  const creds = await loadCredentials();
  if (!creds) {
    return {
      authenticated: false,
      source: "none",
    };
  }

  const expired = isExpired(creds);
  const expiresAt = creds.expires_at;
  const expiresInSeconds = expiresAt
    ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    : undefined;

  return {
    authenticated: !expired,
    source: "credentials_file",
    email: creds.email,
    tier: creds.tier,
    expiresAt,
    expiresInSeconds,
    expired,
  };
}

/**
 * Show registry status - cache version, timestamps, settings
 */
export async function statusCommand(options: StatusOptions) {
  const config = loadConfig();
  const meta = readMetaFile(config.registry.metaPath);
  const authStatus = await getAuthStatus();
  const budgetAlerts = readBudgetAlertSummary();

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
      auth: authStatus,
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
      budgets: {
        monthlyCapUsd: config.budgets.monthlyCapUsd,
        perRunCapUsd: config.budgets.perRunCapUsd,
        alertsEnabled: config.budgets.alertsEnabled,
      },
      budgetAlerts,
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

  content += "\n" + chalk.green("Budgets:") + "\n";
  content += `  Monthly cap: ${config.budgets.monthlyCapUsd ? `$${config.budgets.monthlyCapUsd}` : chalk.dim("not set")}\n`;
  content += `  Per-run cap: ${config.budgets.perRunCapUsd ? `$${config.budgets.perRunCapUsd}` : chalk.dim("not set")}\n`;
  content += `  Alerts: ${config.budgets.alertsEnabled ? chalk.green("enabled") : chalk.dim("disabled")}\n`;
  content += `  Alert log: ${budgetAlerts.count} ${budgetAlerts.count === 1 ? "entry" : "entries"}\n`;
  if (budgetAlerts.last?.createdAt) {
    content += `  Last alert: ${formatAge(budgetAlerts.last.createdAt)} (${budgetAlerts.last.createdAt})\n`;
  }

  content += "\n" + chalk.green("Auth:") + "\n";
  if (!authStatus.authenticated) {
    const reason = authStatus.expired ? "Session expired" : "Not logged in";
    content += `  Status: ${chalk.yellow(reason)}\n`;
  } else {
    content += `  Status: ${chalk.green("Authenticated")}\n`;
    if (authStatus.email) {
      content += `  Email: ${authStatus.email}\n`;
    }
    if (authStatus.tier) {
      content += `  Tier: ${authStatus.tier}\n`;
    }
    if (authStatus.expiresAt) {
      content += `  Expires: ${formatExpiresIn(authStatus.expiresAt)} (${authStatus.expiresAt})\n`;
    }
    if (authStatus.source === "environment") {
      content += `  Source: ${chalk.dim("JFP_TOKEN")}\n`;
    }
  }

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
