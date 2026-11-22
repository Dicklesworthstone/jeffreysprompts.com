import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { graphExportCommand } from "../../src/commands/graph";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalWrite = process.stdout.write;
const originalError = console.error;
const originalExit = process.exit;
const originalFetch = globalThis.fetch;
const originalEnv = {
  JFP_HOME: process.env.JFP_HOME,
  JFP_REGISTRY_URL: process.env.JFP_REGISTRY_URL,
  JFP_TOKEN: process.env.JFP_TOKEN,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseJson<T = Record<string, unknown>>(payload: string): T {
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON output: ${message}`);
  }
}

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
  globalThis.fetch = originalFetch;
  if (originalEnv.JFP_HOME === undefined) {
    delete process.env.JFP_HOME;
  } else {
    process.env.JFP_HOME = originalEnv.JFP_HOME;
  }
  if (originalEnv.JFP_REGISTRY_URL === undefined) {
    delete process.env.JFP_REGISTRY_URL;
  } else {
    process.env.JFP_REGISTRY_URL = originalEnv.JFP_REGISTRY_URL;
  }
  if (originalEnv.JFP_TOKEN === undefined) {
    delete process.env.JFP_TOKEN;
  } else {
    process.env.JFP_TOKEN = originalEnv.JFP_TOKEN;
  }
});

describe("graphExportCommand", () => {
  it("outputs JSON graph data", async () => {
    await graphExportCommand({ json: true });
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload).toHaveProperty("nodes");
    expect(payload).toHaveProperty("edges");
    expect(payload.totals).toHaveProperty("nodes");
  });

  it("outputs DOT graph when format=dot", async () => {
    await graphExportCommand({ json: true, format: "dot" });
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.format).toBe("dot");
    expect(payload.graph).toContain("digraph");
  });

  it("outputs Mermaid graph when format=mermaid", async () => {
    await graphExportCommand({ json: true, format: "mermaid" });
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.format).toBe("mermaid");
    expect(payload.graph).toContain("graph TD");
  });

  it("dedupes Mermaid node ids when prompt ids collide", async () => {
    const registryPayload = {
      version: "test",
      prompts: [
        {
          id: "a-b",
          title: "A-B",
          description: "Prompt for collision test A-B",
          content: "Prompt A-B content with enough characters for schema validation.",
          category: "ideation",
          tags: ["alpha"],
          author: "Test",
          version: "1.0.0",
          created: "2025-01-01",
          featured: false,
        },
      ],
      bundles: [],
      workflows: [],
    };
    const collectionList = [
      {
        name: "favorites",
        description: "Saved prompts",
        promptCount: 1,
        createdAt: "2025-01-01",
        updatedAt: "2025-01-02",
      },
    ];
    const collectionDetail = {
      ...collectionList[0],
      prompts: [
        {
          id: "a_b",
          title: "A_B",
          description: "Collection-only prompt id variant",
          category: "ideation",
        },
      ],
    };

    process.env.JFP_HOME = mkdtempSync(join(tmpdir(), "jfp-graph-"));
    process.env.JFP_REGISTRY_URL = "https://example.test/registry";
    process.env.JFP_TOKEN = "test-token";
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === process.env.JFP_REGISTRY_URL) {
        return Promise.resolve(jsonResponse(registryPayload));
      }
      if (url.endsWith("/api/cli/collections")) {
        return Promise.resolve(jsonResponse(collectionList));
      }
      if (url.endsWith("/api/cli/collections/favorites")) {
        return Promise.resolve(jsonResponse(collectionDetail));
      }
      return Promise.resolve(jsonResponse({ error: "Not found" }, 404));
    });

    await graphExportCommand({ json: true, format: "mermaid", includeCollections: true });
    const payload = parseJson<{ graph?: string }>(output.join(""));
    const graph = String(payload.graph ?? "");
    const nodeIds = new Set<string>();
    for (const line of graph.split("\n")) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\[\"/);
      if (match) {
        nodeIds.add(match[1]);
      }
    }
    expect(nodeIds.has("p_a_b")).toBe(true);
    expect(nodeIds.has("p_a_b_2")).toBe(true);
  });

  it("includes category and tag nodes when includeMeta is true", async () => {
    const registryPayload = {
      version: "test",
      prompts: [
        {
          id: "idea-wizard",
          title: "Idea Wizard",
          description: "Idea generation helper prompt",
          content: "Prompt content that satisfies the minimum schema length requirement.",
          category: "ideation",
          tags: ["automation", "brainstorm"],
          author: "Test",
          version: "1.0.0",
          created: "2025-01-01",
          featured: false,
        },
      ],
      bundles: [],
      workflows: [],
    };

    process.env.JFP_HOME = mkdtempSync(join(tmpdir(), "jfp-graph-"));
    process.env.JFP_REGISTRY_URL = "https://example.test/registry";
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === process.env.JFP_REGISTRY_URL) {
        return Promise.resolve(jsonResponse(registryPayload));
      }
      return Promise.resolve(jsonResponse({ error: "Not found" }, 404));
    });

    await graphExportCommand({ json: true, includeMeta: true });
    const payload = parseJson<{
      nodes: Array<{ id: string; type: string }>;
      edges: Array<{ from: string; to: string; type: string }>;
    }>(output.join(""));
    expect(payload.nodes.some((node) => node.type === "category" && node.id === "ideation")).toBe(true);
    expect(payload.nodes.some((node) => node.type === "tag" && node.id === "automation")).toBe(true);
    expect(
      payload.edges.some(
        (edge) => edge.type === "prompt->category" && edge.from === "idea-wizard" && edge.to === "ideation"
      )
    ).toBe(true);
    expect(
      payload.edges.some(
        (edge) => edge.type === "prompt->tag" && edge.from === "idea-wizard" && edge.to === "automation"
      )
    ).toBe(true);
  });

  it("includes collection nodes when includeCollections is true", async () => {
    const registryPayload = {
      version: "test",
      prompts: [
        {
          id: "idea-wizard",
          title: "Idea Wizard",
          description: "Idea generation helper prompt",
          content: "Prompt content that satisfies the minimum schema length requirement.",
          category: "ideation",
          tags: ["automation"],
          author: "Test",
          version: "1.0.0",
          created: "2025-01-01",
          featured: false,
        },
      ],
      bundles: [],
      workflows: [],
    };

    const collectionList = [
      {
        name: "favorites",
        description: "Saved prompts",
        promptCount: 1,
        createdAt: "2025-01-01",
        updatedAt: "2025-01-02",
      },
    ];

    const collectionDetail = {
      ...collectionList[0],
      prompts: [
        {
          id: "idea-wizard",
          title: "Idea Wizard",
          description: "",
          category: "ideation",
        },
      ],
    };

    process.env.JFP_HOME = mkdtempSync(join(tmpdir(), "jfp-graph-"));
    process.env.JFP_REGISTRY_URL = "https://example.test/registry";
    process.env.JFP_TOKEN = "test-token";
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === process.env.JFP_REGISTRY_URL) {
        return Promise.resolve(jsonResponse(registryPayload));
      }
      if (url.endsWith("/api/cli/collections")) {
        return Promise.resolve(jsonResponse(collectionList));
      }
      if (url.endsWith("/api/cli/collections/favorites")) {
        return Promise.resolve(jsonResponse(collectionDetail));
      }
      return Promise.resolve(jsonResponse({ error: "Not found" }, 404));
    });

    await graphExportCommand({ json: true, includeCollections: true });
    const payload = parseJson<{
      nodes: Array<{ id: string; type: string }>;
      edges: Array<{ from: string; to: string; type: string }>;
    }>(output.join(""));
    expect(payload.nodes.some((node) => node.type === "collection" && node.id === "favorites")).toBe(true);
    expect(
      payload.edges.some(
        (edge) =>
          edge.type === "prompt->collection" && edge.from === "idea-wizard" && edge.to === "favorites"
      )
    ).toBe(true);
  });

  it("returns error payload and exits for invalid format", async () => {
    await expect(graphExportCommand({ json: true, format: "csv" })).rejects.toThrow();
    const payload = parseJson<Record<string, unknown>>(output.join(""));
    expect(payload.code).toBe("invalid_format");
    expect(exitCode).toBe(1);
  });
});
