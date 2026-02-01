import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { randomUUID } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { costCommand } from "../../src/commands/cost";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;
let mockEnv: NodeJS.ProcessEnv;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;
const originalJfpHome = process.env.JFP_HOME;

type CredentialSetup = {
  tier?: "free" | "premium";
  withCredentials?: boolean;
};

function resetCapture() {
  output = [];
  errors = [];
  exitCode = undefined;
}

async function expectExit(promise: Promise<void>) {
  try {
    await promise;
  } catch (e) {
    if ((e as Error).message !== "process.exit") {
      throw e;
    }
    return;
  }
  throw new Error("Expected process.exit");
}

function setupTestEnv(options: CredentialSetup = {}) {
  const { tier = "premium", withCredentials = true } = options;
  const testDir = join(tmpdir(), "jfp-cost-test-" + randomUUID());
  const fakeHome = join(testDir, "home");
  process.env.JFP_HOME = fakeHome;
  if (withCredentials) {
    const credDir = join(fakeHome, ".config", "jfp");
    mkdirSync(credDir, { recursive: true });

    const creds = {
      access_token: "test-token-12345",
      refresh_token: "refresh-token-67890",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      email: "test@example.com",
      tier,
      user_id: "user-123",
    };
    writeFileSync(join(credDir, "credentials.json"), JSON.stringify(creds, null, 2));
  }

  mockEnv = {
    ...process.env,
    HOME: fakeHome,
    XDG_CONFIG_HOME: undefined,
    JFP_TOKEN: undefined,
  };
}

beforeEach(() => {
  resetCapture();
  setupTestEnv();
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
  if (originalJfpHome === undefined) {
    delete process.env.JFP_HOME;
  } else {
    process.env.JFP_HOME = originalJfpHome;
  }
});

describe("costCommand", () => {
  it("outputs JSON cost estimate with pricing overrides", async () => {
    await costCommand(
      "idea-wizard",
      { json: true, model: "test-model", priceIn: "1", priceOut: "2", outputTokens: "100" },
      mockEnv
    );
    const payload = JSON.parse(output.join(""));
    expect(payload.prompt.id).toBe("idea-wizard");
    expect(payload.model).toBe("test-model");
    expect(payload.tokens.input).toBe(500);
    expect(payload.cost.total).toBe(0.7);
  });

  it("lists priced models without requiring a prompt id", async () => {
    await costCommand(undefined, { json: true, listModels: true }, mockEnv);
    const payload = JSON.parse(output.join(""));
    expect(payload.models).toContain("gpt-4o-mini");
    expect(payload.defaultModel).toBe("gpt-4o-mini");
  });

  it("returns error payload when prompt id is missing", async () => {
    await expectExit(costCommand(undefined, { json: true }, mockEnv));
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("missing_prompt_id");
    expect(exitCode).toBe(1);
  });

  it("returns error payload when prompt is not found", async () => {
    await expectExit(costCommand("not-a-real-prompt", { json: true }, mockEnv));
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("prompt_not_found");
    expect(exitCode).toBe(1);
  });

  it("returns error payload for invalid input tokens", async () => {
    await expectExit(costCommand("idea-wizard", { json: true, inputTokens: "-1" }, mockEnv));
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("invalid_input_tokens");
    expect(exitCode).toBe(1);
  });

  it("returns error payload for invalid output tokens", async () => {
    await expectExit(costCommand("idea-wizard", { json: true, outputTokens: "-5" }, mockEnv));
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("invalid_output_tokens");
    expect(exitCode).toBe(1);
  });

  it("returns error payload for missing pricing pair", async () => {
    await expectExit(costCommand("idea-wizard", { json: true, priceIn: "1" }, mockEnv));
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("missing_pricing");
    expect(exitCode).toBe(1);
  });

  it("returns error payload for invalid pricing values", async () => {
    await expectExit(costCommand("idea-wizard", { json: true, priceIn: "-1", priceOut: "1" }, mockEnv));
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("invalid_pricing");
    expect(exitCode).toBe(1);
  });

  it("returns error payload when not authenticated", async () => {
    resetCapture();
    setupTestEnv({ withCredentials: false });
    await expectExit(costCommand("idea-wizard", { json: true }, mockEnv));
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("not_authenticated");
    expect(exitCode).toBe(1);
  });

  it("returns error payload when premium is required", async () => {
    resetCapture();
    setupTestEnv({ tier: "free" });
    await expectExit(costCommand("idea-wizard", { json: true }, mockEnv));
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("premium_required");
    expect(exitCode).toBe(1);
  });

  it("returns error payload when model pricing is missing", async () => {
    await expectExit(costCommand("idea-wizard", { json: true, model: "unknown-model" }, mockEnv));
    const payload = JSON.parse(output.join(""));
    expect(payload.code).toBe("unknown_model");
    expect(exitCode).toBe(1);
  });

  it("emits budget alerts when estimate exceeds caps", async () => {
    const configDir = join(process.env.JFP_HOME ?? "", ".config", "jfp");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({
        budgets: {
          monthlyCapUsd: 0.2,
          perRunCapUsd: 0.1,
          alertsEnabled: true,
        },
      })
    );

    await costCommand(
      "idea-wizard",
      { json: true, model: "test-model", priceIn: "1", priceOut: "1" },
      mockEnv
    );
    const payload = JSON.parse(output.join(""));
    expect(payload.alerts.length).toBe(2);
    const types = payload.alerts.map((alert: { type: string }) => alert.type);
    expect(types).toContain("per_run");
    expect(types).toContain("monthly");
  });

  it("outputs budget alert log when --alerts is set", async () => {
    const configDir = join(process.env.JFP_HOME ?? "", ".config", "jfp");
    mkdirSync(configDir, { recursive: true });

    const alerts = [
      {
        type: "per_run",
        capUsd: 0.5,
        totalCostUsd: 0.75,
        currency: "USD",
        promptId: "idea-wizard",
        promptTitle: "The Idea Wizard",
        model: "gpt-4o-mini",
        inputTokens: 500,
        outputTokens: 0,
        createdAt: new Date().toISOString(),
      },
      {
        type: "monthly",
        capUsd: 5,
        totalCostUsd: 6,
        currency: "USD",
        promptId: "readme-reviser",
        promptTitle: "The README Reviser",
        model: "gpt-4o-mini",
        inputTokens: 300,
        outputTokens: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    writeFileSync(
      join(configDir, "budget-alerts.jsonl"),
      alerts.map((alert) => JSON.stringify(alert)).join("\n")
    );

    await costCommand(undefined, { json: true, alerts: true, alertsLimit: "1" }, mockEnv);
    const payload = JSON.parse(output.join(""));
    expect(payload.alerts.length).toBe(1);
    expect(payload.totalCount).toBe(2);
    expect(payload.truncated).toBe(true);
  });
});
