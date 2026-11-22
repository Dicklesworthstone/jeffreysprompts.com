import chalk from "chalk";
import { createHash } from "crypto";
import { shouldOutputJson, writeJsonStdout, writeStdout } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";
import type { Bundle } from "@jeffreysprompts/core/prompts/bundles";
import type { Workflow } from "@jeffreysprompts/core/prompts/workflows";
import { apiClient, isAuthError, requiresPremium } from "../lib/api-client";
import { isLoggedIn } from "../lib/credentials";

interface GraphOptions {
  json?: boolean;
  format?: string;
  includeMeta?: boolean;
  includeCollections?: boolean;
}

type GraphNodeType = "prompt" | "bundle" | "workflow" | "category" | "tag" | "collection";
type GraphFormat = "json" | "dot" | "mermaid";

interface GraphNode {
  id: string;
  type: GraphNodeType;
  title?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: "prompt->bundle" | "prompt->workflow" | "prompt->category" | "prompt->tag" | "prompt->collection";
}

interface PromptSummary {
  id: string;
  title: string;
  category?: string;
  tags?: string[];
}

interface CollectionItem {
  name: string;
  description?: string;
  promptCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CollectionDetail extends CollectionItem {
  prompts: Array<{
    id: string;
    title?: string;
    category?: string;
  }>;
}

function writeJson(payload: Record<string, unknown>): Promise<void> {
  return writeJsonStdout(payload, true);
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): Promise<void> {
  return writeJson({ error: true, code, message, ...extra });
}

function normalizeFormat(format: string | undefined): GraphFormat | null {
  const normalized = (format ?? "json").toLowerCase();
  if (normalized === "json" || normalized === "dot" || normalized === "mermaid") {
    return normalized;
  }
  return null;
}

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function escapeDotLabel(value: string): string {
  return normalizeLabel(value).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
}

function escapeMermaidLabel(value: string): string {
  return normalizeLabel(value)
    .replace(/\"/g, "#quot;")
    .replace(/[\[\]\(\)\{\}]/g, "");
}

function buildNodeKey(type: GraphNodeType, id: string): string {
  return `${type}:${id}`;
}

function getNodeLabel(node: GraphNode): string {
  const title = node.title ?? node.id;
  if (node.type === "prompt") return `Prompt: ${title}`;
  if (node.type === "bundle") return `Bundle: ${title}`;
  if (node.type === "workflow") return `Workflow: ${title}`;
  if (node.type === "category") return `Category: ${title}`;
  if (node.type === "tag") return `Tag: ${title}`;
  return `Collection: ${title}`;
}

function toMermaidBaseId(node: GraphNode): string {
  // Mermaid node ids must be alphanumeric/underscore (no dashes, dots, spaces, etc.)
  // Keep them readable and stable; collisions are handled in buildMermaidGraph.
  const base = node.id.replace(/[^a-zA-Z0-9]/g, "_") || "node";
  const prefix =
    node.type === "prompt"
      ? "p"
      : node.type === "bundle"
        ? "b"
        : node.type === "workflow"
          ? "w"
          : node.type === "category"
            ? "c"
            : node.type === "tag"
              ? "t"
              : "l";
  return `${prefix}_${base}`;
}

function toMermaidFallbackId(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex").slice(0, 8);
  return `x_${hash}`;
}

function dedupeMermaidId(base: string, used: Set<string>): string {
  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${counter}`;
    counter += 1;
  }
  used.add(candidate);
  return candidate;
}

function edgeNodeKeys(edge: GraphEdge): { fromKey: string; toKey: string; label: string } {
  if (edge.type === "prompt->bundle") {
    return {
      fromKey: buildNodeKey("prompt", edge.from),
      toKey: buildNodeKey("bundle", edge.to),
      label: "bundle",
    };
  }
  if (edge.type === "prompt->workflow") {
    return {
      fromKey: buildNodeKey("prompt", edge.from),
      toKey: buildNodeKey("workflow", edge.to),
      label: "workflow",
    };
  }
  if (edge.type === "prompt->category") {
    return {
      fromKey: buildNodeKey("prompt", edge.from),
      toKey: buildNodeKey("category", edge.to),
      label: "category",
    };
  }
  if (edge.type === "prompt->tag") {
    return {
      fromKey: buildNodeKey("prompt", edge.from),
      toKey: buildNodeKey("tag", edge.to),
      label: "tag",
    };
  }
  return {
    fromKey: buildNodeKey("prompt", edge.from),
    toKey: buildNodeKey("collection", edge.to),
    label: "collection",
  };
}

function buildNodes(
  prompts: PromptSummary[],
  bundles: Bundle[],
  workflows: Workflow[],
  categories: Set<string>,
  tags: Set<string>,
  collections: CollectionItem[]
): GraphNode[] {
  const nodes = new Map<string, GraphNode>();
  const addNode = (node: GraphNode) => {
    nodes.set(buildNodeKey(node.type, node.id), node);
  };

  for (const prompt of prompts) {
    addNode({ id: prompt.id, type: "prompt", title: prompt.title });
  }

  for (const bundle of bundles) {
    addNode({ id: bundle.id, type: "bundle", title: bundle.title });
  }

  for (const workflow of workflows) {
    addNode({ id: workflow.id, type: "workflow", title: workflow.title });
  }

  for (const category of categories) {
    addNode({ id: category, type: "category", title: category });
  }

  for (const tag of tags) {
    addNode({ id: tag, type: "tag", title: tag });
  }

  for (const collection of collections) {
    addNode({ id: collection.name, type: "collection", title: collection.name });
  }

  return [...nodes.values()];
}

function addUniqueEdge(edges: Map<string, GraphEdge>, edge: GraphEdge): void {
  const key = `${edge.type}:${edge.from}->${edge.to}`;
  if (edges.has(key)) return;
  edges.set(key, edge);
}

function buildBundleEdges(
  bundles: Bundle[],
  promptIds: Set<string>,
  edges: Map<string, GraphEdge>
): void {
  for (const bundle of bundles) {
    for (const promptId of bundle.promptIds) {
      if (!promptIds.has(promptId)) continue;
      addUniqueEdge(edges, { from: promptId, to: bundle.id, type: "prompt->bundle" });
    }
  }
}

function buildWorkflowEdges(
  workflows: Workflow[],
  promptIds: Set<string>,
  edges: Map<string, GraphEdge>
): void {
  for (const workflow of workflows) {
    for (const step of workflow.steps) {
      if (!promptIds.has(step.promptId)) continue;
      addUniqueEdge(edges, { from: step.promptId, to: workflow.id, type: "prompt->workflow" });
    }
  }
}

async function loadCollectionsForGraph(
  addWarning: (message: string) => void
): Promise<{ items: CollectionItem[]; details: CollectionDetail[] }> {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    addWarning("Collections not included: not logged in. Run 'jfp login' to enable.");
    return { items: [], details: [] };
  }

  const listResponse = await apiClient.get<CollectionItem[]>("/cli/collections");
  if (!listResponse.ok) {
    if (isAuthError(listResponse)) {
      addWarning("Collections not included: session expired. Run 'jfp login' again.");
      return { items: [], details: [] };
    }
    if (requiresPremium(listResponse)) {
      addWarning("Collections not included: premium subscription required.");
      return { items: [], details: [] };
    }
    addWarning(`Collections not included: ${listResponse.error || "Failed to fetch collections"}.`);
    return { items: [], details: [] };
  }

  if (!Array.isArray(listResponse.data)) {
    addWarning("Collections not included: invalid response format.");
    return { items: [], details: [] };
  }

  const items = listResponse.data;
  const details: CollectionDetail[] = [];
  let authFailed = false;
  let premiumBlocked = false;

  for (const item of items) {
    if (!item?.name) continue;
    const detailResponse = await apiClient.get<CollectionDetail>(
      `/cli/collections/${encodeURIComponent(item.name)}`
    );

    if (!detailResponse.ok || !detailResponse.data) {
      if (isAuthError(detailResponse)) {
        authFailed = true;
        break;
      }
      if (requiresPremium(detailResponse)) {
        premiumBlocked = true;
        break;
      }
      addWarning(
        `Collection "${item.name}" skipped: ${detailResponse.error || "Failed to load details"}.`
      );
      continue;
    }

    details.push(detailResponse.data);
  }

  if (authFailed) {
    addWarning("Collections not included: session expired. Run 'jfp login' again.");
    return { items, details };
  }

  if (premiumBlocked) {
    addWarning("Collections not included: premium subscription required.");
    return { items, details };
  }

  return { items, details };
}

function buildDotGraph(nodes: GraphNode[], edges: GraphEdge[]): string {
  const lines: string[] = [];
  const nodeMap = new Map<string, string>();

  for (const node of nodes) {
    nodeMap.set(buildNodeKey(node.type, node.id), `${node.type}:${node.id}`);
  }

  lines.push("digraph PromptGraph {");
  lines.push("  rankdir=LR;");
  lines.push("  node [shape=box, style=rounded];");

  for (const node of nodes) {
    const id = nodeMap.get(buildNodeKey(node.type, node.id)) ?? `${node.type}:${node.id}`;
    lines.push(`  \"${id}\" [label=\"${escapeDotLabel(getNodeLabel(node))}\"];`);
  }

  for (const edge of edges) {
    const keys = edgeNodeKeys(edge);
    const fromId = nodeMap.get(keys.fromKey) ?? keys.fromKey;
    const toId = nodeMap.get(keys.toKey) ?? keys.toKey;
    lines.push(`  \"${fromId}\" -> \"${toId}\" [label=\"${keys.label}\"];`);
  }

  lines.push("}");
  return lines.join("\n");
}

function buildMermaidGraph(nodes: GraphNode[], edges: GraphEdge[]): string {
  const lines: string[] = [];
  const nodeMap = new Map<string, string>();
  const usedIds = new Set<string>();

  for (const node of nodes) {
    const key = buildNodeKey(node.type, node.id);
    const baseId = toMermaidBaseId(node);
    nodeMap.set(key, dedupeMermaidId(baseId, usedIds));
  }

  lines.push("graph TD");

  for (const node of nodes) {
    const id = nodeMap.get(buildNodeKey(node.type, node.id)) ?? toMermaidFallbackId(buildNodeKey(node.type, node.id));
    lines.push(`  ${id}[\"${escapeMermaidLabel(getNodeLabel(node))}\"]`);
  }

  for (const edge of edges) {
    const keys = edgeNodeKeys(edge);
    const fromId = nodeMap.get(keys.fromKey) ?? toMermaidFallbackId(keys.fromKey);
    const toId = nodeMap.get(keys.toKey) ?? toMermaidFallbackId(keys.toKey);
    lines.push(`  ${fromId} -->|${keys.label}| ${toId}`);
  }

  return lines.join("\n");
}

export async function graphExportCommand(options: GraphOptions): Promise<void> {
  const format = normalizeFormat(options.format);
  if (!format) {
    if (shouldOutputJson(options)) {
      await writeJsonError("invalid_format", `Unsupported format: ${options.format ?? ""}`, {
        supported: ["json", "dot", "mermaid"],
      });
    } else {
      console.error(
        chalk.red(`Unsupported format: ${options.format ?? ""}. Supported: json, dot, mermaid`)
      );
    }
    process.exit(1);
  }

  const wantsJson = options.json === true || (format === "json" && !process.stdout.isTTY);
  const warnings: string[] = [];
  const addWarning = (message: string) => {
    warnings.push(message);
    if (!wantsJson) {
      console.error(chalk.yellow(`Warning: ${message}`));
    }
  };

  const registry = await loadRegistry();
  const promptMap = new Map<string, PromptSummary>();
  for (const prompt of registry.prompts) {
    promptMap.set(prompt.id, {
      id: prompt.id,
      title: prompt.title,
      category: prompt.category,
      tags: prompt.tags ?? [],
    });
  }

  const includeCollections = options.includeCollections === true;
  let collectionItems: CollectionItem[] = [];
  let collectionDetails: CollectionDetail[] = [];
  if (includeCollections) {
    const collections = await loadCollectionsForGraph(addWarning);
    collectionItems = collections.items;
    collectionDetails = collections.details;

    for (const collection of collectionDetails) {
      for (const prompt of collection.prompts) {
        if (!prompt?.id) continue;
        if (!promptMap.has(prompt.id)) {
          promptMap.set(prompt.id, {
            id: prompt.id,
            title: prompt.title ?? prompt.id,
            category: prompt.category,
            tags: [],
          });
        }
      }
    }
  }

  const includeMeta = options.includeMeta === true;
  const categories = new Set<string>();
  const tags = new Set<string>();
  if (includeMeta) {
    for (const prompt of promptMap.values()) {
      if (prompt.category) {
        categories.add(prompt.category);
      }
      for (const tag of prompt.tags ?? []) {
        if (tag) tags.add(tag);
      }
    }
  }

  const nodes = buildNodes(
    [...promptMap.values()],
    registry.bundles,
    registry.workflows,
    categories,
    tags,
    includeCollections ? collectionItems : []
  );

  const edgesMap = new Map<string, GraphEdge>();
  const promptIds = new Set(promptMap.keys());
  buildBundleEdges(registry.bundles, promptIds, edgesMap);
  buildWorkflowEdges(registry.workflows, promptIds, edgesMap);

  if (includeMeta) {
    for (const prompt of promptMap.values()) {
      if (prompt.category) {
        addUniqueEdge(edgesMap, {
          from: prompt.id,
          to: prompt.category,
          type: "prompt->category",
        });
      }
      for (const tag of prompt.tags ?? []) {
        if (!tag) continue;
        addUniqueEdge(edgesMap, {
          from: prompt.id,
          to: tag,
          type: "prompt->tag",
        });
      }
    }
  }

  if (includeCollections) {
    for (const collection of collectionDetails) {
      if (!collection?.name) continue;
      for (const prompt of collection.prompts) {
        if (!prompt?.id) continue;
        addUniqueEdge(edgesMap, {
          from: prompt.id,
          to: collection.name,
          type: "prompt->collection",
        });
      }
    }
  }

  const edges = [...edgesMap.values()];

  if (format === "json") {
    if (wantsJson) {
      await writeJson({
        generatedAt: new Date().toISOString(),
        nodes,
        edges,
        warnings: warnings.length ? warnings : undefined,
        totals: {
          nodes: nodes.length,
          edges: edges.length,
        },
      });
      return;
    }

    console.log(chalk.bold.cyan("Prompt Dependency Graph\n"));
    console.log(`Nodes: ${nodes.length}`);
    console.log(`Edges: ${edges.length}`);
    console.log(chalk.dim("Use --json to export the full graph."));
    return;
  }

  const orderedNodes = [...nodes].sort(
    (a, b) => a.type.localeCompare(b.type) || a.id.localeCompare(b.id)
  );
  const orderedEdges = [...edges].sort(
    (a, b) => a.type.localeCompare(b.type) || a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
  );
  const graph =
    format === "dot"
      ? buildDotGraph(orderedNodes, orderedEdges)
      : buildMermaidGraph(orderedNodes, orderedEdges);

  if (wantsJson) {
    await writeJson({
      format,
      generatedAt: new Date().toISOString(),
      graph,
      nodes,
      edges,
      warnings: warnings.length ? warnings : undefined,
      totals: {
        nodes: nodes.length,
        edges: edges.length,
      },
    });
    return;
  }

  await writeStdout(graph + "\n");
}
