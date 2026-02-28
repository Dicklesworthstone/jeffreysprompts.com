import type { Prompt } from "./prompts/types";

export type CurrencyCode = "USD";

export interface ModelPricing {
  inputPer1k: number;
  outputPer1k: number;
  currency: CurrencyCode;
}

export type PricingTable = Record<string, ModelPricing>;

export type TokenEstimateSource = "declared" | "heuristic";

export interface TokenEstimate {
  tokens: number;
  source: TokenEstimateSource;
}

export interface CostEstimate {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: CurrencyCode;
  unit: "per_1k_tokens";
}

export const PRICE_UNIT = 1000;
export const DEFAULT_MODEL = "gpt-4o-mini";

// Prices are per 1k tokens. Update as vendor pricing changes.
export const DEFAULT_PRICING_TABLE: PricingTable = {
  // OpenAI
  "gpt-4o": { inputPer1k: 0.0025, outputPer1k: 0.010, currency: "USD" },
  "gpt-4o-mini": { inputPer1k: 0.00015, outputPer1k: 0.0006, currency: "USD" },
  "gpt-4-turbo": { inputPer1k: 0.01, outputPer1k: 0.03, currency: "USD" },
  "gpt-3.5-turbo": { inputPer1k: 0.0005, outputPer1k: 0.0015, currency: "USD" },
  
  // Anthropic
  "claude-3-5-sonnet": { inputPer1k: 0.003, outputPer1k: 0.015, currency: "USD" },
  "claude-3-5-haiku": { inputPer1k: 0.001, outputPer1k: 0.005, currency: "USD" },
  "claude-3-opus": { inputPer1k: 0.015, outputPer1k: 0.075, currency: "USD" },
  
  // Google
  "gemini-1.5-pro": { inputPer1k: 0.00125, outputPer1k: 0.005, currency: "USD" },
  "gemini-1.5-flash": { inputPer1k: 0.000075, outputPer1k: 0.0003, currency: "USD" },
  
  // Open Source / Other (via providers like Together/Fireworks)
  "meta-llama-3.1-70b": { inputPer1k: 0.00088, outputPer1k: 0.00088, currency: "USD" },
  "meta-llama-3.1-8b": { inputPer1k: 0.00018, outputPer1k: 0.00018, currency: "USD" },
};

function roundCurrency(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function listPricedModels(table: PricingTable = DEFAULT_PRICING_TABLE): string[] {
  return Object.keys(table).sort();
}

export function estimateTokensFromText(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function estimatePromptTokens(prompt: Prompt): TokenEstimate | null {
  if (typeof prompt.estimatedTokens === "number" && prompt.estimatedTokens > 0) {
    return { tokens: prompt.estimatedTokens, source: "declared" };
  }

  const heuristic = estimateTokensFromText(prompt.content ?? "");
  if (heuristic <= 0) return null;
  return { tokens: heuristic, source: "heuristic" };
}

export function estimateCost(input: {
  model: string;
  inputTokens: number;
  outputTokens?: number;
  pricingTable?: PricingTable;
}): CostEstimate | null {
  const pricing = (input.pricingTable ?? DEFAULT_PRICING_TABLE)[input.model];
  if (!pricing) return null;

  const inputTokens = Math.max(0, input.inputTokens);
  const outputTokens = Math.max(0, input.outputTokens ?? 0);
  const inputCost = roundCurrency((inputTokens / PRICE_UNIT) * pricing.inputPer1k);
  const outputCost = roundCurrency((outputTokens / PRICE_UNIT) * pricing.outputPer1k);
  const totalCost = roundCurrency(inputCost + outputCost);

  return {
    model: input.model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost,
    outputCost,
    totalCost,
    currency: pricing.currency,
    unit: "per_1k_tokens",
  };
}
