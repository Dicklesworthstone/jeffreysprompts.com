/**
 * Pure helper functions for recommendation preferences.
 *
 * Used by the /settings/recommendations page and testable independently.
 */

/** Convert a kebab-case category value to a Title Case label. */
export function formatCategoryLabel(value: string): string {
  return value
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

/** Deduplicate and sort an array of strings. */
export function sortUnique(values: string[] | undefined): string[] {
  if (!values?.length) return [];
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

/** Parse a comma-separated tag input into a sorted, deduplicated, lowercased array. */
export function parseTagCsv(value: string): string[] {
  return sortUnique(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.toLowerCase())
  );
}

/** Format an array of strings as a comma-separated string. */
export function formatCsv(values: string[] | undefined): string {
  return (values ?? []).join(", ");
}
