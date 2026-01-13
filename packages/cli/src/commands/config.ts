/**
 * Config Command
 *
 * Manages CLI configuration file settings.
 * Supports viewing, getting, setting, and resetting configuration values.
 */

import chalk from "chalk";
import boxen from "boxen";
import {
  loadConfig,
  loadStoredConfig,
  saveConfig,
  getConfigDir,
  createDefaultConfig,
  type JfpConfig,
} from "../lib/config";
import { shouldOutputJson } from "../lib/utils";
import { join } from "path";

export interface ConfigOptions {
  json?: boolean;
}

type ConfigPath = string;
type ConfigValue = string | number | boolean | null;

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    // Check for null explicitly since typeof null === "object"
    if (!(part in current) || current[part] === null || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    current[lastPart] = value;
  }
}

/**
 * Parse a string value into the appropriate type, guided by expected type
 */
function parseValue(value: string, expectedType?: string): ConfigValue {
  // If we expect a string, preserve it exactly (avoids "true" -> true for string fields)
  if (expectedType === "string") {
    return value;
  }

  // If we expect a number, try to parse as number
  if (expectedType === "number") {
    const num = Number(value);
    if (!Number.isNaN(num) && value.trim() !== "") return num;
  }

  // If we expect a boolean, try to parse as boolean
  if (expectedType === "boolean") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }

  // Fallback / Inference
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  if (value.toLowerCase() === "null") return null;

  const num = Number(value);
  if (!Number.isNaN(num) && value.trim() !== "") return num;

  return value;
}

/**
 * Flatten an object for display
 */
function flattenConfig(obj: Record<string, unknown>, prefix = ""): Array<{ key: string; value: string }> {
  const result: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result.push(...flattenConfig(value as Record<string, unknown>, fullKey));
    } else {
      result.push({ key: fullKey, value: JSON.stringify(value) });
    }
  }

  return result;
}

/**
 * List all configuration values
 */
export async function configListCommand(options: ConfigOptions = {}): Promise<void> {
  const config = loadConfig();

  if (shouldOutputJson(options)) {
    writeJson(config as unknown as Record<string, unknown>);
    return;
  }

  const flattened = flattenConfig(config as unknown as Record<string, unknown>);
  const maxKeyLength = flattened.length > 0 ? Math.max(...flattened.map((f) => f.key.length)) : 0;

  let content = chalk.bold.cyan("CLI Configuration") + "\n\n";

  let currentSection = "";
  for (const { key, value } of flattened) {
    const section = key.split(".")[0];
    if (section !== currentSection) {
      if (currentSection !== "") content += "\n";
      content += chalk.green(`[${section}]`) + "\n";
      currentSection = section ?? "";
    }

    const displayKey = key.split(".").slice(1).join(".");
    const sectionLabel = section ?? "";
    const padding = Math.max(0, maxKeyLength - sectionLabel.length - 1);
    content += `  ${displayKey.padEnd(padding)} ${chalk.dim("=")} ${chalk.yellow(value)}\n`;
  }

  console.log(boxen(content, {
    padding: 1,
    borderStyle: "round",
    borderColor: "cyan",
  }));

  console.log(chalk.dim(`\nConfig file: ${join(getConfigDir(), "config.json")}`));
}

/**
 * Get a specific configuration value
 */
export async function configGetCommand(key: ConfigPath, options: ConfigOptions = {}): Promise<void> {
  const config = loadConfig();
  const value = getNestedValue(config as unknown as Record<string, unknown>, key);

  if (value === undefined) {
    if (shouldOutputJson(options)) {
      writeJson({ error: true, code: "not_found", message: `Config key not found: ${key}` });
    } else {
      console.error(chalk.red(`Config key not found: ${key}`));
    }
    process.exit(1);
  }

  if (shouldOutputJson(options)) {
    writeJson({ key, value });
  } else {
    if (typeof value === "object") {
      console.log(JSON.stringify(value, null, 2));
    } else {
      console.log(String(value));
    }
  }
}

/**
 * Set a configuration value
 */
export async function configSetCommand(
  key: ConfigPath,
  value: string,
  options: ConfigOptions = {}
): Promise<void> {
  const config = loadStoredConfig() as unknown as Record<string, unknown>;

  // Validate that the key exists in the default config
  const defaults = createDefaultConfig() as unknown as Record<string, unknown>;
  const existingValue = getNestedValue(defaults, key);

  if (existingValue === undefined) {
    if (shouldOutputJson(options)) {
      writeJson({ error: true, code: "invalid_key", message: `Unknown config key: ${key}` });
    } else {
      console.error(chalk.red(`Unknown config key: ${key}`));
      console.log(chalk.dim("Run 'jfp config list' to see available options"));
    }
    process.exit(1);
  }

  // Parse and set the new value, using existing type as a hint
  const expectedType = existingValue === null ? undefined : typeof existingValue;
  const parsedValue = parseValue(value, expectedType);
  setNestedValue(config, key, parsedValue);

  // Save the updated config
  saveConfig(config as unknown as Partial<JfpConfig>);

  if (shouldOutputJson(options)) {
    writeJson({ key, value: parsedValue, success: true });
  } else {
    console.log(chalk.green("✓") + ` Set ${chalk.cyan(key)} = ${chalk.yellow(JSON.stringify(parsedValue))}`);
  }
}

/**
 * Reset configuration to defaults
 */
export async function configResetCommand(options: ConfigOptions = {}): Promise<void> {
  const defaults = createDefaultConfig();
  saveConfig(defaults);

  if (shouldOutputJson(options)) {
    writeJson({ reset: true, config: defaults as unknown as Record<string, unknown> });
  } else {
    console.log(chalk.green("✓") + " Configuration reset to defaults");
    console.log(chalk.dim(`Config file: ${join(getConfigDir(), "config.json")}`));
  }
}

/**
 * Show config file path
 */
export async function configPathCommand(options: ConfigOptions = {}): Promise<void> {
  const configPath = join(getConfigDir(), "config.json");

  if (shouldOutputJson(options)) {
    writeJson({
      configDir: getConfigDir(),
      configFile: configPath,
    });
  } else {
    console.log(configPath);
  }
}
