import chalk from "chalk";
import { shouldOutputJson } from "../lib/utils";
import { loadRegistry } from "../lib/registry-loader";
import type { Bundle } from "@jeffreysprompts/core/prompts/bundles";
import type { Workflow } from "@jeffreysprompts/core/prompts/workflows";

interface ImpactOptions {
  json?: boolean;
}

interface ImpactResult {
  promptId: string;
  bundles: Array<{ id: string; title: string }>;
  workflows: Array<{ id: string; title: string }>;
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

function findBundles(promptId: string, bundles: Bundle[]): ImpactResult["bundles"] {
  return bundles
    .filter((bundle) => bundle.promptIds.includes(promptId))
    .map((bundle) => ({ id: bundle.id, title: bundle.title }));
}

function findWorkflows(promptId: string, workflows: Workflow[]): ImpactResult["workflows"] {
  return workflows
    .filter((workflow) => workflow.steps.some((step) => step.promptId === promptId))
    .map((workflow) => ({ id: workflow.id, title: workflow.title }));
}

export async function impactCommand(promptId: string, options: ImpactOptions): Promise<void> {
  const registry = await loadRegistry();
  const prompt = registry.prompts.find((item) => item.id === promptId);

  if (!prompt) {
    if (shouldOutputJson(options)) {
      writeJsonError("prompt_not_found", `No prompt with id '${promptId}'`);
    } else {
      console.error(chalk.red(`No prompt with id '${promptId}'`));
    }
    process.exit(1);
  }

  const bundles = findBundles(promptId, registry.bundles);
  const workflows = findWorkflows(promptId, registry.workflows);

  if (shouldOutputJson(options)) {
    writeJson({
      prompt: {
        id: prompt.id,
        title: prompt.title,
      },
      impact: {
        bundles,
        workflows,
      },
      totals: {
        bundles: bundles.length,
        workflows: workflows.length,
        total: bundles.length + workflows.length,
      },
    });
    return;
  }

  console.log(chalk.bold.cyan(`Impact for "${prompt.title}" (${prompt.id})\n`));

  if (bundles.length === 0 && workflows.length === 0) {
    console.log(chalk.green("No downstream dependencies found."));
    return;
  }

  if (bundles.length > 0) {
    console.log(chalk.bold("Bundles"));
    for (const bundle of bundles) {
      console.log(`- ${bundle.title} (${bundle.id})`);
    }
    console.log();
  }

  if (workflows.length > 0) {
    console.log(chalk.bold("Workflows"));
    for (const workflow of workflows) {
      console.log(`- ${workflow.title} (${workflow.id})`);
    }
    console.log();
  }
}
