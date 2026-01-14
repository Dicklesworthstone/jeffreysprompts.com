/**
 * Login Command
 *
 * Authenticates users via browser-based OAuth flow for local machines.
 * Uses a local HTTP server to receive the callback token.
 * Falls back to device code flow for headless/SSH environments (separate task).
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { URL } from "url";
import open from "open";
import chalk from "chalk";
import boxen from "boxen";
import { saveCredentials, loadCredentials, type Credentials } from "../lib/credentials";
import { shouldOutputJson } from "../lib/utils";

// Premium site URL for authentication
const PREMIUM_URL = process.env.JFP_PREMIUM_URL ?? "https://pro.jeffreysprompts.com";
const DEFAULT_TIMEOUT = 120_000; // 2 minutes

export interface LoginOptions {
  remote?: boolean;
  timeout?: number;
  json?: boolean;
}

/**
 * Main login command handler
 */
export async function loginCommand(options: LoginOptions = {}): Promise<void> {
  const jsonOutput = shouldOutputJson(options);
  // Check if already logged in
  const existing = await loadCredentials();
  if (existing) {
    if (jsonOutput) {
      writeJsonError("already_logged_in", `Already logged in as ${existing.email}`, {
        email: existing.email,
      });
    } else {
      console.log(chalk.yellow("You are already logged in as " + existing.email));
      console.log(chalk.dim("Run 'jfp logout' first to switch accounts"));
    }
    return;
  }

  // Force remote flow if requested or if no display available
  if (options.remote || !canOpenBrowser()) {
    return loginRemote(options);
  }

  return loginLocal(options);
}

/**
 * Check if we can open a browser on this system
 */
function canOpenBrowser(): boolean {
  // Check if we're in an SSH session
  if (process.env.SSH_CLIENT || process.env.SSH_TTY) {
    return false;
  }

  // Check for display on Linux
  if (process.platform === "linux" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    return false;
  }

  return true;
}

/**
 * Local browser-based login flow
 */
async function loginLocal(options: LoginOptions): Promise<void> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const jsonOutput = shouldOutputJson(options);

  if (!jsonOutput) {
    console.log(chalk.dim("Starting login flow..."));
  }

  // Start local server to receive callback
  const { port, tokenPromise, close } = await startCallbackServer(timeout);

  // Build auth URL
  const authUrl = new URL(`${PREMIUM_URL}/cli/auth`);
  authUrl.searchParams.set("port", String(port));
  authUrl.searchParams.set("redirect", "local");

  if (!jsonOutput) {
    console.log(chalk.dim("\nOpening browser to sign in with Google..."));
    console.log(chalk.dim(`URL: ${authUrl.toString()}\n`));
  }

  // Open browser
  try {
    await open(authUrl.toString());
  } catch {
    if (!jsonOutput) {
      console.log(chalk.yellow("Could not open browser automatically."));
      console.log(`Please visit: ${chalk.cyan(authUrl.toString())}`);
    }
  }

  if (!jsonOutput) {
    console.log(chalk.dim("Waiting for authentication..."));
  }

  try {
    const credentials = await tokenPromise;
    close();

    // Save credentials
    await saveCredentials(credentials);

    if (jsonOutput) {
      writeJson({
        authenticated: true,
        email: credentials.email,
        tier: credentials.tier,
      });
    } else {
      console.log(
        boxen(
          `${chalk.green("✓")} Logged in as ${chalk.bold(credentials.email)}\n` +
            `Tier: ${chalk.cyan(credentials.tier)}`,
          { padding: 1, margin: 1, borderStyle: "round", borderColor: "green" }
        )
      );
    }
  } catch (err) {
    close();

    if (err instanceof Error && err.message === "timeout") {
      if (jsonOutput) {
        writeJsonError("timeout", "Login timed out");
      } else {
        console.log(chalk.red("\nLogin timed out. Please try again."));
        console.log(chalk.dim("Tip: Use 'jfp login --remote' for headless environments"));
      }
    } else {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (jsonOutput) {
        writeJsonError("login_failed", errorMessage);
      } else {
        console.log(chalk.red("\nLogin failed:"), errorMessage);
      }
    }
    process.exit(1);
  }
}

interface CallbackServer {
  port: number;
  tokenPromise: Promise<Credentials>;
  close: () => void;
}

/**
 * Start a local HTTP server to receive the OAuth callback
 */
