import { type Prompt } from "@jeffreysprompts/core/prompts";
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
  version?: string;
  created?: string;
  created_at?: string;
  saved_at?: string;
  updated_at?: string;
  whenToUse?: string[];
  when_to_use?: string[];
  tips?: string[];
  examples?: string[];
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
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    author: payload.author ?? "",
    version: payload.version ?? "1.0.0",
    created: rawCreated.split("T")[0],
    whenToUse: payload.whenToUse ?? payload.when_to_use,
    tips: payload.tips,
    examples: payload.examples,
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
  const registry = options.registry ?? await loadRegistry();
  const localPrompt = registry.prompts.find((prompt) => prompt.id === promptId);

  if (localPrompt) {
    return { prompt: localPrompt, source: "local" };
  }

  const offlinePrompt = getOfflinePromptAsPrompt(promptId);
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
