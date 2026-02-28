// CLI configuration management

import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { z } from "zod";
import { atomicWriteFileSync } from "./utils";

// Zod schema for config validation
const RegistryConfigSchema = z.object({
  url: z.string().url().optional(),
  remote: z.string().url().optional(),
  manifestUrl: z.string().url().optional(),
  cachePath: z.string().optional(),
  metaPath: z.string().optional(),
  autoRefresh: z.boolean().optional(),
  cacheTtl: z.number().int().min(0).max(86400 * 30).optional(), // Max 30 days
  timeoutMs: z.number().int().min(100).max(60000).optional(), // 100ms to 60s
}).strict().partial();

const UpdatesConfigSchema = z.object({
  autoCheck: z.boolean().optional(),
  autoUpdate: z.boolean().optional(),
  channel: z.enum(["stable", "beta"]).optional(),
  lastCheck: z.string().nullable().optional(),
  latestKnownVersion: z.string().nullable().optional(),
}).strict().partial();

const SkillsConfigSchema = z.object({
  personalDir: z.string().optional(),
  projectDir: z.string().optional(),
  preferProject: z.boolean().optional(),
}).strict().partial();

const OutputConfigSchema = z.object({
  color: z.boolean().optional(),
  json: z.boolean().optional(),
}).strict().partial();

const LocalPromptsConfigSchema = z.object({
  enabled: z.boolean().optional(),
  dir: z.string().optional(),
}).strict().partial();

const AnalyticsConfigSchema = z.object({
  enabled: z.boolean().optional(),
}).strict().partial();

const BudgetsConfigSchema = z.object({
  monthlyCapUsd: z.number().min(0).max(100000).nullable().optional(),
  perRunCapUsd: z.number().min(0).max(10000).nullable().optional(),
  alertsEnabled: z.boolean().optional(),
}).strict().partial();

export const PartialConfigSchema = z.object({
  registry: RegistryConfigSchema.optional(),
  updates: UpdatesConfigSchema.optional(),
  skills: SkillsConfigSchema.optional(),
  output: OutputConfigSchema.optional(),
  localPrompts: LocalPromptsConfigSchema.optional(),
  analytics: AnalyticsConfigSchema.optional(),
  budgets: BudgetsConfigSchema.optional(),
}).strict().partial();

export interface JfpConfig {
  registry: {
    url: string;
    remote: string;
    manifestUrl: string;
    cachePath: string;
    metaPath: string;
    autoRefresh: boolean;
    cacheTtl: number;
    timeoutMs: number;
  };
  updates: {
    autoCheck: boolean;
    autoUpdate: boolean;
    channel: "stable" | "beta";
    lastCheck: string | null;
    latestKnownVersion?: string | null;
  };
  skills: {
    personalDir: string;
    projectDir: string;
    preferProject: boolean;
  };
  output: {
    color: boolean;
    json: boolean;
  };
  localPrompts: {
    enabled: boolean;
    dir: string;
  };
  analytics: {
    enabled: boolean;
  };
  budgets: {
    monthlyCapUsd: number | null;
    perRunCapUsd: number | null;
    alertsEnabled: boolean;
  };
}

// Allow overriding home directory for testing via JFP_HOME env var
export function getHomeDir(): string {
  return process.env.JFP_HOME || homedir();
}

// Dynamic config directory (respects JFP_HOME env var)
export function getConfigDir(): string {
  return join(getHomeDir(), ".config", "jfp");
}

function getConfigFile(): string {
  return join(getConfigDir(), "config.json");
}

const DEFAULT_REGISTRY_URL = "https://jeffreysprompts.com/api/prompts";
const DEFAULT_CACHE_TTL = 3600;

// Create default config with dynamic paths (respects JFP_HOME env var)
export function createDefaultConfig(): JfpConfig {
  const configDir = getConfigDir();
  const home = getHomeDir();

  return {
    registry: {
      url: DEFAULT_REGISTRY_URL,
      remote: DEFAULT_REGISTRY_URL,
      manifestUrl: "https://jeffreysprompts.com/registry.manifest.json",
      cachePath: join(configDir, "registry.json"),
      metaPath: join(configDir, "registry.meta.json"),
      autoRefresh: true,
      cacheTtl: DEFAULT_CACHE_TTL,
      timeoutMs: 2000,
    },
    updates: {
      autoCheck: true,
      autoUpdate: false,
      channel: "stable",
      lastCheck: null,
      latestKnownVersion: null,
    },
    skills: {
      personalDir: join(home, ".config", "claude", "skills"),
      projectDir: ".claude/skills",
      preferProject: false,
    },
    output: {
      color: true,
      json: false,
    },
    localPrompts: {
      enabled: true,
      dir: join(configDir, "local"),
    },
    analytics: {
      enabled: false,
    },
    budgets: {
      monthlyCapUsd: null,
      perRunCapUsd: null,
      alertsEnabled: true,
    },
  };
}

