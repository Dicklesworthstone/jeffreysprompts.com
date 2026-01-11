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

/**
 * Tokenize text into lowercase words, removing stopwords and punctuation.
 * Uses NFC normalization to ensure consistent matching for Unicode characters
 * (e.g., "café" composed vs "cafe\u0301" decomposed are treated identically).
 */
export function tokenize(text: string): string[] {
  return text
    .normalize("NFC") // Normalize Unicode to composed form for consistent matching
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ") // Remove punctuation except hyphens
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

/**
 * Tokenize without removing stopwords (for exact matching).
 * Uses NFC normalization for consistent Unicode handling.
 */
export function tokenizeRaw(text: string): string[] {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
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
