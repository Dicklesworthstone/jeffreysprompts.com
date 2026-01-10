/**
 * Shared variable handling utilities for CLI commands
 * Used by render and copy commands for variable parsing and prompting
 */

import { existsSync, readFileSync, statSync, openSync, readSync, closeSync } from "fs";
import { input, select, editor } from "@inquirer/prompts";
import type { PromptVariable } from "@jeffreysprompts/core/prompts/types";

// Max file size for 'file' type variables (100KB)
export const MAX_FILE_VAR_SIZE = 102400;

/**
 * Parse --VAR=value args from raw argv (since cac doesn't handle dynamic flags well)
 * Only matches uppercase variable names like --MY_VAR=value
 * Pattern must match template variables: {{VAR_NAME}} where first char is A-Z, not underscore
 */
export function parseVariables(args: string[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const arg of args) {
    // First char must be A-Z (not underscore) to match template extraction pattern
    const match = arg.match(/^--([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) {
      vars[match[1]] = match[2];
    }
  }
  return vars;
}

/**
 * Read file contents with size capping for 'file' type variables
 * @throws Error if file doesn't exist
 */
export function readFileVariable(path: string, varName: string): string {
  if (!existsSync(path)) {
    throw new Error(`File not found for variable ${varName}: ${path}`);
  }

  const stats = statSync(path);
  if (stats.size > MAX_FILE_VAR_SIZE) {
    // Read only the bytes we need - prevents memory exhaustion from large files
    const fd = openSync(path, "r");
    try {
      const buffer = Buffer.allocUnsafe(MAX_FILE_VAR_SIZE);
      const bytesRead = readSync(fd, buffer, 0, MAX_FILE_VAR_SIZE, 0);
      const truncatedBuffer = buffer.subarray(0, bytesRead);
      // Decode, replacing any incomplete multi-byte sequences at the end
      const content = truncatedBuffer.toString("utf-8");
      return content + `\n\n[File truncated to ${MAX_FILE_VAR_SIZE} bytes from ${stats.size} bytes]`;
    } finally {
      closeSync(fd);
    }
  }

  return readFileSync(path, "utf-8");
}

/**
 * Prompt user interactively for a variable value
 */
export async function promptForVariable(
  variable: PromptVariable,
  currentValue?: string
): Promise<string> {
  const defaultVal = currentValue ?? variable.default;

  switch (variable.type) {
    case "select":
      if (!variable.options?.length) {
        // Fall back to text input if no options
        return input({
          message: `${variable.label}${variable.description ? ` (${variable.description})` : ""}:`,
          default: defaultVal,
        });
      }
      return select({
        message: `${variable.label}${variable.description ? ` (${variable.description})` : ""}:`,
        choices: variable.options.map((opt) => ({ value: opt, name: opt })),
        default: defaultVal,
      });

    case "multiline":
      return editor({
        message: `${variable.label}${variable.description ? ` (${variable.description})` : ""}:`,
        default: defaultVal,
      });

    case "file":
      const filePath = await input({
        message: `${variable.label} (file path)${variable.description ? ` - ${variable.description}` : ""}:`,
        default: defaultVal,
        validate: (val) => {
          if (!val.trim()) return variable.required ? "File path is required" : true;
          if (!existsSync(val)) return `File not found: ${val}`;
          return true;
        },
      });
      if (!filePath.trim()) return "";
      return readFileVariable(filePath, variable.name);

    case "path":
      return input({
        message: `${variable.label} (path)${variable.description ? ` - ${variable.description}` : ""}:`,
        default: defaultVal,
        validate: (val) => {
          if (!val.trim() && variable.required) return "Path is required";
          return true;
        },
      });

    case "text":
    default:
      return input({
        message: `${variable.label}${variable.description ? ` (${variable.description})` : ""}:`,
        default: defaultVal,
      });
  }
}

/**
 * Process variable values, handling special types like 'file' and 'path'
 * For CLI-provided values (--VAR=value flags)
 * @throws Error if file type variable points to non-existent file
 */
export function processVariableValue(
  value: string,
  variable: PromptVariable | undefined
): string {
  if (!variable) return value;

  // For 'file' type passed via CLI flag, read the file contents
  // readFileVariable will throw if file doesn't exist
  if (variable.type === "file" && value) {
    return readFileVariable(value, variable.name);
  }

  // For 'path' type, just pass through the raw value
  return value;
}
