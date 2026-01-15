// packages/core/src/search/synonyms.ts
// Synonym expansion for improved search recall

/**
 * Map of terms to their synonyms for query expansion
 */
export const SYNONYMS: Record<string, string[]> = {
  // Common abbreviations and alternatives
  fix: ["repair", "resolve", "debug", "patch", "correct"],
  docs: ["documentation", "readme", "doc", "guide"],
  perf: ["performance", "speed", "optimize", "fast"],
  cli: ["command-line", "terminal", "shell", "console"],
  api: ["interface", "endpoint", "service"],

  // Concept synonyms
  brainstorm: ["ideate", "generate", "create", "think"],
  improve: ["enhance", "optimize", "upgrade", "better"],
  refactor: ["restructure", "clean", "reorganize", "rewrite"],
  test: ["testing", "spec", "unit", "integration"],
  debug: ["troubleshoot", "diagnose", "fix", "investigate"],

  // Action synonyms
  add: ["create", "insert", "include", "implement"],
  remove: ["delete", "drop", "eliminate", "clear"],
  update: ["modify", "change", "edit", "revise"],

  // Domain terms
  agent: ["bot", "assistant", "ai", "llm"],
  prompt: ["instruction", "query", "request"],
  code: ["programming", "software", "implementation"],
};

/**
 * Get synonyms for a single term
 */
export function getSynonyms(term: string): string[] {
  return SYNONYMS[term.toLowerCase()] ?? [];
}

// Precompute reverse mapping for O(1) lookups
const REVERSE_SYNONYMS: Record<string, string[]> = {};
for (const [key, syns] of Object.entries(SYNONYMS)) {
  for (const syn of syns) {
    if (!REVERSE_SYNONYMS[syn]) {
      REVERSE_SYNONYMS[syn] = [];
    }
    REVERSE_SYNONYMS[syn].push(key);
  }
}

/**
 * Expand a query with synonyms
 */
export function expandQuery(tokens: string[]): string[] {
  const expanded = new Set(tokens);

  for (const token of tokens) {
    // Add direct synonyms
    const synonyms = SYNONYMS[token];
    if (synonyms) {
      for (const syn of synonyms) {
        expanded.add(syn);
      }
    }

    // Add reverse synonyms (terms that have this token as a synonym)
    const reverseSyns = REVERSE_SYNONYMS[token];
    if (reverseSyns) {
      for (const syn of reverseSyns) {
        expanded.add(syn);
      }
    }
  }

  return [...expanded];
}
