import { resolve, sep, relative, dirname } from "path";
import { writeFileSync, renameSync, mkdirSync, unlinkSync, existsSync } from "fs";
import { writeFile, rename, mkdir, unlink } from "fs/promises";
import { randomBytes } from "crypto";

// Allow lowercase alphanumeric and hyphens, but must start/end with alphanumeric
// This prevents "-flag" or empty strings or "--"
const SAFE_SKILL_ID = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function shouldOutputJson(options: { json?: boolean }): boolean {
  return options.json === true || !process.stdout.isTTY;
}

/**
 * Write a complete payload before the caller returns or exits.
 * Bun's native console.log can drop bytes when a nonblocking pipe is full.
 */
export function writeStdout(content: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const stdout = process.stdout;
    const onError = (error: Error) => reject(error);
    stdout.once("error", onError);

    try {
      stdout.write(content, (error) => {
        if (error) {
          // The callback precedes the stream's error event. Keep the listener
          // until that event so a failed write also rejects cleanly.
          reject(error);
        } else {
          stdout.removeListener("error", onError);
          resolve();
        }
      });
    } catch (error) {
      stdout.removeListener("error", onError);
      reject(error);
    }
  });
}

export function writeJsonStdout(payload: unknown, pretty = false): Promise<void> {
  const serialized = pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  return writeStdout(serialized + "\n");
}

export function isSafeSkillId(id: string): boolean {
  return SAFE_SKILL_ID.test(id);
}

export function resolveSafeChildPath(root: string, child: string): string {
  const resolvedRoot = resolve(root);
  const resolvedChild = resolve(resolvedRoot, child);
  // Use path.relative to verify child is strictly under root.
  // Check for ".." (exact) or "../" prefix to avoid false positives on filenames like "..config".
  const rel = relative(resolvedRoot, resolvedChild);
  if (!rel || rel === ".." || rel.startsWith(".." + sep) || rel.startsWith(sep)) {
    throw new Error(`Unsafe path: ${child}`);
  }
  return resolvedChild;
}

export function exitWithDeprecatedSkillCommand(
  options: { json?: boolean },
  message: string,
  code = "deprecated_command"
): never {
  if (shouldOutputJson(options)) {
    console.log(JSON.stringify({ error: true, code, message }));
  } else {
    console.error(message);
  }
  process.exit(1);
}

/**
 * Write to file atomically using temp file + rename pattern (Synchronous)
 * Prevents corruption if process crashes mid-write.
 */
export function atomicWriteFileSync(path: string, content: string | NodeJS.ArrayBufferView, options?: { mode?: number }): void {
  mkdirSync(dirname(path), { recursive: true });
  const suffix = randomBytes(8).toString("hex");
  const tempPath = `${path}.${suffix}.tmp`;

  try {
    writeFileSync(tempPath, content, options);
    renameSync(tempPath, path);
  } catch (err) {
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}

/**
 * Write to file atomically using temp file + rename pattern (Asynchronous)
 * Prevents corruption if process crashes mid-write.
 */
export async function atomicWriteFile(path: string, content: string | NodeJS.ArrayBufferView, options?: { mode?: number }): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const suffix = randomBytes(8).toString("hex");
  const tempPath = `${path}.${suffix}.tmp`;

  try {
    await writeFile(tempPath, content, options);
    await rename(tempPath, path);
  } catch (err) {
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw err;
  }
}
