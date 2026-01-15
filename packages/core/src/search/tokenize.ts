// packages/core/src/search/tokenize.ts
// Tokenizer and stopwords for BM25 search

// Common stopwords to exclude from search
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
  "be", "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "must", "shall", "can", "need", "dare", "ought",
  "used", "it", "its", "this", "that", "these", "those", "i", "you", "he",
  "she", "we", "they", "what", "which", "who", "whom", "whose", "where",
  "when", "why", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "just", "also", "now", "here",
]);

// Single-letter words to preserve (e.g., programming languages)
const ALLOWLIST = new Set(["c", "r", "v", "x", "k"]);

/**
 * Tokenize text into lowercase words, removing stopwords and punctuation.
 * Uses NFC normalization to ensure consistent matching for Unicode characters.
 * Preserves Unicode letters/numbers using \p{L}\p{N}.
 */
export function tokenize(text: string): string[] {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#]/gu, " ") // Remove everything except letters, numbers, whitespace, +, #
    .split(/\s+/)
    .filter((word) => (word.length > 1 || ALLOWLIST.has(word)) && !STOPWORDS.has(word));
}

/**
 * Tokenize without removing stopwords (for exact matching).
 * Uses NFC normalization for consistent Unicode handling.
 */
export function tokenizeRaw(text: string): string[] {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#]/gu, " ") // Remove everything except letters, numbers, whitespace, +, #
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * Create n-grams from tokens for fuzzy matching
 */
export function ngrams(tokens: string[], n: number = 2): string[] {
  const result: string[] = [];
  for (const token of tokens) {
    if (token.length <= n) {
      result.push(token);
    } else {
      for (let i = 0; i <= token.length - n; i++) {
        result.push(token.slice(i, i + n));
      }
    }
  }
  return result;
}

export { STOPWORDS };
