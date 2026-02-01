import chalk from "chalk";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import {
  DEFAULT_MODEL,
  DEFAULT_PRICING_TABLE,
  estimateCost,
  estimatePromptTokens,
  listPricedModels,
  type CostEstimate,
  type PricingTable,
} from "@jeffreysprompts/core";
import { getConfigDir, loadConfig } from "../lib/config";
import { loadRegistry } from "../lib/registry-loader";
import { shouldOutputJson } from "../lib/utils";
import { isLoggedIn, loadCredentials } from "../lib/credentials";

interface CostOptions {
  json?: boolean;
  model?: string;
  outputTokens?: string;
  inputTokens?: string;
  priceIn?: string;
  priceOut?: string;
  listModels?: boolean;
  alerts?: boolean;
  alertsLimit?: string;
}

type BudgetAlertType = "per_run" | "monthly";

interface BudgetAlert {
  type: BudgetAlertType;
  capUsd: number;
  totalCostUsd: number;
  currency: string;
  promptId: string;
  promptTitle: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

interface BudgetAlertLogResult {
  alerts: BudgetAlert[];
  totalCount: number;
  invalidCount: number;
  truncated: boolean;
  path: string;
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload, null, 2));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

function outputModelList(options: CostOptions): void {
  const models = listPricedModels(DEFAULT_PRICING_TABLE);
  if (shouldOutputJson(options)) {
    writeJson({
      models,
      count: models.length,
      defaultModel: DEFAULT_MODEL,
    });
    return;
  }

  console.log(chalk.bold.cyan("\nSupported pricing models\n"));
  for (const model of models) {
    console.log(`  ${chalk.yellow(model)}`);
  }
  console.log();
  console.log(chalk.dim(`Default model: ${DEFAULT_MODEL}`));
  console.log(chalk.dim("Use --price-in/--price-out to override pricing for other models."));
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseNonNegative(value: string | undefined, _field: string): number | null {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  if (!Number.isFinite(parsed) || parsed < 0) {
    return NaN;
  }
  return parsed;
}

async function requirePremium(options: { json?: boolean }, env = process.env): Promise<void> {
  const loggedIn = await isLoggedIn(env);
  if (!loggedIn) {
    if (shouldOutputJson(options)) {
      writeJsonError("not_authenticated", "Cost estimation requires login.", {
        hint: "Run 'jfp login' to sign in",
      });
    } else {
      console.log(chalk.yellow("Cost estimation requires login."));
      console.log(chalk.dim("Run 'jfp login' to sign in to JeffreysPrompts Premium"));
    }
    process.exit(1);
  }

  const creds = await loadCredentials(env);
  if (creds?.tier === "premium") return;

  if (shouldOutputJson(options)) {
    writeJsonError("premium_required", "Cost estimation requires a JeffreysPrompts Pro subscription.", {
      hint: "Visit https://pro.jeffreysprompts.com/pricing to upgrade",
    });
  } else {
    console.log(chalk.yellow("Cost estimation requires a JeffreysPrompts Pro subscription."));
    console.log(chalk.dim("Upgrade at https://pro.jeffreysprompts.com/pricing"));
    console.log(chalk.dim("Run 'jfp login' after upgrading."));
  }
  process.exit(1);
}

function formatCurrency(amount: number, currency: string): string {
  if (currency !== "USD") return `${amount.toFixed(6)} ${currency}`;
  return `$${amount.toFixed(6)}`;
}

function normalizeCap(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return value;
}

function parseAlertLimit(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return NaN;
  }
  return Math.floor(parsed);
}

function isBudgetAlert(value: unknown): value is BudgetAlert {
  if (!value || typeof value !== "object") return false;
  const record = value as BudgetAlert;
  if (record.type !== "per_run" && record.type !== "monthly") return false;
  if (typeof record.capUsd !== "number") return false;
  if (typeof record.totalCostUsd !== "number") return false;
  if (typeof record.currency !== "string") return false;
  if (typeof record.promptId !== "string") return false;
  if (typeof record.promptTitle !== "string") return false;
  if (typeof record.model !== "string") return false;
  if (typeof record.inputTokens !== "number") return false;
  if (typeof record.outputTokens !== "number") return false;
  if (typeof record.createdAt !== "string") return false;
  return true;
}

