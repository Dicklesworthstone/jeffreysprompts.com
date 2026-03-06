import {
  PromptChangeSchema,
  PromptDifficultySchema,
  PromptVariableSchema,
  type Prompt,
  type PromptChange,
  type PromptVariable,
} from "@jeffreysprompts/core/prompts";
import type { LoadedRegistry } from "./registry-loader";
import { ApiClient, isAuthError, isNotFoundError } from "./api-client";
import { loadCredentials } from "./credentials";
import { getOfflinePromptAsPrompt, normalizePromptCategory } from "./offline";
import { loadRegistry } from "./registry-loader";

type PromptSource = "local" | "offline" | "api";
type PromptResolutionError =
  | "not_found"
  | "auth_expired"
  | "premium_required"
  | "api_error"
  | "invalid_response"
  | "prompt_content_missing";

interface ResolvePromptOptions {
  env?: NodeJS.ProcessEnv;
  registry?: LoadedRegistry;
}

interface ResolvedPrompt {
  prompt?: Prompt;
  source?: PromptSource;
  error?: PromptResolutionError;
  message?: string;
}

interface PromptPayload {
  id: string;
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
  author?: string;
  twitter?: string;
  version?: string;
  featured?: boolean;
  difficulty?: string;
  estimatedTokens?: number;
  estimated_tokens?: number;
  created?: string;
  created_at?: string;
  saved_at?: string;
  updatedAt?: string;
  updated_at?: string;
  variables?: unknown;
  whenToUse?: string[];
  when_to_use?: string[];
  tips?: string[];
  examples?: string[];
  changelog?: unknown;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? strings : [];
}

function readVariables(value: unknown): PromptVariable[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const variables: PromptVariable[] = [];
  for (const item of value) {
    const result = PromptVariableSchema.safeParse(item);
    if (result.success) {
      variables.push(result.data);
    }
  }

  return variables.length > 0 ? variables : undefined;
}

function readChangelog(value: unknown): PromptChange[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const changelog: PromptChange[] = [];
  for (const item of value) {
    const result = PromptChangeSchema.safeParse(item);
    if (result.success) {
      changelog.push(result.data);
    }
  }

  return changelog.length > 0 ? changelog : undefined;
}

function readDifficulty(value: unknown): Prompt["difficulty"] | undefined {
  const result = PromptDifficultySchema.safeParse(value);
  return result.success ? result.data : undefined;
}

function toIsoDate(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.split("T")[0] : undefined;
}

function extractPromptPayload(payload: unknown): PromptPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (typeof data.prompt === "object" && data.prompt !== null) {
    return data.prompt as PromptPayload;
  }
  if (typeof data.id === "string") {
    return data as unknown as PromptPayload;
  }
  return null;
}

function buildPromptFromPayload(payload: PromptPayload): Prompt | null {
  if (!payload.content || typeof payload.content !== "string") return null;

  const rawCreated =
    payload.created ||
    payload.created_at ||
    payload.saved_at ||
    payload.updated_at ||
    new Date().toISOString();

  return {
    id: payload.id,
    title: payload.title ?? payload.id,
    description: payload.description ?? "",
    content: payload.content,
    category: normalizePromptCategory(payload.category),
    tags: readStringArray(payload.tags) ?? [],
    author: payload.author ?? "",
    twitter: payload.twitter,
    version: payload.version ?? "1.0.0",
    created: rawCreated.split("T")[0],
    updatedAt: toIsoDate(payload.updatedAt ?? payload.updated_at),
    featured: typeof payload.featured === "boolean" ? payload.featured : undefined,
    difficulty: readDifficulty(payload.difficulty),
    estimatedTokens:
      typeof payload.estimatedTokens === "number"
        ? payload.estimatedTokens
        : typeof payload.estimated_tokens === "number"
          ? payload.estimated_tokens
          : undefined,
    variables: readVariables(payload.variables),
    whenToUse: readStringArray(payload.whenToUse) ?? readStringArray(payload.when_to_use),
    tips: readStringArray(payload.tips),
    examples: readStringArray(payload.examples),
    changelog: readChangelog(payload.changelog),
  };
}

function isPremiumError(response: { status: number; error?: string }): boolean {
  return response.status === 403 && (response.error?.toLowerCase().includes("premium") ?? false);
}

export async function resolvePromptById(
  promptId: string,
  options: ResolvePromptOptions = {}
): Promise<ResolvedPrompt> {
  const env = options.env ?? process.env;
  const registry = options.registry ?? await loadRegistry(env);
  const localPrompt = registry.prompts.find((prompt) => prompt.id === promptId);

  if (localPrompt) {
    return { prompt: localPrompt, source: "local" };
  }

  const offlinePrompt = getOfflinePromptAsPrompt(promptId, env);
  if (offlinePrompt) {
    return { prompt: offlinePrompt, source: "offline" };
  }

  const hasAuthContext = Boolean(env.JFP_TOKEN) || Boolean(await loadCredentials(env));
  if (!hasAuthContext) {
    return {
      error: "not_found",
      message: `Prompt not found: ${promptId}`,
    };
  }

  const apiClient = new ApiClient({ env });
  const response = await apiClient.get<unknown>(`/cli/prompts/${encodeURIComponent(promptId)}`);

  if (!response.ok) {
    if (isAuthError(response)) {
      return {
        error: "auth_expired",
        message: "Session expired. Please run 'jfp login' again.",
      };
    }

    if (isNotFoundError(response)) {
      return {
        error: "not_found",
        message: `Prompt not found: ${promptId}`,
      };
    }

    if (isPremiumError(response)) {
      return {
        error: "premium_required",
        message: "This prompt requires a premium subscription.",
      };
    }

    return {
      error: "api_error",
      message: response.error || "Failed to load prompt",
    };
  }

  const payload = extractPromptPayload(response.data);
  if (!payload) {
    return {
      error: "invalid_response",
      message: "Prompt response payload is invalid.",
    };
  }

  const prompt = buildPromptFromPayload(payload);
  if (!prompt) {
    return {
      error: "prompt_content_missing",
      message: "Prompt content is unavailable.",
    };
  }

  return { prompt, source: "api" };
}
