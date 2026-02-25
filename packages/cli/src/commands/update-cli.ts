import chalk from "chalk";
import { version } from "../../package.json";
import { chmodSync, createWriteStream, existsSync, readFileSync, renameSync, unlinkSync } from "fs";
import { createHash, randomBytes } from "crypto";
import { spawn } from "child_process";
import { loadConfig, saveConfig } from "../lib/config";
import { shouldOutputJson } from "../lib/utils";
import { compareVersions } from "../lib/version";

// Add imports for hidden command
// These are used for the hidden `update-check-internal` command
export async function internalUpdateCheckCommand() {
  const config = loadConfig();
  
  try {
    const release = await fetchLatestRelease();
    const latestVersion = release.tag_name.replace(/^v/, "");
    recordUpdateCheck(config.updates, latestVersion);
    // Silent success - state is saved in config
  } catch {
    // Silent failure
  }
}

const GITHUB_OWNER = "Dicklesworthstone";
const GITHUB_REPO = "jeffreysprompts.com";
const RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const NETWORK_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = NETWORK_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  const upstreamSignal = options.signal ?? undefined;

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort();
    } else {
      upstreamSignal.addEventListener("abort", onAbort, { once: true });
    }
  }

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    if (upstreamSignal) {
      upstreamSignal.removeEventListener("abort", onAbort);
    }
  }
}

interface UpdateCliOptions {
  check?: boolean;
  force?: boolean;
  json?: boolean;
}

interface GithubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

interface UpdateResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  message: string;
  error?: string;
  downloadUrl?: string;
  assetName?: string;
}

function getBinaryName(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin") {
    return arch === "arm64" ? "jfp-darwin-arm64" : "jfp-darwin-x64";
  } else if (platform === "linux") {
    return arch === "arm64" ? "jfp-linux-arm64" : "jfp-linux-x64";
  } else if (platform === "win32") {
    return "jfp-windows-x64.exe";
  }

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

async function fetchLatestRelease(): Promise<GithubRelease> {
  const response = await fetchWithTimeout(RELEASE_API, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": `jfp-cli/${version}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("No releases found for this repository");
    }
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Try again later.");
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as GithubRelease;
}

async function downloadFile(url: string, destPath: string, expectedSize?: number): Promise<void> {
  const response = await fetchWithTimeout(url, {
    headers: { "User-Agent": `jfp-cli/${version}` },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const totalSize = expectedSize || parseInt(response.headers.get("content-length") || "0", 10);
  let downloadedSize = 0;
  const startTime = Date.now();

  const body = response.body;
  if (!body) throw new Error("No response body");

  const reader = body.getReader();
  // Create with secure permissions (rwx------)
  const fileStream = createWriteStream(destPath, { mode: 0o700 });
  const showProgress = process.stdout.isTTY && totalSize > 0;
  let lastProgressUpdate = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      downloadedSize += value.length;
      if (!fileStream.write(value)) {
        await new Promise<void>((resolve) => fileStream.once("drain", () => resolve()));
      }

      if (showProgress && Date.now() - lastProgressUpdate > 100) {
        const percent = Math.round((downloadedSize / totalSize) * 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = downloadedSize / elapsed / 1024;
        process.stdout.write(`\r${chalk.dim("Downloading:")} ${percent}% (${speed.toFixed(1)} KB/s)  `);
        lastProgressUpdate = Date.now();
      }
    }

    if (showProgress) {
      process.stdout.write("\r" + " ".repeat(50) + "\r");
    }
  } finally {
    fileStream.end();
    await new Promise<void>((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });
  }
}

function computeSha256(path: string): string {
  const data = readFileSync(path);
  return createHash("sha256").update(data).digest("hex");
}

async function fetchChecksumForAsset(
  release: GithubRelease,
  assetName: string
): Promise<string | null> {
  const sumsAsset = release.assets.find((asset) => asset.name === "SHA256SUMS.txt");
  if (sumsAsset) {
    const response = await fetchWithTimeout(sumsAsset.browser_download_url, {
      headers: { "User-Agent": `jfp-cli/${version}` },
    });
    if (response.ok) {
      const text = await response.text();
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [hash, file] = trimmed.split(/\s+/, 2);
        if (!hash || !file) continue;
        const normalized = file.replace(/^\*?/, "");
        if (normalized === assetName) {
          return hash.toLowerCase();
        }
      }
    }
  }

  const directAsset = release.assets.find((asset) => asset.name === `${assetName}.sha256`);
  if (directAsset) {
    const response = await fetchWithTimeout(directAsset.browser_download_url, {
      headers: { "User-Agent": `jfp-cli/${version}` },
    });
    if (response.ok) {
      const text = await response.text();
      const [hash] = text.trim().split(/\s+/, 1);
      return hash ? hash.toLowerCase() : null;
    }
  }

  return null;
}

function recordUpdateCheck(
  configUpdates: { autoCheck: boolean; autoUpdate: boolean; channel: "stable" | "beta"; lastCheck: string | null; latestKnownVersion?: string | null },
  latestVersion?: string
) {
  const next = {
    ...configUpdates,
    lastCheck: new Date().toISOString(),
    latestKnownVersion: latestVersion ?? configUpdates.latestKnownVersion,
  };
  saveConfig({ updates: next });
}

function getCurrentBinaryPath(): string {
  const execPath = process.execPath;
  const basename = execPath.split(/[/\\]/).pop() || "";

  // Check if running via bun or node runtime (not compiled)
  if (/^(bun|node)(\.\w+)?$/i.test(basename)) {
    throw new Error(
      "Self-update is only available for compiled binaries.\n" +
        "When running via bun/node, update by pulling the latest code and rebuilding."
    );
  }

  return execPath;
}