function readBudgetAlerts(limit: number | null): BudgetAlertLogResult {
  const alertPath = join(getConfigDir(), "budget-alerts.jsonl");
  if (!existsSync(alertPath)) {
    return { alerts: [], totalCount: 0, invalidCount: 0, truncated: false, path: alertPath };
  }

  try {
    const raw = readFileSync(alertPath, "utf-8").trim();
    if (!raw) {
      return { alerts: [], totalCount: 0, invalidCount: 0, truncated: false, path: alertPath };
    }
    const lines = raw.split("\n").filter(Boolean);
    const totalCount = lines.length;
    const normalizedLimit = limit && limit > 0 && totalCount > limit ? limit : null;
    const startIndex = normalizedLimit ? Math.max(0, totalCount - normalizedLimit) : 0;
    const slice = lines.slice(startIndex);
    const alerts: BudgetAlert[] = [];
    let invalidCount = 0;
    for (const line of slice) {
      try {
        const parsed = JSON.parse(line) as unknown;
        if (isBudgetAlert(parsed)) {
          alerts.push(parsed);
        } else {
          invalidCount += 1;
        }
      } catch {
        invalidCount += 1;
      }
    }
    return {
      alerts,
      totalCount,
      invalidCount,
      truncated: normalizedLimit !== null,
      path: alertPath,
    };
  } catch {
    return { alerts: [], totalCount: 0, invalidCount: 0, truncated: false, path: alertPath };
  }
}

function outputBudgetAlerts(result: BudgetAlertLogResult, options: CostOptions): void {
  if (shouldOutputJson(options)) {
    writeJson({
      alerts: result.alerts,
      count: result.alerts.length,
      totalCount: result.totalCount,
      truncated: result.truncated,
      invalidCount: result.invalidCount,
      path: result.path,
    });
    return;
  }

  console.log(chalk.bold.cyan("\nBudget alert log"));
  console.log(chalk.dim(`Source: ${result.path}`));

  if (result.totalCount === 0 || result.alerts.length === 0) {
    console.log(chalk.dim("No budget alerts logged yet."));
    console.log();
    return;
  }

  if (result.truncated) {
    console.log(chalk.dim(`Showing ${result.alerts.length} of ${result.totalCount} alerts`));
  } else {
    console.log(chalk.dim(`Total alerts: ${result.totalCount}`));
  }

  for (const alert of result.alerts) {
    const label = alert.type === "per_run" ? "Per-run cap" : "Monthly cap";
    const totalCost = formatCurrency(alert.totalCostUsd, alert.currency);
    const capCost = formatCurrency(alert.capUsd, alert.currency);
    const tokens = `tokens ${alert.inputTokens} in / ${alert.outputTokens} out`;
    console.log(
      `  ${chalk.dim(alert.createdAt)}  ${chalk.yellow(label)}  ${chalk.white(alert.promptTitle)} ` +
        `(${chalk.dim(alert.promptId)})  ${chalk.green(totalCost)} > ${chalk.yellow(capCost)}  ` +
        `${chalk.dim(alert.model)} · ${chalk.dim(tokens)}`
    );
  }
  if (result.invalidCount > 0) {
    console.log(chalk.dim(`Skipped ${result.invalidCount} invalid alert entries.`));
  }
  console.log();
}

function recordBudgetAlert(alert: BudgetAlert): void {
  try {
    const configDir = getConfigDir();
    mkdirSync(configDir, { recursive: true });
    const alertPath = join(configDir, "budget-alerts.jsonl");
    appendFileSync(alertPath, JSON.stringify(alert) + "\n");
  } catch {
    // Silent failure: alert logging should not crash the command
  }
}

function evaluateBudgetAlerts(input: {
  estimate: CostEstimate;
  prompt: { id: string; title: string };
  model: string;
  budgets: { monthlyCapUsd: number | null; perRunCapUsd: number | null };
  alertsEnabled: boolean;
}): BudgetAlert[] {
  if (!input.alertsEnabled) return [];

  const perRunCap = normalizeCap(input.budgets.perRunCapUsd);
  const monthlyCap = normalizeCap(input.budgets.monthlyCapUsd);
  const totalCostUsd = input.estimate.totalCost;

  const alerts: BudgetAlert[] = [];
  if (perRunCap !== null && totalCostUsd > perRunCap) {
    alerts.push({
      type: "per_run",
      capUsd: perRunCap,
      totalCostUsd,
      currency: input.estimate.currency,
      promptId: input.prompt.id,
      promptTitle: input.prompt.title,
      model: input.model,
      inputTokens: input.estimate.inputTokens,
      outputTokens: input.estimate.outputTokens,
      createdAt: new Date().toISOString(),
    });
  }
  if (monthlyCap !== null && totalCostUsd > monthlyCap) {
    alerts.push({
      type: "monthly",
      capUsd: monthlyCap,
      totalCostUsd,
      currency: input.estimate.currency,
      promptId: input.prompt.id,
      promptTitle: input.prompt.title,
      model: input.model,
      inputTokens: input.estimate.inputTokens,
      outputTokens: input.estimate.outputTokens,
      createdAt: new Date().toISOString(),
    });
  }

  for (const alert of alerts) {
    recordBudgetAlert(alert);
  }

  return alerts;
}

