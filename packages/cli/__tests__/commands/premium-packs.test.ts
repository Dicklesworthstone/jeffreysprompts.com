import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { randomUUID } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { premiumPacksCommand } from "../../src/commands/premium-packs";

let output: string[] = [];
let errors: string[] = [];
let exitCode: number | undefined;

const originalLog = console.log;
const originalError = console.error;
const originalExit = process.exit;
const originalFetch = globalThis.fetch;

type CredentialSetup = {
  tier?: "free" | "premium";
  withCredentials?: boolean;
};

function resetCapture() {
  output = [];
  errors = [];
  exitCode = undefined;
}

function parseOutput(): Record<string, unknown> {
  const raw = output.join("");
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Failed to parse JSON output: ${err instanceof Error ? err.message : String(err)}\n${raw}`);
  }
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
  const testDir = join(tmpdir(), "jfp-premium-packs-test-" + randomUUID());
  const fakeHome = join(testDir, "home");
  mkdirSync(fakeHome, { recursive: true });

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

  process.env.HOME = fakeHome;
  delete process.env.XDG_CONFIG_HOME;
  process.env.JFP_TOKEN = "";
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
  globalThis.fetch = originalFetch;
});

describe("premiumPacksCommand", () => {
  it("lists premium packs in JSON mode", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname.endsWith("/cli/premium-packs")) {
        return Promise.resolve(
          jsonResponse({
            packs: [
              {
                id: "starter-pack",
                title: "Starter Pack",
                promptCount: 5,
                isInstalled: false,
              },
            ],
            installedOnly: false,
          })
        );
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    await premiumPacksCommand(undefined, undefined, { json: true });
    const payload = parseOutput();
    expect(payload.count).toBe(1);
    expect((payload.packs as Array<{ id: string }>)[0].id).toBe("starter-pack");
    expect(payload.installedOnly).toBe(false);
  });

  it("passes installed filter when requested", async () => {
    let captured: URL | null = null;
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      captured = url;
      if (url.pathname.endsWith("/cli/premium-packs")) {
        return Promise.resolve(
          jsonResponse({
            packs: [],
            installedOnly: true,
          })
        );
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    await premiumPacksCommand(undefined, undefined, { json: true, installed: true });
    const payload = parseOutput();
    expect(payload.installedOnly).toBe(true);
    expect(captured?.searchParams.get("installed")).toBe("true");
  });

  it("prints empty state for installed list (non-JSON)", async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname.endsWith("/cli/premium-packs")) {
        return Promise.resolve(
          jsonResponse({
            packs: [],
            installedOnly: true,
          })
        );
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    try {
      await premiumPacksCommand(undefined, undefined, { installed: true });
      expect(output.join("")).toContain("No installed premium packs yet.");
    } finally {
      Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, configurable: true });
    }
  });

  it("shows a premium pack in JSON mode", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname.endsWith("/cli/premium-packs/starter-pack")) {
        return Promise.resolve(
          jsonResponse({
            pack: {
              id: "starter-pack",
              title: "Starter Pack",
              promptCount: 2,
              isInstalled: true,
              prompts: [],
            },
          })
        );
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    await premiumPacksCommand("show", "starter-pack", { json: true });
    const payload = parseOutput();
    expect((payload.pack as { id: string }).id).toBe("starter-pack");
    expect((payload.pack as { isInstalled: boolean }).isInstalled).toBe(true);
  });

  it("installs a pack with subscribe action in JSON mode", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString());
      if (url.pathname.endsWith("/cli/premium-packs/starter-pack/install") && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ installed: true, packId: "starter-pack" }));
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    await premiumPacksCommand("subscribe", "starter-pack", { json: true });
    const payload = parseOutput();
    expect(payload.packId).toBe("starter-pack");
    expect(payload.action).toBe("subscribe");
  });

  it("installs a pack with update action in JSON mode", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString());
      if (url.pathname.endsWith("/cli/premium-packs/starter-pack/install") && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ installed: true, packId: "starter-pack" }));
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    await premiumPacksCommand("update", "starter-pack", { json: true });
    const payload = parseOutput();
    expect(payload.packId).toBe("starter-pack");
    expect(payload.action).toBe("update");
  });

  it("uninstalls a pack in JSON mode", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input.toString());
      if (url.pathname.endsWith("/cli/premium-packs/starter-pack/install") && init?.method === "DELETE") {
        return Promise.resolve(jsonResponse({ uninstalled: true, removed: true, packId: "starter-pack" }));
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    await premiumPacksCommand("uninstall", "starter-pack", { json: true });
    const payload = parseOutput();
    expect(payload.packId).toBe("starter-pack");
    expect(payload.uninstalled).toBe(true);
  });

  it("returns changelog in JSON mode", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname.endsWith("/cli/premium-packs/starter-pack")) {
        return Promise.resolve(
          jsonResponse({
            pack: {
              id: "starter-pack",
              title: "Starter Pack",
              version: "1.2.3",
              promptCount: 2,
              isInstalled: true,
              changelog: "Added prompts",
              prompts: [],
            },
          })
        );
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    await premiumPacksCommand("changelog", "starter-pack", { json: true });
    const payload = parseOutput();
    expect(payload.packId).toBe("starter-pack");
    expect(payload.version).toBe("1.2.3");
    expect(payload.hasChangelog).toBe(true);
  });

  it("returns not_authenticated when API responds 401", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname.endsWith("/cli/premium-packs")) {
        return Promise.resolve(jsonResponse({ error: "Unauthorized" }, 401));
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    await expectExit(premiumPacksCommand(undefined, undefined, { json: true }));
    const payload = parseOutput();
    expect(payload.code).toBe("not_authenticated");
    expect(exitCode).toBe(1);
  });

  it("returns premium_required when API responds 403 premium error", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname.endsWith("/cli/premium-packs")) {
        return Promise.resolve(jsonResponse({ error: "Premium required" }, 403));
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    await expectExit(premiumPacksCommand(undefined, undefined, { json: true }));
    const payload = parseOutput();
    expect(payload.code).toBe("premium_required");
    expect(exitCode).toBe(1);
  });

  it("returns not_found when API responds 404 for a pack", async () => {
    globalThis.fetch = mock((input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      if (url.pathname.endsWith("/cli/premium-packs/missing-pack")) {
        return Promise.resolve(jsonResponse({ error: "Pack not found" }, 404));
      }
      return Promise.resolve(jsonResponse({ error: "not found" }, 404));
    });

    await expectExit(premiumPacksCommand("show", "missing-pack", { json: true }));
    const payload = parseOutput();
    expect(payload.code).toBe("not_found");
    expect(exitCode).toBe(1);
  });

  it("returns not_authenticated when credentials are missing", async () => {
    resetCapture();
    setupTestEnv({ withCredentials: false });
    globalThis.fetch = mock(() => Promise.resolve(jsonResponse({})));

    await expectExit(premiumPacksCommand(undefined, undefined, { json: true }));
    const payload = parseOutput();
    expect(payload.code).toBe("not_authenticated");
    expect(exitCode).toBe(1);
  });

  it("returns premium_required for free tier", async () => {
    resetCapture();
    setupTestEnv({ tier: "free" });
    globalThis.fetch = mock(() => Promise.resolve(jsonResponse({})));

    await expectExit(premiumPacksCommand(undefined, undefined, { json: true }));
    const payload = parseOutput();
    expect(payload.code).toBe("premium_required");
    expect(exitCode).toBe(1);
  });
});