async function verifyBinary(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(path, ["--version"], {
      stdio: "pipe",
    });

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, 5000);

    let output = "";
    child.stdout?.on("data", (data) => {
      output += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      const trimmed = output.trim();
      const hasSemver = /\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b/.test(trimmed);
      resolve(
        !timedOut &&
          code === 0 &&
          trimmed.length > 0 &&
          (hasSemver || trimmed.toLowerCase().includes("jfp"))
      );
    });

    child.on("error", () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

async function replaceBinary(
  currentPath: string,
  newPath: string
): Promise<{ success: boolean; error?: string }> {
  const backupPath = `${currentPath}.bak`;

  try {
    if (existsSync(backupPath)) {
      try {
        renameSync(backupPath, `${backupPath}.prev-${Date.now()}`);
      } catch {
        // best effort
      }
    }

    if (existsSync(currentPath)) {
      renameSync(currentPath, backupPath);
    }

    renameSync(newPath, currentPath);

    if (process.platform !== "win32") {
      chmodSync(currentPath, 0o755);
    }

    const works = await verifyBinary(currentPath);
    if (!works) {
      if (existsSync(backupPath)) {
        renameSync(backupPath, currentPath);
      }
      return { success: false, error: "New binary failed verification, rolled back" };
    }

    return { success: true };
  } catch (err) {
    try {
      if (existsSync(backupPath)) {
        renameSync(backupPath, currentPath);
      }
    } catch {
      // Rollback failed
    }

    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function updateCliCommand(options: UpdateCliOptions = {}) {
  const jsonOutput = shouldOutputJson(options);
  const config = loadConfig();
  let tempPath: string | null = null;
  const result: UpdateResult = {
    currentVersion: version,
    latestVersion: "",
    hasUpdate: false,
    message: "",
  };

  try {
    if (!jsonOutput) {
      console.log(chalk.dim("Checking for updates..."));
    }

    const release = await fetchLatestRelease();
    recordUpdateCheck(config.updates, release.tag_name.replace(/^v/, ""));

    result.latestVersion = release.tag_name.replace(/^v/, "");
    const comparison = compareVersions(version, result.latestVersion);
    result.hasUpdate = comparison < 0;

    if (comparison === 0 && !options.force) {
      result.message = `You are running the latest version (${version})`;
      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green("✓ " + result.message));
      }
      return;
    }

    if (comparison > 0) {
      result.message = `You are running a newer version (${version}) than the latest release (${result.latestVersion})`;
      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.yellow("! " + result.message));
      }
      return;
    }

    result.message = comparison === 0
      ? `Reinstalling current version (${version})`
      : `Update available: ${version} -> ${result.latestVersion}`;

    const binaryName = getBinaryName();
    const asset = release.assets.find((a) => a.name === binaryName);

    if (!asset) {
      result.error = `No binary found for ${process.platform}-${process.arch}`;
      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.yellow("! Update available: " + version + " -> " + result.latestVersion));
        console.log(chalk.red("x " + result.error));
        console.log(chalk.dim("Available assets: " + release.assets.map((a) => a.name).join(", ")));
      }
      return;
    }

    result.downloadUrl = asset.browser_download_url;
    result.assetName = asset.name;

    if (options.check) {
      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.yellow("! " + result.message));
        console.log(chalk.dim("Run 'jfp update-cli' to update"));
      }
      return;
    }

    if (!jsonOutput) {
      console.log(chalk.yellow("! " + result.message));
      if (!config.updates.autoUpdate) {
        console.log(chalk.dim("Auto-update is disabled in config; running manual update."));
      }
    }

    let currentPath: string;
    try {
      currentPath = getCurrentBinaryPath();
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.red("x " + result.error));
      }
      return;
    }

    // Use random suffix to prevent predictable temp file attacks (TOCTOU mitigation)
    const randomSuffix = randomBytes(8).toString("hex");
    tempPath = `${currentPath}.update-${randomSuffix}`;
    if (!jsonOutput) {
      console.log(chalk.dim("Downloading " + asset.name + "..."));
    }

    await downloadFile(asset.browser_download_url, tempPath, asset.size);

    // Verify checksum (required)
    const expectedHash = await fetchChecksumForAsset(release, asset.name);
    if (!expectedHash) {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
      throw new Error("Checksum file not found. Refusing to update without verification.");
    }

    const actualHash = computeSha256(tempPath);
    if (actualHash !== expectedHash) {
      // Clean up temp file before throwing
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
      throw new Error(
        `Checksum verification failed.\nExpected: ${expectedHash.slice(0, 16)}...\nGot: ${actualHash.slice(0, 16)}...`
      );
    }
    if (!jsonOutput) {
      console.log(chalk.dim("Checksum verified ✓"));
    }

    if (!jsonOutput) {
      console.log(chalk.dim("Installing update..."));
    }

    const replaceResult = await replaceBinary(currentPath, tempPath);

    if (!replaceResult.success) {
      result.error = replaceResult.error || "Update failed";
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.red("x " + result.error));
      }
      return;
    }

    result.message = `Successfully updated to ${result.latestVersion}`;
    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green("✓ " + result.message));
      console.log(chalk.dim("Restart jfp to use the new version"));
    }
  } catch (err) {
    if (tempPath && existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch {
        // best effort cleanup
      }
    }
    result.error = err instanceof Error ? err.message : String(err);
    if (jsonOutput) {
      console.log(JSON.stringify({ ...result, error: result.error }, null, 2));
    } else {
      console.log(chalk.red("x Update check failed: " + result.error));
    }
    process.exit(1);
  }
}
