/**
 * CLI Configuration Module Tests
 *
 * Tests for configuration file management:
 * - Default config creation
 * - Config file read/write roundtrip
 * - Invalid/corrupt config fallback to defaults
 * - Deep merge of partial configs
 * - Environment variable overrides
 * - Dynamic path resolution
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadConfig,
  saveConfig,
  createDefaultConfig,
  getConfigDir,
  getHomeDir,
  type JfpConfig,
} from "../../src/lib/config";

// Test directory setup - use unique ID per test run
let TEST_DIR: string;
let FAKE_HOME: string;

// Store original env vars
const originalJfpHome = process.env.JFP_HOME;
const originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
const originalRegistryUrl = process.env.JFP_REGISTRY_URL;
const originalCacheTtl = process.env.JFP_CACHE_TTL;
const originalNoColor = process.env.JFP_NO_COLOR;

beforeEach(() => {
  // Create unique test directory for each test
  TEST_DIR = join(tmpdir(), "jfp-config-test-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  FAKE_HOME = join(TEST_DIR, "home");

  // Create fresh test directories
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(FAKE_HOME, { recursive: true });

  // Set JFP_HOME for testing
  process.env.JFP_HOME = FAKE_HOME;
  delete process.env.XDG_CONFIG_HOME;

  // Clear env overrides
  delete process.env.JFP_REGISTRY_URL;
  delete process.env.JFP_CACHE_TTL;
  delete process.env.JFP_NO_COLOR;
});

afterEach(() => {
  // Restore env vars
  if (originalJfpHome) {
    process.env.JFP_HOME = originalJfpHome;
  } else {
    delete process.env.JFP_HOME;
  }
  if (originalXdgConfigHome) {
    process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
  } else {
    delete process.env.XDG_CONFIG_HOME;
  }
  if (originalRegistryUrl) {
    process.env.JFP_REGISTRY_URL = originalRegistryUrl;
  } else {
    delete process.env.JFP_REGISTRY_URL;
  }
  if (originalCacheTtl) {
    process.env.JFP_CACHE_TTL = originalCacheTtl;
  } else {
    delete process.env.JFP_CACHE_TTL;
  }
  if (originalNoColor) {
    process.env.JFP_NO_COLOR = originalNoColor;
  } else {
    delete process.env.JFP_NO_COLOR;
  }

  // Cleanup test directory
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("getHomeDir", () => {
  it("returns JFP_HOME when set", () => {
    process.env.JFP_HOME = "/custom/home";
    expect(getHomeDir()).toBe("/custom/home");
  });

  it("falls back to system homedir when JFP_HOME not set", () => {
    delete process.env.JFP_HOME;
    const homeDir = getHomeDir();
    expect(homeDir).toBeTruthy();
    expect(homeDir.length).toBeGreaterThan(0);
  });
});

describe("getConfigDir", () => {
  it("returns correct config directory based on JFP_HOME", () => {
    const configDir = getConfigDir();
    expect(configDir).toBe(join(FAKE_HOME, ".config", "jfp"));
  });

  it("prefers XDG_CONFIG_HOME when set", () => {
    process.env.XDG_CONFIG_HOME = join(TEST_DIR, "xdg-config");
    const configDir = getConfigDir();
    expect(configDir).toBe(join(TEST_DIR, "xdg-config", "jfp"));
  });
});

describe("createDefaultConfig", () => {
  it("returns config with all required sections", () => {
    const config = createDefaultConfig();

    expect(config.registry).toBeDefined();
    expect(config.updates).toBeDefined();
    expect(config.skills).toBeDefined();
    expect(config.output).toBeDefined();
    expect(config.localPrompts).toBeDefined();
    expect(config.analytics).toBeDefined();
    expect(config.budgets).toBeDefined();
  });

  it("has correct default registry URL", () => {
    const config = createDefaultConfig();
    expect(config.registry.url).toBe("https://jeffreysprompts.com/api/prompts");
  });

  it("uses dynamic paths based on JFP_HOME", () => {
    const config = createDefaultConfig();
    expect(config.registry.cachePath).toContain(FAKE_HOME);
    expect(config.skills.personalDir).toContain(FAKE_HOME);
  });

  it("uses XDG_CONFIG_HOME for config and skills paths when set", () => {
    process.env.XDG_CONFIG_HOME = join(TEST_DIR, "xdg-config");
    const config = createDefaultConfig();

    expect(config.registry.cachePath).toBe(join(TEST_DIR, "xdg-config", "jfp", "registry.json"));
    expect(config.registry.metaPath).toBe(join(TEST_DIR, "xdg-config", "jfp", "registry.meta.json"));
    expect(config.skills.personalDir).toBe(join(TEST_DIR, "xdg-config", "claude", "skills"));
  });

  it("has sensible default values", () => {
    const config = createDefaultConfig();

    expect(config.registry.autoRefresh).toBe(true);
    expect(config.registry.cacheTtl).toBe(3600);
    expect(config.updates.autoCheck).toBe(true);
    expect(config.updates.channel).toBe("stable");
    expect(config.output.color).toBe(true);
    expect(config.analytics.enabled).toBe(false);
    expect(config.budgets.alertsEnabled).toBe(true);
  });
});

describe("loadConfig", () => {
  it("returns default config when no config file exists", () => {
    const config = loadConfig();
    const defaults = createDefaultConfig();

    expect(config.registry.url).toBe(defaults.registry.url);
    expect(config.updates.channel).toBe(defaults.updates.channel);
  });

  it("loads config from file", () => {
    const configDir = join(FAKE_HOME, ".config", "jfp");
    mkdirSync(configDir, { recursive: true });

    const customConfig: Partial<JfpConfig> = {
      registry: {
        url: "https://custom.example.com/api",
        remote: "https://custom.example.com/api",
        manifestUrl: "https://custom.example.com/manifest.json",
        cachePath: "/custom/cache.json",
        metaPath: "/custom/meta.json",
        autoRefresh: false,
        cacheTtl: 7200,
        timeoutMs: 5000,
      },
    };

    writeFileSync(join(configDir, "config.json"), JSON.stringify(customConfig));

    const config = loadConfig();
    expect(config.registry.url).toBe("https://custom.example.com/api");
    expect(config.registry.cacheTtl).toBe(7200);
    expect(config.registry.autoRefresh).toBe(false);
  });

  it("returns default config for corrupt JSON file", () => {
    const configDir = join(FAKE_HOME, ".config", "jfp");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, "config.json"), "not valid json {{{");

    const config = loadConfig();
    const defaults = createDefaultConfig();

    expect(config.registry.url).toBe(defaults.registry.url);
  });

  it("merges partial config with defaults", () => {
    const configDir = join(FAKE_HOME, ".config", "jfp");
    mkdirSync(configDir, { recursive: true });

    // Only specify some values
    const partialConfig = {
      output: { json: true },
    };

    writeFileSync(join(configDir, "config.json"), JSON.stringify(partialConfig));

    const config = loadConfig();

    // Custom value should be applied
    expect(config.output.json).toBe(true);
    // Default value should be preserved
    expect(config.output.color).toBe(true);
    // Other sections should have defaults
    expect(config.registry.url).toBe("https://jeffreysprompts.com/api/prompts");
  });
});

describe("saveConfig", () => {
  it("creates config directory if it does not exist", () => {
    const configDir = join(FAKE_HOME, ".config", "jfp");
    expect(existsSync(configDir)).toBe(false);

    saveConfig({ output: { color: false, json: true } });

    expect(existsSync(configDir)).toBe(true);
    expect(existsSync(join(configDir, "config.json"))).toBe(true);
  });

  it("saves config that can be loaded back", () => {
    const customConfig: Partial<JfpConfig> = {
      output: { color: false, json: true },
      analytics: { enabled: true },
    };

    saveConfig(customConfig);
    const loaded = loadConfig();

    expect(loaded.output.color).toBe(false);
    expect(loaded.output.json).toBe(true);
    expect(loaded.analytics.enabled).toBe(true);
  });

  it("merges with existing config on save", () => {
    // Save initial config
    saveConfig({ output: { color: false, json: false } });

    // Save additional settings (should merge)
    saveConfig({ analytics: { enabled: true } });

    const loaded = loadConfig();

    // Both changes should be present
    expect(loaded.output.color).toBe(false);
    expect(loaded.analytics.enabled).toBe(true);
  });

  it("writes valid JSON", () => {
    saveConfig({ output: { json: true, color: true } });

    const configPath = join(FAKE_HOME, ".config", "jfp", "config.json");
    const raw = readFileSync(configPath, "utf-8");

    expect(() => JSON.parse(raw)).not.toThrow();
  });
});

describe("environment variable overrides", () => {
  it("JFP_REGISTRY_URL overrides config registry.url", () => {
    process.env.JFP_REGISTRY_URL = "https://env-override.example.com/api";

    const config = loadConfig();
    expect(config.registry.url).toBe("https://env-override.example.com/api");
    expect(config.registry.remote).toBe("https://env-override.example.com/api");
  });

  it("JFP_CACHE_TTL overrides config registry.cacheTtl", () => {
    process.env.JFP_CACHE_TTL = "1800";

    const config = loadConfig();
    expect(config.registry.cacheTtl).toBe(1800);
  });

  it("JFP_NO_COLOR disables color output", () => {
    process.env.JFP_NO_COLOR = "1";

    const config = loadConfig();
    expect(config.output.color).toBe(false);
  });

  it("invalid JFP_CACHE_TTL falls back to default", () => {
    process.env.JFP_CACHE_TTL = "not-a-number";

    const config = loadConfig();
    expect(config.registry.cacheTtl).toBe(3600); // Default
  });

  it("env overrides take precedence over file config", () => {
    // Save config with custom URL
    saveConfig({
      registry: {
        url: "https://file-config.example.com/api",
        remote: "https://file-config.example.com/api",
        manifestUrl: "https://file-config.example.com/manifest.json",
        cachePath: "/file/cache.json",
        metaPath: "/file/meta.json",
        autoRefresh: true,
        cacheTtl: 3600,
        timeoutMs: 2000,
      },
    });

    // Set env override
    process.env.JFP_REGISTRY_URL = "https://env-override.example.com/api";

    const config = loadConfig();

    // Env should win
    expect(config.registry.url).toBe("https://env-override.example.com/api");
  });
});

describe("config file roundtrip", () => {
  it("preserves all config sections through save/load cycle", () => {
    const fullConfig: JfpConfig = {
      registry: {
        url: "https://custom.example.com/api",
        remote: "https://custom.example.com/api",
        manifestUrl: "https://custom.example.com/manifest.json",
        cachePath: "/custom/cache.json",
        metaPath: "/custom/meta.json",
        autoRefresh: false,
        cacheTtl: 7200,
        timeoutMs: 5000,
      },
      updates: {
        autoCheck: false,
        autoUpdate: true,
        channel: "beta",
        lastCheck: "2024-01-15T00:00:00Z",
      },
      skills: {
        personalDir: "/custom/skills",
        projectDir: ".jfp/skills",
        preferProject: true,
      },
      output: {
        color: false,
        json: true,
      },
      localPrompts: {
        enabled: false,
        dir: "/custom/local",
      },
      analytics: {
        enabled: true,
      },
      budgets: {
        monthlyCapUsd: 25,
        perRunCapUsd: 2,
        alertsEnabled: false,
      },
    };

    saveConfig(fullConfig);

    // Clear env overrides to get raw file config
    delete process.env.JFP_REGISTRY_URL;
    delete process.env.JFP_CACHE_TTL;
    delete process.env.JFP_NO_COLOR;

    const loaded = loadConfig();

    expect(loaded.registry.url).toBe(fullConfig.registry.url);
    expect(loaded.registry.cacheTtl).toBe(fullConfig.registry.cacheTtl);
    expect(loaded.updates.channel).toBe(fullConfig.updates.channel);
    expect(loaded.updates.lastCheck).toBe(fullConfig.updates.lastCheck);
    expect(loaded.skills.preferProject).toBe(fullConfig.skills.preferProject);
    expect(loaded.output.json).toBe(fullConfig.output.json);
    expect(loaded.localPrompts.enabled).toBe(fullConfig.localPrompts.enabled);
    expect(loaded.analytics.enabled).toBe(fullConfig.analytics.enabled);
    expect(loaded.budgets.monthlyCapUsd).toBe(fullConfig.budgets.monthlyCapUsd);
  });
});
