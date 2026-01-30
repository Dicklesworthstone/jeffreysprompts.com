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

function buildNodes(prompts: Array<{ id: string; title: string }>, bundles: Bundle[], workflows: Workflow[]): GraphNode[] {
  return [
    ...prompts.map((prompt) => ({ id: prompt.id, type: "prompt" as const, title: prompt.title })),
    ...bundles.map((bundle) => ({ id: bundle.id, type: "bundle" as const, title: bundle.title })),
    ...workflows.map((workflow) => ({ id: workflow.id, type: "workflow" as const, title: workflow.title })),
  ];
}

function buildEdges(bundles: Bundle[], workflows: Workflow[]): GraphEdge[] {
  const edges: GraphEdge[] = [];

  for (const bundle of bundles) {
    for (const promptId of bundle.promptIds) {
      edges.push({ from: promptId, to: bundle.id, type: "prompt->bundle" });
    }
  }

  for (const workflow of workflows) {
    for (const step of workflow.steps) {
      edges.push({ from: step.promptId, to: workflow.id, type: "prompt->workflow" });
    }
  }

  return edges;
}

export async function graphExportCommand(options: GraphOptions): Promise<void> {
  const format = options.format ?? "json";
  if (format !== "json") {
    if (shouldOutputJson(options)) {
      writeJsonError("invalid_format", `Unsupported format: ${format}`, {
        supported: ["json"],
      });
    } else {
      console.error(chalk.red(`Unsupported format: ${format}. Supported: json`));
    }
    process.exit(1);
  }

  const registry = await loadRegistry();
  const nodes = buildNodes(
    registry.prompts.map((prompt) => ({ id: prompt.id, title: prompt.title })),
    registry.bundles,
    registry.workflows
  );
  const edges = buildEdges(registry.bundles, registry.workflows);

  if (shouldOutputJson(options)) {
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
}
