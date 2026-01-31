// packages/core/src/template/render.ts
// Variable substitution for templated prompts

import type { Prompt } from "../prompts/types";

/**
 * Apply default values from prompt variables
 */
function applyVariableDefaults(
  prompt: Prompt,
  vars: Record<string, string>
): Record<string, string> {
  const defaults = Object.fromEntries(
    (prompt.variables ?? [])
      .filter((v) => v.default !== undefined)
      .map((v) => [v.name, String(v.default)])
  );
  return { ...defaults, ...vars };
}

/**
 * Render a prompt with variable substitution
 * Variables are in {{VARIABLE_NAME}} format (case sensitive, UPPER_SNAKE_CASE)
 */
export function renderPrompt(
  prompt: Prompt,
  vars: Record<string, string> = {}
): string {
  const merged = applyVariableDefaults(prompt, vars);

  return prompt.content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const value = merged[key];
    return value !== undefined ? value : match; // Keep placeholder if not provided
  });
}

/**
 * Extract variable names from prompt content
 */
export function extractVariables(content: string): string[] {
  const matches = content.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

/**
 * Check if a prompt has unfilled required variables
 */
export function getMissingVariables(
  prompt: Prompt,
  vars: Record<string, string>
): string[] {
  const required = (prompt.variables ?? [])
    .filter((v) => v.required)
    .map((v) => v.name);

  return required.filter((name) => {
    const value = vars[name];
    const hasValue = value !== undefined && value !== "";
    const defaultValue = getDefaultValue(prompt, name);
    const hasDefault = defaultValue !== undefined && defaultValue !== "";
    return !hasValue && !hasDefault;
  });
}

/**
 * Get the default value for a variable
 */
export function getDefaultValue(prompt: Prompt, name: string): string | undefined {
  return prompt.variables?.find((v) => v.name === name)?.default;
}