function outputEstimate(input: {
  estimate: CostEstimate;
  prompt: { id: string; title: string };
  tokenSource: string;
  model: string;
  pricingTable: PricingTable;
  options: CostOptions;
  alerts: BudgetAlert[];
  budgets: { monthlyCapUsd: number | null; perRunCapUsd: number | null };
}): void {
  const { estimate, prompt, tokenSource, model, pricingTable, options, alerts, budgets } = input;

  if (shouldOutputJson(options)) {
    writeJson({
      prompt: { id: prompt.id, title: prompt.title },
      model: estimate.model,
      tokens: {
        input: estimate.inputTokens,
        output: estimate.outputTokens,
        total: estimate.totalTokens,
        source: tokenSource,
      },
      pricing: {
        inputPer1k: pricingTable[model].inputPer1k,
        outputPer1k: pricingTable[model].outputPer1k,
        currency: pricingTable[model].currency,
        unit: estimate.unit,
      },
      cost: {
        input: estimate.inputCost,
        output: estimate.outputCost,
        total: estimate.totalCost,
        currency: estimate.currency,
      },
      budgets: {
        monthlyCapUsd: budgets.monthlyCapUsd,
        perRunCapUsd: budgets.perRunCapUsd,
      },
      alerts: alerts.map((alert) => ({
        type: alert.type,
        capUsd: alert.capUsd,
        totalCostUsd: alert.totalCostUsd,
        currency: alert.currency,
        createdAt: alert.createdAt,
      })),
    });
    return;
  }

  console.log(chalk.bold.cyan(`\nCost estimate for "${prompt.title}" (${prompt.id})`));
  console.log(chalk.dim(`Model: ${estimate.model}`));
  console.log(
    chalk.dim(
      `Tokens: input ${estimate.inputTokens} (${tokenSource}), output ${estimate.outputTokens}, total ${estimate.totalTokens}`
    )
  );
  console.log(
    chalk.dim(
      `Pricing: ${formatCurrency(pricingTable[model].inputPer1k, estimate.currency)}/1k input, ` +
        `${formatCurrency(pricingTable[model].outputPer1k, estimate.currency)}/1k output`
    )
  );
  console.log(chalk.green(`Estimated cost: ${formatCurrency(estimate.totalCost, estimate.currency)}`));

  if (alerts.length > 0) {
    for (const alert of alerts) {
      const label = alert.type === "per_run" ? "per-run budget" : "monthly budget";
      console.log(
        chalk.yellow(
          `⚠ Estimated cost exceeds ${label} ($${alert.capUsd.toFixed(2)}).`
        )
      );
    }
  }
  console.log();
}

