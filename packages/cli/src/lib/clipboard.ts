import { type Subprocess } from "bun";

/**
 * Copy text to clipboard using platform-specific tools.
 * Tries multiple tools in order of preference.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Try native clipboard API (if available, e.g. in browser context or supported runtime)
  // Bun doesn't have navigator.clipboard in CLI context usually, but just in case.
  if (typeof navigator !== "undefined" && "clipboard" in navigator) {
    try {
      await (navigator as Navigator & { clipboard: { writeText: (text: string) => Promise<void> } }).clipboard.writeText(text);
      return true;
    } catch {
      // Ignore and fall back to CLI tools
    }
  }

  // 2. CLI Tools via Bun.spawn
  const platform = process.platform;

  // Windows
  if (platform === "win32") {
    return trySpawn(["clip"], text);
  }

  // macOS
  if (platform === "darwin") {
    return trySpawn(["pbcopy"], text);
  }

  // Linux / Unix
  // Try wl-copy (Wayland)
  if (await trySpawn(["wl-copy"], text)) return true;
  
  // Try xclip (X11)
  if (await trySpawn(["xclip", "-selection", "clipboard"], text)) return true;
  
  // Try xsel (X11)
  if (await trySpawn(["xsel", "--clipboard", "--input"], text)) return true;

  // Try pbcopy (sometimes available on Linux via aliases/WSL)
  if (await trySpawn(["pbcopy"], text)) return true;

  return false;
}

/**
 * Helper to spawn a process and pipe text to stdin.
 * Returns true if exit code is 0.
 */
async function trySpawn(cmd: string[], input: string): Promise<boolean> {
  const TIMEOUT_MS = 2000;
  let proc: Subprocess | null = null;

  try {
    const { spawn } = await import("bun");
    proc = spawn(cmd, {
      stdin: "pipe",
      stdout: "ignore", // We don't need output
      stderr: "ignore", // Silence errors (e.g. missing tool)
    });

    if (proc.stdin && typeof proc.stdin !== "number") {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      await proc.stdin.write(data);
      await proc.stdin.end();
    }

    // Race between process exit and timeout
    const exitCode = await Promise.race([
      proc.exited,
      new Promise<number | null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);

    if (exitCode === null) {
      proc.kill(); // Kill the hung process
      return false;
    }

    return exitCode === 0;
  } catch {
    if (proc) proc.kill();
    return false;
  }
}
