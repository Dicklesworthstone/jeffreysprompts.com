import { resolve, sep } from "path";

const SAFE_SKILL_ID = /^[a-z0-9-]+$/;

export function shouldOutputJson(options: { json?: boolean }): boolean {
  return options.json === true || !process.stdout.isTTY;
}

export function isSafeSkillId(id: string): boolean {
  return SAFE_SKILL_ID.test(id);
}

export function resolveSafeChildPath(root: string, child: string): string {
  const resolvedRoot = resolve(root);
  const resolvedChild = resolve(resolvedRoot, child);
  if (!resolvedChild.startsWith(resolvedRoot + sep)) {
    throw new Error(`Unsafe path: ${child}`);
  }
  return resolvedChild;
}
