// CLI configuration management

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { randomBytes } from "crypto";

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
  };
}

// Legacy export for backwards compatibility
export const DEFAULT_CONFIG: JfpConfig = createDefaultConfig();

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
    const parsed = JSON.parse(raw) as Partial<JfpConfig>;
    const merged: JfpConfig = {
      ...defaultConfig,
      ...parsed,
      registry: { ...defaultConfig.registry, ...parsed.registry },
      updates: { ...defaultConfig.updates, ...parsed.updates },
      skills: { ...defaultConfig.skills, ...parsed.skills },
      output: { ...defaultConfig.output, ...parsed.output },
      localPrompts: { ...defaultConfig.localPrompts, ...parsed.localPrompts },
      analytics: { ...defaultConfig.analytics, ...parsed.analytics },
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
  };
  
  mkdirSync(configDir, { recursive: true });
  
  // Atomic write to prevent corruption
  const suffix = randomBytes(8).toString("hex");
  const tempPath = `${configFile}.${suffix}.tmp`;
  const content = JSON.stringify(merged, null, 2);

  try {
    writeFileSync(tempPath, content);
    renameSync(tempPath, configFile);
  } catch (err) {
    // Clean up temp file on failure
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}
