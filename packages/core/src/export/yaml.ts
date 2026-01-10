/**
 * YAML escaping utilities for skill/bundle generation
 */

/**
 * Escape a string for safe use in a YAML double-quoted array element.
 * Handles backslashes, double quotes, and newlines.
 */
export function escapeYamlArrayItem(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

// YAML 1.1 boolean values that need quoting
const YAML_BOOLEANS = new Set([
  "true", "false", "yes", "no", "on", "off",
  "True", "False", "Yes", "No", "On", "Off",
  "TRUE", "FALSE", "YES", "NO", "ON", "OFF",
]);

// YAML null values that need quoting
const YAML_NULLS = new Set(["null", "Null", "NULL", "~"]);

/**
 * Check if a string looks like a YAML number (int, float, octal, hex)
 */
function looksLikeNumber(value: string): boolean {
  // Simple check for common number patterns
  return /^[-+]?(\d+\.?\d*([eE][-+]?\d+)?|0[xX][0-9a-fA-F]+|0[oO][0-7]+|\.\d+)$/.test(value);
}

/**
 * Escape a string for safe YAML scalar value.
 * Quotes strings containing special YAML characters.
 */
export function escapeYamlValue(value: string): string {
  // Empty string needs quoting
  if (value === "") {
    return '""';
  }

  // Check if value needs quoting (contains special chars, newlines, or starts/contains special chars)
  if (
    value.includes(":") ||
    value.includes("#") ||
    value.includes("\n") ||
    value.includes('"') ||
    value.includes("'") ||
    value.includes("[") ||
    value.includes("]") ||
    value.includes("{") ||
    value.includes("}") ||
    value.includes(">") ||
    value.includes("|") ||
    value.includes("\\") ||
    value.includes(",") ||    // Flow context separator
    value.startsWith(" ") ||
    value.endsWith(" ") ||
    value.startsWith("@") ||
    value.startsWith("!") ||
    value.startsWith("&") ||
    value.startsWith("*") ||
    value.startsWith("-") ||  // Sequence item or document marker
    value.startsWith("?") ||  // Explicit key
    value.startsWith("%") ||  // YAML directive
    value.startsWith("`") ||  // Reserved
    YAML_BOOLEANS.has(value) ||  // Boolean literals
    YAML_NULLS.has(value) ||     // Null literals
    looksLikeNumber(value)       // Numeric literals
  ) {
    // Use double quotes with escaped internal characters
    return `"${escapeYamlArrayItem(value)}"`;
  }
  return value;
}
