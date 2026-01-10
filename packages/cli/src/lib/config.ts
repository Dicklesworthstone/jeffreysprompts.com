// CLI configuration management

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

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
}

const CONFIG_DIR = join(homedir(), ".config", "jfp");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const DEFAULT_REGISTRY_URL = "https://jeffreysprompts.com/api/prompts";
const DEFAULT_CACHE_TTL = 3600;

export const DEFAULT_CONFIG: JfpConfig = {
  registry: {
    url: DEFAULT_REGISTRY_URL,
    remote: DEFAULT_REGISTRY_URL,
    manifestUrl: "https://jeffreysprompts.com/registry.manifest.json",
    cachePath: join(CONFIG_DIR, "registry.json"),
    metaPath: join(CONFIG_DIR, "registry.meta.json"),
    autoRefresh: true,
    cacheTtl: DEFAULT_CACHE_TTL,
    timeoutMs: 2000,
  },
  updates: {
    autoCheck: true,
    autoUpdate: false,
    channel: "stable",
    lastCheck: null,
  },
  skills: {
    personalDir: join(homedir(), ".config", "claude", "skills"),
    projectDir: ".claude/skills",
    preferProject: false,
  },
  output: {
    color: true,
    json: false,
  },
  localPrompts: {
    enabled: true,
    dir: join(CONFIG_DIR, "local"),
  },
  analytics: {
    enabled: false,
  },
};

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

function loadStoredConfig(): JfpConfig {
  if (!existsSync(CONFIG_FILE)) {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<JfpConfig>;
    const merged: JfpConfig = {
      ...DEFAULT_CONFIG,
      ...parsed,
      registry: { ...DEFAULT_CONFIG.registry, ...parsed.registry },
      updates: { ...DEFAULT_CONFIG.updates, ...parsed.updates },
      skills: { ...DEFAULT_CONFIG.skills, ...parsed.skills },
      output: { ...DEFAULT_CONFIG.output, ...parsed.output },
      localPrompts: { ...DEFAULT_CONFIG.localPrompts, ...parsed.localPrompts },
      analytics: { ...DEFAULT_CONFIG.analytics, ...parsed.analytics },
    };
    return merged;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function loadConfig(): JfpConfig {
  return applyEnvOverrides(loadStoredConfig());
}

export function saveConfig(config: Partial<JfpConfig>): void {
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
  };
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}