async function startCallbackServer(timeoutMs: number): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    let resolveToken: (creds: Credentials) => void;
    let rejectToken: (err: Error) => void;

    const tokenPromise = new Promise<Credentials>((res, rej) => {
      resolveToken = res;
      rejectToken = rej;
    });

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url!, `http://localhost`);

      if (url.pathname === "/callback") {
        // Parse token from query params
        const token = url.searchParams.get("token");
        const email = url.searchParams.get("email");
        const rawTier = url.searchParams.get("tier");
        // Validate tier is a known value, default to "free" if unrecognized
        const tier: "free" | "premium" = rawTier === "premium" ? "premium" : "free";
        const expiresAt = url.searchParams.get("expires_at");
        const userId = url.searchParams.get("user_id");
        const refreshToken = url.searchParams.get("refresh_token");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(errorPage(error));
          rejectToken(new Error(error));
          return;
        }

        if (!token || !email || !userId) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(errorPage("Invalid callback parameters"));
          rejectToken(new Error("Invalid callback parameters"));
          return;
        }

        // Success!
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(successPage(email));

        resolveToken({
          access_token: token,
          refresh_token: refreshToken ?? undefined,
          expires_at: expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          email,
          tier,
          user_id: userId,
        });
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    // Find available port by listening on port 0
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;

      // Set timeout
      const timeoutId = setTimeout(() => {
        rejectToken(new Error("timeout"));
      }, timeoutMs);

      resolve({
        port,
        tokenPromise: tokenPromise.finally(() => clearTimeout(timeoutId)),
        close: () => server.close(),
      });
    });

    server.on("error", (err) => {
      reject(err);
      rejectToken(err);
    });
  });
}

/**
 * HTML page shown after successful login
 */
