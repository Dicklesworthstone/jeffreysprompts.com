import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";
import type { Bundle } from "@jeffreysprompts/core/prompts/bundles";
import type { Workflow } from "@jeffreysprompts/core/prompts/workflows";

interface GraphOptions {
  json?: boolean;
  format?: string;
}

type GraphNodeType = "prompt" | "bundle" | "workflow";
type GraphFormat = "json" | "dot" | "mermaid";

interface GraphNode {
  id: string;
  type: GraphNodeType;
  title?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  type: "prompt->bundle" | "prompt->workflow";
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
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
  return normalizeLabel(value).replace(/\"/g, "\\\"");
}

function buildNodeKey(type: GraphNodeType, id: string): string {
  return `${type}:${id}`;
}

function getNodeLabel(node: GraphNode): string {
  const title = node.title ?? node.id;
  if (node.type === "prompt") return `Prompt: ${title}`;
  if (node.type === "bundle") return `Bundle: ${title}`;
  return `Workflow: ${title}`;
}

function toMermaidId(node: GraphNode): string {
  const base = node.id.replace(/[^a-zA-Z0-9_]/g, "_");
  const prefix = node.type === "prompt" ? "p" : node.type === "bundle" ? "b" : "w";
  return `${prefix}_${base}`;
}

function toMermaidFallbackId(key: string): string {
  return `x_${key.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function edgeNodeKeys(edge: GraphEdge): { fromKey: string; toKey: string; label: string } {
  if (edge.type === "prompt->bundle") {
    return {
      fromKey: buildNodeKey("prompt", edge.from),
      toKey: buildNodeKey("bundle", edge.to),
      label: "bundle",
    };
  }
  return {
    fromKey: buildNodeKey("prompt", edge.from),
    toKey: buildNodeKey("workflow", edge.to),
    label: "workflow",
  };
}

function buildNodes(prompts: Array<{ id: string; title: string }>, bundles: Bundle[], workflows: Workflow[]): GraphNode[] {
  return [
    ...prompts.map((prompt) => ({ id: prompt.id, type: "prompt" as const, title: prompt.title })),
    ...bundles.map((bundle) => ({ id: bundle.id, type: "bundle" as const, title: bundle.title })),
    ...workflows.map((workflow) => ({ id: workflow.id, type: "workflow" as const, title: workflow.title })),
  ];
}

function buildEdges(bundles: Bundle[], workflows: Workflow[], promptIds: Set<string>): GraphEdge[] {
  const edges = new Map<string, GraphEdge>();

  const addEdge = (from: string, to: string, type: GraphEdge["type"]) => {
    if (!promptIds.has(from)) return;
    const key = `${type}:${from}->${to}`;
    if (edges.has(key)) return;
    edges.set(key, { from, to, type });
  };

  for (const bundle of bundles) {
    for (const promptId of bundle.promptIds) {
      addEdge(promptId, bundle.id, "prompt->bundle");
    }
  }

  for (const workflow of workflows) {
    for (const step of workflow.steps) {
      addEdge(step.promptId, workflow.id, "prompt->workflow");
    }
  }

  return [...edges.values()];
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

  const makeUniqueId = (base: string) => {
    let candidate = base;
    let suffix = 1;
    while (usedIds.has(candidate)) {
      suffix += 1;
      candidate = `${base}_${suffix}`;
    }
    usedIds.add(candidate);
    return candidate;
  };

  for (const node of nodes) {
    const baseId = toMermaidId(node);
    nodeMap.set(buildNodeKey(node.type, node.id), makeUniqueId(baseId));
  }

  lines.push("graph TD");

  for (const node of nodes) {
    const id = nodeMap.get(buildNodeKey(node.type, node.id)) ?? toMermaidId(node);
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
      writeJsonError("invalid_format", `Unsupported format: ${options.format ?? ""}`, {
        supported: ["json", "dot", "mermaid"],
      });
    } else {
      console.error(
        chalk.red(`Unsupported format: ${options.format ?? ""}. Supported: json, dot, mermaid`)
      );
    }
    process.exit(1);
  }

  const registry = await loadRegistry();
  const nodes = buildNodes(
    registry.prompts.map((prompt) => ({ id: prompt.id, title: prompt.title })),
    registry.bundles,
    registry.workflows
  );
  const promptIds = new Set(registry.prompts.map((prompt) => prompt.id));
  const edges = buildEdges(registry.bundles, registry.workflows, promptIds);
  const wantsJson = options.json === true || (format === "json" && !process.stdout.isTTY);

  if (format === "json") {
    if (wantsJson) {
      writeJson({
        generatedAt: new Date().toISOString(),
        nodes,
        edges,
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
    writeJson({
      format,
      generatedAt: new Date().toISOString(),
      graph,
      nodes,
      edges,
      totals: {
        nodes: nodes.length,
        edges: edges.length,
      },
    });
    return;
  }

  console.log(graph);
}