export async function costCommand(
  promptId: string | undefined,
  options: CostOptions = {},
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  if (options.listModels) {
    outputModelList(options);
    return;
  }

  if (options.alertsLimit && !options.alerts) {
    if (shouldOutputJson(options)) {
      writeJsonError("alerts_limit_requires_alerts", "Use --alerts with --alerts-limit.");
    } else {
      console.error(chalk.red("Use --alerts with --alerts-limit."));
    }
    process.exit(1);
  }

  if (options.alerts) {
    const limit = parseAlertLimit(options.alertsLimit);
    if (limit !== null && !Number.isFinite(limit)) {
      if (shouldOutputJson(options)) {
        writeJsonError("invalid_alerts_limit", "Invalid --alerts-limit value. Provide a positive number.");
      } else {
        console.error(chalk.red("Invalid --alerts-limit value. Provide a positive number."));
      }
      process.exit(1);
    }

    const resolvedLimit = limit ?? 20;
    const result = readBudgetAlerts(resolvedLimit);
    outputBudgetAlerts(result, options);
    return;
  }

  const resolvedPromptId = promptId?.trim();
  if (!resolvedPromptId) {
    if (shouldOutputJson(options)) {
      writeJsonError("missing_prompt_id", "Usage: jfp cost <prompt-id>");
    } else {
      console.error(chalk.red("Missing prompt id. Usage: jfp cost <prompt-id>"));
    }
    process.exit(1);
  }

  await requirePremium(options, env);

  const registry = await loadRegistry();
  const prompt = registry.prompts.find((item) => item.id === resolvedPromptId);

  if (!prompt) {
    if (shouldOutputJson(options)) {
      writeJsonError("prompt_not_found", `No prompt with id '${resolvedPromptId}'`);
    } else {
      console.error(chalk.red(`No prompt with id '${resolvedPromptId}'`));
    }
    process.exit(1);
  }

  const model = options.model ?? DEFAULT_MODEL;
  const inputOverride = parseNonNegative(options.inputTokens, "inputTokens");
  if (inputOverride !== null && !Number.isFinite(inputOverride)) {
    if (shouldOutputJson(options)) {
      writeJsonError("invalid_input_tokens", "Invalid --input-tokens value. Provide a non-negative number.");
    } else {
      console.error(chalk.red("Invalid --input-tokens value. Provide a non-negative number."));
    }
    process.exit(1);
  }

  const outputTokens = parseNonNegative(options.outputTokens, "outputTokens");
  if (outputTokens !== null && !Number.isFinite(outputTokens)) {
    if (shouldOutputJson(options)) {
      writeJsonError("invalid_output_tokens", "Invalid --output-tokens value. Provide a non-negative number.");
    } else {
      console.error(chalk.red("Invalid --output-tokens value. Provide a non-negative number."));
    }
    process.exit(1);
  }

  const priceIn = parseNonNegative(options.priceIn, "priceIn");
  const priceOut = parseNonNegative(options.priceOut, "priceOut");
  if ((priceIn === null) !== (priceOut === null)) {
    if (shouldOutputJson(options)) {
      writeJsonError("missing_pricing", "Provide both --price-in and --price-out or neither.");
    } else {
      console.error(chalk.red("Provide both --price-in and --price-out or neither."));
    }
    process.exit(1);
  }
  if ((priceIn !== null && !Number.isFinite(priceIn)) || (priceOut !== null && !Number.isFinite(priceOut))) {
    if (shouldOutputJson(options)) {
      writeJsonError("invalid_pricing", "Invalid pricing values. Provide non-negative numbers.");
    } else {
      console.error(chalk.red("Invalid pricing values. Provide non-negative numbers."));
    }
    process.exit(1);
  }

  const promptEstimate = estimatePromptTokens(prompt);
  const tokenEstimate = inputOverride ?? promptEstimate?.tokens ?? null;
  const tokenSource = inputOverride !== null ? "override" : promptEstimate?.source ?? "unknown";
  if (tokenEstimate === null) {
    if (shouldOutputJson(options)) {
      writeJsonError("missing_token_estimate", "Prompt has no estimated tokens and could not be estimated.");
    } else {
      console.error(chalk.red("Prompt has no estimated tokens and could not be estimated."));
    }
    process.exit(1);
  }

  const pricingTable =
    priceIn !== null && priceOut !== null
      ? { [model]: { inputPer1k: priceIn, outputPer1k: priceOut, currency: "USD" as const } }
      : DEFAULT_PRICING_TABLE;

  const estimate = estimateCost({
    model,
    inputTokens: tokenEstimate,
    outputTokens: outputTokens ?? 0,
    pricingTable,
  });

  if (!estimate) {
    const available = listPricedModels(DEFAULT_PRICING_TABLE);
    if (shouldOutputJson(options)) {
      writeJsonError("unknown_model", `No pricing configured for model '${model}'.`, {
        availableModels: available,
        hint: "Use --price-in/--price-out to provide pricing overrides.",
      });
    } else {
      console.error(chalk.red(`No pricing configured for model '${model}'.`));
      if (available.length > 0) {
        console.error(chalk.dim(`Available models: ${available.join(", ")}`));
      }
      console.error(chalk.dim("Use --price-in/--price-out to provide pricing overrides."));
    }
    process.exit(1);
    return;
  }

  const config = loadConfig();
  const budgets = {
    monthlyCapUsd: normalizeCap(config.budgets.monthlyCapUsd),
    perRunCapUsd: normalizeCap(config.budgets.perRunCapUsd),
  };
  const alerts = evaluateBudgetAlerts({
    estimate,
    prompt,
    model,
    budgets,
    alertsEnabled: config.budgets.alertsEnabled !== false,
  });

  outputEstimate({
    estimate,
    prompt,
    tokenSource,
    model,
    pricingTable,
    options,
    alerts,
    budgets,
  });
}
