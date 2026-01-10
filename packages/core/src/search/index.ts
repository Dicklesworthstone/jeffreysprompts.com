/**
 * Search module
 * BM25 search engine, tokenization, synonyms, and optional semantic search
 */

// Tokenization
export { tokenize, tokenizeRaw, ngrams, STOPWORDS } from "./tokenize";

// Synonyms
export { SYNONYMS, expandQuery, getSynonyms } from "./synonyms";

// BM25 search
export { buildIndex, search as bm25Search } from "./bm25";
export type { BM25Document, BM25Index } from "./bm25";

// Hash embedder fallback
export { hashEmbed } from "./hash-embedder";

// Composite search engine
export { searchPrompts, quickSearch, resetIndex } from "./engine";
export type { SearchResult, SearchOptions } from "./engine";

// Semantic search (optional reranking)
export {
  semanticRerank,
  semanticRerankHash,
  hashEmbedding,
  cosineSimilarity,
  warmupModel,
  isModelAvailable,
  getModelError,
  resetModelState,
} from "./semantic";
export type { RankedResult, SemanticOptions } from "./semantic";
