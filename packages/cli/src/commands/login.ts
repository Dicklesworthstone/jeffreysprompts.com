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
  // Check if already logged in
  const existing = await loadCredentials();
  if (existing) {
    if (options.json) {
      console.log(JSON.stringify({
        success: false,
        error: "already_logged_in",
        message: `Already logged in as ${existing.email}`,
        email: existing.email,
      }));
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

  if (!options.json) {
    console.log(chalk.dim("Starting login flow..."));
  }

  // Start local server to receive callback
  const { port, tokenPromise, close } = await startCallbackServer(timeout);

  // Build auth URL
  const authUrl = new URL(`${PREMIUM_URL}/cli/auth`);
  authUrl.searchParams.set("port", String(port));
  authUrl.searchParams.set("redirect", "local");

  if (!options.json) {
    console.log(chalk.dim("\nOpening browser to sign in with Google..."));
    console.log(chalk.dim(`URL: ${authUrl.toString()}\n`));
  }

  // Open browser
  try {
    await open(authUrl.toString());
  } catch {
    if (!options.json) {
      console.log(chalk.yellow("Could not open browser automatically."));
      console.log(`Please visit: ${chalk.cyan(authUrl.toString())}`);
    }
  }

  if (!options.json) {
    console.log(chalk.dim("Waiting for authentication..."));
  }

  try {
    const credentials = await tokenPromise;
    close();

    // Save credentials
    await saveCredentials(credentials);

    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        email: credentials.email,
        tier: credentials.tier,
        message: `Logged in as ${credentials.email}`,
      }));
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
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: "timeout",
          message: "Login timed out",
        }));
      } else {
        console.log(chalk.red("\nLogin timed out. Please try again."));
        console.log(chalk.dim("Tip: Use 'jfp login --remote' for headless environments"));
      }
    } else {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: "login_failed",
          message: errorMessage,
        }));
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
        const tier = url.searchParams.get("tier") as "free" | "premium";
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

        if (!token || !email || !tier || !userId) {
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

    server.on("error", reject);
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

/**
 * Remote device code login flow (not yet implemented)
 */
async function loginRemote(options: LoginOptions): Promise<void> {
  if (options.json) {
    console.log(JSON.stringify({
      success: false,
      error: "not_implemented",
      message: "Remote login not yet implemented. Use local login with a browser.",
    }));
  } else {
    console.log(chalk.yellow("Remote login not yet implemented."));
    console.log(chalk.dim("Use local login with a browser, or wait for the remote login feature."));
  }
  process.exit(1);
}