// Use createDefaultConfig() instead — a module-level singleton would be stale
// if JFP_HOME is set after module import.

function parseEnvNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function applyEnvOverrides(config: JfpConfig): JfpConfig {
  const registryUrl = process.env.JFP_REGISTRY_URL;
  const cacheTtl = parseEnvNumber(process.env.JFP_CACHE_TTL);
  const noColor = process.env.JFP_NO_COLOR;

  return {
    ...config,
    registry: {
      ...config.registry,
      url: registryUrl ?? config.registry.url,
      remote: registryUrl ?? config.registry.remote,
      cacheTtl: cacheTtl ?? config.registry.cacheTtl,
    },
    output: {
      ...config.output,
      color: noColor ? false : config.output.color,
    },
  };
}

export function loadStoredConfig(): JfpConfig {
  const configFile = getConfigFile();
  const defaultConfig = createDefaultConfig();

  if (!existsSync(configFile)) {
    return defaultConfig;
  }
  try {
    const raw = readFileSync(configFile, "utf-8");
    const jsonParsed = JSON.parse(raw);

    // Validate sections independently so one error doesn't nuke the whole config
    const parsed: any = {};
    
    if (jsonParsed.registry) {
      const res = RegistryConfigSchema.safeParse(jsonParsed.registry);
      if (res.success) parsed.registry = res.data;
      else if (process.env.JFP_DEBUG) console.warn("[Config] registry errors:", res.error.flatten());
    }
    if (jsonParsed.updates) {
      const res = UpdatesConfigSchema.safeParse(jsonParsed.updates);
      if (res.success) parsed.updates = res.data;
      else if (process.env.JFP_DEBUG) console.warn("[Config] updates errors:", res.error.flatten());
    }
    if (jsonParsed.skills) {
      const res = SkillsConfigSchema.safeParse(jsonParsed.skills);
      if (res.success) parsed.skills = res.data;
      else if (process.env.JFP_DEBUG) console.warn("[Config] skills errors:", res.error.flatten());
    }
    if (jsonParsed.output) {
      const res = OutputConfigSchema.safeParse(jsonParsed.output);
      if (res.success) parsed.output = res.data;
      else if (process.env.JFP_DEBUG) console.warn("[Config] output errors:", res.error.flatten());
    }
    if (jsonParsed.localPrompts) {
      const res = LocalPromptsConfigSchema.safeParse(jsonParsed.localPrompts);
      if (res.success) parsed.localPrompts = res.data;
      else if (process.env.JFP_DEBUG) console.warn("[Config] localPrompts errors:", res.error.flatten());
    }
    if (jsonParsed.analytics) {
      const res = AnalyticsConfigSchema.safeParse(jsonParsed.analytics);
      if (res.success) parsed.analytics = res.data;
      else if (process.env.JFP_DEBUG) console.warn("[Config] analytics errors:", res.error.flatten());
    }
    if (jsonParsed.budgets) {
      const res = BudgetsConfigSchema.safeParse(jsonParsed.budgets);
      if (res.success) parsed.budgets = res.data;
      else if (process.env.JFP_DEBUG) console.warn("[Config] budgets errors:", res.error.flatten());
    }

    const merged: JfpConfig = {
      ...defaultConfig,
      ...parsed,
      registry: { ...defaultConfig.registry, ...parsed.registry },
      updates: { ...defaultConfig.updates, ...parsed.updates },
      skills: { ...defaultConfig.skills, ...parsed.skills },
      output: { ...defaultConfig.output, ...parsed.output },
      localPrompts: { ...defaultConfig.localPrompts, ...parsed.localPrompts },
      analytics: { ...defaultConfig.analytics, ...parsed.analytics },
      budgets: { ...defaultConfig.budgets, ...parsed.budgets },
    };
    return merged;
  } catch {
    return defaultConfig;
  }
}

export function loadConfig(): JfpConfig {
  return applyEnvOverrides(loadStoredConfig());
}

export function saveConfig(config: Partial<JfpConfig>): void {
  const configDir = getConfigDir();
  const configFile = getConfigFile();
  const base = loadStoredConfig();
  const merged: JfpConfig = {
    ...base,
    ...config,
    registry: { ...base.registry, ...config.registry },
    updates: { ...base.updates, ...config.updates },
    skills: { ...base.skills, ...config.skills },
    output: { ...base.output, ...config.output },
    localPrompts: { ...base.localPrompts, ...config.localPrompts },
    analytics: { ...base.analytics, ...config.analytics },
    budgets: { ...base.budgets, ...config.budgets },
  };
  
  const content = JSON.stringify(merged, null, 2);
  atomicWriteFileSync(configFile, content);
}