function successPage(email: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Login Successful</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fff; }
    .card { text-align: center; padding: 2rem; }
    .check { font-size: 4rem; color: #22c55e; }
    h1 { margin: 1rem 0 0.5rem; }
    p { color: #888; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <h1>Login Successful!</h1>
    <p>Signed in as ${escapeHtml(email)}</p>
    <p>You can close this window and return to the terminal.</p>
  </div>
</body>
</html>`;
}

/**
 * HTML page shown after failed login
 */
function errorPage(error: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Login Failed</title>
  <style>
    body { font-family: system-ui; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0a0a0a; color: #fff; }
    .card { text-align: center; padding: 2rem; }
    .x { font-size: 4rem; color: #ef4444; }
    h1 { margin: 1rem 0 0.5rem; }
    p { color: #888; }
  </style>
</head>
<body>
  <div class="card">
    <div class="x">✕</div>
    <h1>Login Failed</h1>
    <p>${escapeHtml(error)}</p>
    <p>Please close this window and try again.</p>
  </div>
</body>
</html>`;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Device code flow constants
const POLL_INTERVAL = 2_000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 60; // 2 minutes max

interface DeviceCodeResponse {
  device_code: string; // Internal code for polling
  user_code: string; // Code user enters (e.g., "XYZW-1234")
  verification_url: string; // URL to visit
  expires_in: number; // Seconds until expiry
  interval: number; // Recommended poll interval
}

interface DeviceTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  email: string;
  tier: "free" | "premium";
  user_id: string;
}

interface DeviceTokenError {
  error: string;
  error_description?: string;
}

/**
 * Remote device code login flow
 * Uses RFC 8628 OAuth 2.0 Device Authorization Grant
 */
async function loginRemote(options: LoginOptions): Promise<void> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const jsonOutput = shouldOutputJson(options);

  if (!jsonOutput) {
    console.log(chalk.dim("Initiating device code authentication...\n"));
  }

  // Request device code from API
  let deviceCodeResponse: Response;
  try {
    deviceCodeResponse = await fetch(`${PREMIUM_URL}/api/cli/device-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: "jfp-cli" }),
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (jsonOutput) {
      writeJsonError("network_error", `Could not reach authentication server: ${errorMessage}`);
    } else {
      console.log(chalk.red("Could not reach authentication server"));
      console.log(chalk.dim(errorMessage));
    }
    process.exit(1);
  }

  if (!deviceCodeResponse.ok) {
    if (jsonOutput) {
      writeJsonError("device_code_failed", "Failed to initiate authentication");
    } else {
      console.log(chalk.red("Failed to initiate authentication"));
    }
    process.exit(1);
  }

  let devicePayload: DeviceCodeResponse;
  try {
    devicePayload = (await deviceCodeResponse.json()) as DeviceCodeResponse;
  } catch {
    if (jsonOutput) {
      writeJsonError("device_code_failed", "Invalid device code response");
    } else {
      console.log(chalk.red("Failed to parse authentication response"));
    }
    process.exit(1);
  }

  const { device_code, user_code, verification_url, interval } = devicePayload;

  if (!device_code || !user_code || !verification_url) {
    if (jsonOutput) {
      writeJsonError("device_code_failed", "Missing device code fields in response");
    } else {
      console.log(chalk.red("Authentication server returned an invalid response"));
    }
    process.exit(1);
  }

  // Display instructions to user
  if (jsonOutput) {
    writeJson({
      status: "pending",
      authenticated: false,
      verification_url,
      user_code: formatUserCode(user_code),
      message: `Visit ${verification_url} and enter code: ${formatUserCode(user_code)}`,
    });
  } else {
    console.log(
      boxen(
        `To sign in, visit:\n\n` +
          `  ${chalk.cyan(verification_url)}\n\n` +
          `And enter code:\n\n` +
          `  ${chalk.bold.yellow(formatUserCode(user_code))}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          title: "Device Authentication",
          titleAlignment: "center",
        }
      )
    );

    console.log(chalk.dim("\nWaiting for authentication..."));
    console.log(chalk.dim("(Press Ctrl+C to cancel)\n"));
  }

  // Poll for token
  const pollInterval = Math.max((interval ?? 2) * 1000, POLL_INTERVAL);
  const maxAttempts = Math.min(MAX_POLL_ATTEMPTS, Math.ceil(timeout / pollInterval));
  let attempts = 0;

  while (attempts < maxAttempts) {
    await sleep(pollInterval);
    attempts++;

    try {
      const tokenResponse = await fetch(`${PREMIUM_URL}/api/cli/device-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_code,
          client_id: "jfp-cli",
        }),
      });

      if (tokenResponse.ok) {
        const credentials = (await tokenResponse.json()) as DeviceTokenResponse;

        // Save credentials
        await saveCredentials({
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token,
          expires_at: credentials.expires_at,
          email: credentials.email,
          tier: credentials.tier,
          user_id: credentials.user_id,
        });

        if (jsonOutput) {
          writeJson({
            authenticated: true,
            email: credentials.email,
            tier: credentials.tier,
          });
        } else {
          console.log(
            boxen(
              `${chalk.green("✓")} Logged in as ${chalk.bold(credentials.email)}\n` +
                `Tier: ${chalk.cyan(credentials.tier)}`,
              { padding: 1, margin: 1, borderStyle: "round", borderColor: "green" }
            )
          );
        }

        return;
      }

      // Check for specific errors
      const errorBody = (await tokenResponse.json()) as DeviceTokenError;

      if (errorBody.error === "authorization_pending") {
        // User hasn't completed auth yet, keep polling
        if (!jsonOutput) {
          process.stdout.write(".");
        }
        continue;
      }

      if (errorBody.error === "slow_down") {
        // API wants us to slow down
        await sleep(5000);
        continue;
      }

      if (errorBody.error === "expired_token") {
        if (jsonOutput) {
          writeJsonError("expired_token", "Device code expired. Please try again.");
        } else {
          console.log(chalk.red("\n\nDevice code expired. Please try again."));
        }
        process.exit(1);
      }

      if (errorBody.error === "access_denied") {
        if (jsonOutput) {
          writeJsonError("access_denied", "Authentication was denied.");
        } else {
          console.log(chalk.red("\n\nAuthentication was denied."));
        }
        process.exit(1);
      }

      // Unknown error
      const errorMessage = errorBody.error_description || errorBody.error;
      if (jsonOutput) {
        writeJsonError(errorBody.error, errorMessage);
      } else {
        console.log(chalk.red("\n\nAuthentication failed:"), errorMessage);
      }
      process.exit(1);
    } catch {
      // Network error, keep trying
      if (!jsonOutput) {
        process.stdout.write("x");
      }
    }
  }

  // Timeout
  if (jsonOutput) {
    writeJsonError("timeout", "Authentication timed out. Please try again.");
  } else {
    console.log(chalk.red("\n\nAuthentication timed out. Please try again."));
  }
  process.exit(1);
}

function writeJson(payload: Record<string, unknown>): void {
  console.log(JSON.stringify(payload));
}

function writeJsonError(code: string, message: string, extra: Record<string, unknown> = {}): void {
  writeJson({ error: true, code, message, ...extra });
}

/**
 * Format user code for display (e.g., "XYZW1234" -> "XYZW-1234")
 */
function formatUserCode(code: string): string {
  // Format as "XXXX-XXXX" for easier reading
  if (code.length === 8 && !code.includes("-")) {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }
  return code;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
