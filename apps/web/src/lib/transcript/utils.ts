/**
 * Transcript utility functions for the "How It Was Made" page.
 * Used by MessageContent for formatting and syntax highlighting.
 */

/**
 * Format an ISO timestamp as a localized time string (HH:MM).
 */
export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format the duration between two ISO timestamps as a human-readable string.
 * Returns "Xh Ym" for hours+minutes, or "Xm" for minutes only.
 */
export function formatDuration(start: string, end: string): string {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();

  if (isNaN(startMs) || isNaN(endMs)) {
    return "0m";
  }

  const diffMs = Math.max(0, endMs - startMs);
  const totalMinutes = Math.round(diffMs / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

/**
 * Detect the language of a code block for syntax highlighting.
 * Uses simple heuristics based on content patterns.
 */
export function detectLanguage(content: string): string {
  const trimmed = content.trim();

  // Empty content
  if (!trimmed) {
    return "text";
  }

  // JSON: starts with { or [
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    // Verify it looks like valid JSON structure
    if (trimmed.endsWith("}") || trimmed.endsWith("]")) {
      return "json";
    }
  }

  // Bash/Shell: shebang or common shell patterns
  if (
    trimmed.startsWith("#!/bin/") ||
    trimmed.startsWith("#!") ||
    /^(export|source|alias|chmod|mkdir|cd|ls|rm|cp|mv|curl|wget|npm|bun|yarn|pnpm|git|docker)\s/.test(
      trimmed
    )
  ) {
    return "bash";
  }

  // TypeScript/JavaScript: common keywords and patterns
  if (
    /^(import|export|const|let|var|function|class|interface|type|enum|async|await)\s/.test(
      trimmed
    ) ||
    /^(import\s+\{|export\s+(default|const|function|class|type|interface))/.test(
      trimmed
    ) ||
    trimmed.includes("=> {") ||
    trimmed.includes("(): ") ||
    /\bconst\s+\w+\s*=/.test(trimmed) ||
    /\bfunction\s+\w+\s*\(/.test(trimmed)
  ) {
    // Differentiate TypeScript from JavaScript
    if (
      trimmed.includes(": string") ||
      trimmed.includes(": number") ||
      trimmed.includes(": boolean") ||
      trimmed.includes("interface ") ||
      trimmed.includes("type ") ||
      /<[A-Z]\w*>/.test(trimmed)
    ) {
      return "typescript";
    }
    return "javascript";
  }

  // Python: def, class, import patterns
  if (
    /^(def|class|import|from|async def|if __name__)\s/.test(trimmed) ||
    /^\s*@\w+/.test(trimmed) ||
    trimmed.includes("print(") ||
    trimmed.includes("self.")
  ) {
    return "python";
  }

  // CSS: selector patterns or properties
  if (
    /^[.#@]?\w+\s*\{/.test(trimmed) ||
    /^\s*(background|color|margin|padding|display|position|font|border|width|height):/.test(
      trimmed
    ) ||
    trimmed.startsWith("@tailwind") ||
    trimmed.startsWith("@import") ||
    trimmed.startsWith("@apply")
  ) {
    return "css";
  }

  // HTML/JSX: tag patterns
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    /^<[a-zA-Z][\w-]*(\s|>)/.test(trimmed)
  ) {
    // JSX if it contains curly braces in tag context
    if (/{[^}]+}/.test(trimmed) && /<[A-Z]/.test(trimmed)) {
      return "tsx";
    }
    return "html";
  }

  // YAML: key-value with colon at start of lines
  if (/^[\w-]+:\s/.test(trimmed) || trimmed.startsWith("---")) {
    return "yaml";
  }

  // Markdown: headers, lists, links
  if (
    /^#{1,6}\s/.test(trimmed) ||
    /^\s*[-*+]\s/.test(trimmed) ||
    /^\s*\d+\.\s/.test(trimmed) ||
    /\[.+\]\(.+\)/.test(trimmed)
  ) {
    return "markdown";
  }

  // SQL: common keywords
  if (
    /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|JOIN)\s/i.test(
      trimmed
    )
  ) {
    return "sql";
  }

  // Diff: starts with +++ or --- or diff
  if (
    trimmed.startsWith("diff ") ||
    trimmed.startsWith("+++") ||
    trimmed.startsWith("---") ||
    /^@@\s/.test(trimmed)
  ) {
    return "diff";
  }

  // Default to plain text
  return "text";
}

/**
 * Format a file path for display, optionally truncating long paths.
 */
export function formatFilePath(path: string, maxLength = 60): string {
  if (!path || path.length <= maxLength) {
    return path;
  }

  const parts = path.split("/");
  if (parts.length <= 3) {
    return path;
  }

  // Show first part, ellipsis, and last two parts
  return `${parts[0]}/.../${parts.slice(-2).join("/")}`;
}

/**
 * Format a byte count as a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Estimate token count for a string (rough approximation: ~4 chars per token).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.round(text.length / 4);
}

/**
 * Format a large number with K/M suffixes.
 */
export function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}
