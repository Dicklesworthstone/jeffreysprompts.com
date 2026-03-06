import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { showCommand } from "../../src/commands/show";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  output = [];
  errors = [];
  exitCode = undefined;
  console.log = (...args: unknown[]) => {
    output.push(args.join(" "));
  };
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
  console.error = originalError;
  process.exit = originalExit;
  globalThis.fetch = originalFetch;
});

describe("showCommand", () => {
  it("outputs JSON for a valid prompt", async () => {
    await showCommand("idea-wizard", { json: true });
    const payload = JSON.parse(output.join(""));
    expect(payload.id).toBe("idea-wizard");
    expect(payload.title).toBe("The Idea Wizard");
  });

  it("outputs raw content when --raw is set", async () => {
    await showCommand("idea-wizard", { raw: true });
    const text = output.join("");
    expect(text).toContain("Come up with your very best ideas");
  });

  it("returns not_found JSON and exits for missing prompt", async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("/api/prompts")) {
        return new Response(
          JSON.stringify({
            prompts: [],
            bundles: [],
            workflows: [],
            version: "1.0.0",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (url.includes("/cli/prompts/missing-prompt")) {
        throw new Error("showCommand should not query the premium API when unauthenticated");
      }

      return new Response("Not found", { status: 404 });
    };

    try {
      await showCommand("missing-prompt", { json: true });
    } catch (e) {
      if ((e as Error).message !== "process.exit") throw e;
    }
    
    expect(exitCode).toBe(1);
    const payload = JSON.parse(output.join(""));
    expect(payload.error).toBe("not_found");
  });

  it("falls back to the API for personal prompts outside the local registry", async () => {
    const originalToken = process.env.JFP_TOKEN;
    process.env.JFP_TOKEN = "env-token-xyz";
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.includes("/api/prompts")) {
        return new Response(
          JSON.stringify({
            prompts: [],
            bundles: [],
            workflows: [],
            version: "1.0.0",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (url.includes("/cli/prompts/personal-only")) {
        return new Response(
          JSON.stringify({
            id: "personal-only",
            title: "Personal Prompt",
            description: "Only available from the premium API",
            content: "Personal prompt body",
            category: "workflow",
            tags: ["premium"],
            author: "Jeffrey Emanuel",
            version: "1.0.0",
            created: "2026-01-01",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response("Not found", { status: 404 });
    };

    try {
      await showCommand("personal-only", { json: true });
    } finally {
      if (originalToken === undefined) {
        delete process.env.JFP_TOKEN;
      } else {
        process.env.JFP_TOKEN = originalToken;
      }
    }
    const payload = JSON.parse(output.join(""));

    expect(payload.id).toBe("personal-only");
    expect(payload.title).toBe("Personal Prompt");
    expect(payload.content).toBe("Personal prompt body");
  });
});
