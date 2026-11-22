import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { tagsSuggestCommand, dedupeScanCommand } from "../../src/commands/utilities";
import { saveCredentials } from "../../src/lib/credentials";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalWrite = process.stdout.write;
const originalError = console.error;
const originalExit = process.exit;
const originalEnv = {
  HOME: process.env.HOME,
  XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
  JFP_TOKEN: process.env.JFP_TOKEN,
};

function parseJson<T = Record<string, unknown>>(payload: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON output: ${message}`);
  }
}

async function expectExit(promise: Promise<void>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof Error && error.message === "process.exit") {
      return;
    }
    throw error;
  }
  throw new Error("Expected process.exit");
}

beforeAll(async () => {
  const testHome = join(tmpdir(), `jfp-test-home-${randomUUID()}`);
  process.env.HOME = testHome;
  process.env.XDG_CONFIG_HOME = join(testHome, ".config");
  if (process.env.JFP_TOKEN) {
    delete process.env.JFP_TOKEN;
  }

  await saveCredentials(
    {
      access_token: "test-token",
      refresh_token: "test-refresh",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      email: "test@example.com",
      tier: "premium",
      user_id: "user-123",
    },
    process.env
  );
});

afterAll(() => {
  process.env.HOME = originalEnv.HOME;
  if (originalEnv.XDG_CONFIG_HOME === undefined) {
    delete process.env.XDG_CONFIG_HOME;
  } else {
    process.env.XDG_CONFIG_HOME = originalEnv.XDG_CONFIG_HOME;
  }
  if (originalEnv.JFP_TOKEN === undefined) {
    delete process.env.JFP_TOKEN;
  } else {
    process.env.JFP_TOKEN = originalEnv.JFP_TOKEN;
  }
});

beforeEach(() => {
  output = [];
  errors = [];
  exitCode = undefined;
  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
  process.stdout.write = ((
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void
  ) => {
    output.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString());
    const done = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    done?.(null);
    return true;
  }) as typeof process.stdout.write;
  console.error = (...args: unknown[]) => {
    errors.push(args.join(" "));
  };
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error("process.exit");
  }) as never;
});

afterEach(() => {
  console.log = originalLog;
  process.stdout.write = originalWrite;
  console.error = originalError;
  process.exit = originalExit;
});

describe("metadata assistant commands", () => {
  it("outputs tag suggestions JSON for a prompt", async () => {
    await tagsSuggestCommand("idea-wizard", { json: true, limit: "3", similar: "2", threshold: "0.2" });
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.promptId).toBe("idea-wizard");
    const suggestions = payload.suggestions as Record<string, unknown>;
    expect(Array.isArray(suggestions.tags)).toBe(true);
    expect(Array.isArray(suggestions.categories)).toBe(true);
    expect(Array.isArray(suggestions.descriptions)).toBe(true);
    expect(Array.isArray(payload.similar)).toBe(true);
    if (Array.isArray(suggestions.tags) && suggestions.tags.length > 0) {
      const tag = suggestions.tags[0] as Record<string, unknown>;
      expect(typeof tag.tag).toBe("string");
      expect(typeof tag.score).toBe("number");
      expect(Array.isArray(tag.reasons)).toBe(true);
    }
    if (Array.isArray(suggestions.categories) && suggestions.categories.length > 0) {
      const category = suggestions.categories[0] as Record<string, unknown>;
      expect(typeof category.category).toBe("string");
      expect(typeof category.score).toBe("number");
      expect(Array.isArray(category.reasons)).toBe(true);
    }
    if (Array.isArray(suggestions.descriptions) && suggestions.descriptions.length > 0) {
      const description = suggestions.descriptions[0] as Record<string, unknown>;
      expect(typeof description.description).toBe("string");
      expect(typeof description.reason).toBe("string");
    }
    if (Array.isArray(payload.similar) && payload.similar.length > 0) {
      const similar = payload.similar[0] as Record<string, unknown>;
      expect(similar.id).toBeDefined();
      expect(typeof similar.title).toBe("string");
      expect(typeof similar.score).toBe("number");
      expect(Array.isArray(similar.sharedTags)).toBe(true);
      expect(Array.isArray(similar.sharedTokens)).toBe(true);
    }
  });

  it("outputs duplicate scan JSON array", async () => {
    await dedupeScanCommand({ json: true, minScore: "0.95", limit: "5" });
    const payload = parseJson<unknown>(output.join(""));
    expect(Array.isArray(payload)).toBe(true);
    if (Array.isArray(payload) && payload.length > 0) {
      const candidate = payload[0] as Record<string, unknown>;
      const promptA = candidate.promptA as Record<string, unknown>;
      const promptB = candidate.promptB as Record<string, unknown>;
      expect(typeof promptA.id).toBe("string");
      expect(typeof promptA.title).toBe("string");
      expect(typeof promptB.id).toBe("string");
      expect(typeof promptB.title).toBe("string");
      expect(typeof candidate.score).toBe("number");
      expect(Array.isArray(candidate.reasons)).toBe(true);
      expect(Array.isArray(candidate.sharedTags)).toBe(true);
      expect(Array.isArray(candidate.sharedTokens)).toBe(true);
    }
  });

  it("returns error JSON and exits for invalid min score", async () => {
    await expectExit(dedupeScanCommand({ json: true, minScore: "2" }));
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.code).toBe("invalid_min_score");
    expect(exitCode).toBe(1);
  });

  it("returns error JSON and exits for invalid scan limit", async () => {
    await expectExit(dedupeScanCommand({ json: true, limit: "0" }));
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.code).toBe("invalid_limit");
    expect(exitCode).toBe(1);
  });

  it("returns error JSON and exits for invalid threshold", async () => {
    await expectExit(tagsSuggestCommand("idea-wizard", { json: true, threshold: "2" }));
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.code).toBe("invalid_threshold");
    expect(exitCode).toBe(1);
  });

  it("returns error JSON and exits for missing prompt id", async () => {
    await expectExit(tagsSuggestCommand(undefined, { json: true }));
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.code).toBe("missing_prompt");
    expect(exitCode).toBe(1);
  });

  it("returns error JSON and exits for invalid tag limit", async () => {
    await expectExit(tagsSuggestCommand("idea-wizard", { json: true, limit: "0" }));
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.code).toBe("invalid_limit");
    expect(exitCode).toBe(1);
  });

  it("returns error JSON and exits for invalid similar limit", async () => {
    await expectExit(tagsSuggestCommand("idea-wizard", { json: true, similar: "0" }));
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.code).toBe("invalid_similar");
    expect(exitCode).toBe(1);
  });

  it("returns error JSON and exits for unknown prompt id", async () => {
    await expectExit(tagsSuggestCommand("not-a-prompt", { json: true }));
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.code).toBe("prompt_not_found");
    expect(exitCode).toBe(1);
  });

  it("returns error JSON and exits when not authenticated", async () => {
    const prevHome = process.env.HOME;
    const prevXdg = process.env.XDG_CONFIG_HOME;
    const prevToken = process.env.JFP_TOKEN;
    const tempHome = join(tmpdir(), `jfp-no-creds-${randomUUID()}`);

    try {
      process.env.HOME = tempHome;
      process.env.XDG_CONFIG_HOME = join(tempHome, ".config");
      if (process.env.JFP_TOKEN) {
        delete process.env.JFP_TOKEN;
      }

      await expectExit(tagsSuggestCommand("idea-wizard", { json: true }));
      const payload = parseJson<Record<string, unknown>>(output.join(""));
      expect(payload.code).toBe("not_authenticated");
      expect(exitCode).toBe(1);
    } finally {
      process.env.HOME = prevHome;
      if (prevXdg === undefined) {
        delete process.env.XDG_CONFIG_HOME;
      } else {
        process.env.XDG_CONFIG_HOME = prevXdg;
      }
      if (prevToken === undefined) {
        delete process.env.JFP_TOKEN;
      } else {
        process.env.JFP_TOKEN = prevToken;
      }
    }
  });

  it("returns error JSON and exits for free-tier credentials", async () => {
    await saveCredentials(
      {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        email: "free@example.com",
        tier: "free",
        user_id: "user-free",
      },
      process.env
    );

    try {
      await expectExit(dedupeScanCommand({ json: true }));
      const payload = parseJson<Record<string, unknown>>(output.join(""));
      expect(payload.code).toBe("premium_required");
      expect(exitCode).toBe(1);
    } finally {
      await saveCredentials(
        {
          access_token: "test-token",
          refresh_token: "test-refresh",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          email: "test@example.com",
          tier: "premium",
          user_id: "user-123",
        },
        process.env
      );
    }
  });
});
