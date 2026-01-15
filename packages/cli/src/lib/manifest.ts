// Skills manifest management for tracking installed JFP skills

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from "fs";
import { join, dirname, resolve, sep } from "path";
import { randomBytes } from "crypto";
import type { SkillManifest, SkillManifestEntry } from "@jeffreysprompts/core/export";
import { computeSkillHash } from "@jeffreysprompts/core/export";

/**
 * Safely resolve a child path within a root directory.
 * Throws if the resolved path escapes the root.
 * Defense-in-depth against path traversal.
 */
function safePath(root: string, child: string): string {
  const resolvedRoot = resolve(root);
  const resolvedChild = resolve(resolvedRoot, child);
  if (!resolvedChild.startsWith(resolvedRoot + sep)) {
    throw new Error(`Unsafe path: ${child}`);
  }
  return resolvedChild;
}

const MANIFEST_FILENAME = "manifest.json";

/**
 * Extended manifest with generation timestamp
 */
export interface FullSkillManifest extends SkillManifest {
  generatedAt: string;
  jfpVersion: string;
}

/**
 * Result of checking if a skill was modified by user
 */
export interface SkillModificationCheck {
  id: string;
  exists: boolean;
  isJfpGenerated: boolean;
  manifestEntry: SkillManifestEntry | null;
  currentHash: string | null;
  wasModified: boolean;
  canOverwrite: boolean;
}

/**
 * Get the path to manifest.json in a skills directory
 */
export function getManifestPath(skillsDir: string): string {
  return join(skillsDir, MANIFEST_FILENAME);
}

/**
 * Validate manifest structure at runtime
 * Returns the manifest if valid, null if invalid
 */
function validateManifest(data: unknown): FullSkillManifest | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const obj = data as Record<string, unknown>;

  // Required fields
  if (typeof obj.generatedAt !== "string") return null;
  if (typeof obj.jfpVersion !== "string") return null;
  if (!Array.isArray(obj.entries)) return null;

  // Validate each entry has required fields
  for (const entry of obj.entries) {
    if (typeof entry !== "object" || entry === null) return null;
    const e = entry as Record<string, unknown>;
    if (typeof e.id !== "string") return null;
    if (typeof e.kind !== "string") return null;
    if (typeof e.version !== "string") return null;
    if (typeof e.hash !== "string") return null;
    if (typeof e.updatedAt !== "string") return null;
  }

  return data as FullSkillManifest;
}

/**
 * Read manifest from a skills directory
 * Returns null if manifest doesn't exist or is invalid
 */
export function readManifest(skillsDir: string): FullSkillManifest | null {
  const manifestPath = getManifestPath(skillsDir);
  if (!existsSync(manifestPath)) {
    return null;
  }
  try {
    const raw = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(raw);
    return validateManifest(parsed);
  } catch {
    return null;
  }
}

/**
 * Write manifest to a skills directory
 * Uses atomic write (temp file + rename) to prevent corruption on crash
 */
export function writeManifest(skillsDir: string, manifest: FullSkillManifest): void {
  mkdirSync(skillsDir, { recursive: true });
  const manifestPath = getManifestPath(skillsDir);
  const suffix = randomBytes(8).toString("hex");
  const tempPath = `${manifestPath}.${suffix}.tmp`;
  const content = JSON.stringify(manifest, null, 2);

  try {
    writeFileSync(tempPath, content);
    renameSync(tempPath, manifestPath);
  } catch (err) {
    // Clean up temp file on failure
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
 * Create a new empty manifest
 */
export function createEmptyManifest(jfpVersion: string = "1.0.0"): FullSkillManifest {
  return {
    generatedAt: new Date().toISOString(),
    jfpVersion,
    entries: [],
  };
}

/**
 * Find a manifest entry by skill ID
 */
export function findManifestEntry(
  manifest: FullSkillManifest | null,
  id: string
): SkillManifestEntry | null {
  return manifest?.entries.find((e) => e.id === id) ?? null;
}

/**
 * Add or update a manifest entry
 */
export function upsertManifestEntry(
  manifest: FullSkillManifest,
  entry: SkillManifestEntry
): FullSkillManifest {
  const existingIndex = manifest.entries.findIndex((e) => e.id === entry.id);
  const newEntries = [...manifest.entries];

  if (existingIndex >= 0) {
    newEntries[existingIndex] = entry;
  } else {
    newEntries.push(entry);
  }

  return {
    ...manifest,
    generatedAt: new Date().toISOString(),
    entries: newEntries,
  };
}

/**
 * Remove a manifest entry by ID
 */
export function removeManifestEntry(
  manifest: FullSkillManifest,
  id: string
): FullSkillManifest {
  return {
    ...manifest,
    generatedAt: new Date().toISOString(),
    entries: manifest.entries.filter((e) => e.id !== id),
  };
}

/**
 * Check if a SKILL.md file has x_jfp_generated: true in its frontmatter
 */
export function isJfpGenerated(skillMdPath: string): boolean {
  if (!existsSync(skillMdPath)) {
    return false;
  }
  try {
    const content = readFileSync(skillMdPath, "utf-8");
    // Check for x_jfp_generated: true in YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return false;
    }
    const frontmatter = frontmatterMatch[1];
    return /x_jfp_generated:\s*true/i.test(frontmatter);
  } catch {
    return false;
  }
}

/**
 * Compute the hash of an existing SKILL.md file
 */
export function computeFileHash(skillMdPath: string): string | null {
  if (!existsSync(skillMdPath)) {
    return null;
  }
  try {
    const content = readFileSync(skillMdPath, "utf-8");
    return computeSkillHash(content);
  } catch {
    return null;
  }
}

/**
 * Check if a skill was modified by the user (hash mismatch)
 */
export function checkSkillModification(
  skillsDir: string,
  id: string,
  manifest: FullSkillManifest | null
): SkillModificationCheck {
  // Defense-in-depth: validate the ID doesn't escape the skills directory
  let skillDir: string;
  try {
    skillDir = safePath(skillsDir, id);
  } catch {
    // Invalid ID - return as non-existent/non-modifiable
    return {
      id,
      exists: false,
      isJfpGenerated: false,
      manifestEntry: null,
      currentHash: null,
      wasModified: false,
      canOverwrite: false,
    };
  }
  const skillMdPath = join(skillDir, "SKILL.md");
  const exists = existsSync(skillMdPath);
  const isGenerated = exists ? isJfpGenerated(skillMdPath) : false;
  const manifestEntry = findManifestEntry(manifest, id);
  const currentHash = exists ? computeFileHash(skillMdPath) : null;

  // Determine if modified
  let wasModified = false;
  if (exists) {
    if (manifestEntry && currentHash) {
      wasModified = manifestEntry.hash !== currentHash;
    } else {
      // File exists but no manifest entry (orphaned) - treat as modified/unsafe
      // to prevent accidental overwrite of user changes we can't verify.
      wasModified = true;
    }
  }

  // Can overwrite if:
  // - File doesn't exist, OR
  // - File is JFP-generated AND not modified
  const canOverwrite = !exists || (isGenerated && !wasModified);

  return {
    id,
    exists,
    isJfpGenerated: isGenerated,
    manifestEntry,
    currentHash,
    wasModified,
    canOverwrite,
  };
}

/**
 * List all installed skills from a manifest
 */
export function listInstalledSkills(
  skillsDir: string
): Array<{ id: string; kind: string; version: string; location: string }> {
  const manifest = readManifest(skillsDir);
  if (!manifest) {
    return [];
  }

  return manifest.entries.map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    version: entry.version,
    location: skillsDir,
  }));
}

/**
 * Get all installed skills from both personal and project directories
 */
export function getAllInstalledSkills(
  personalDir: string,
  projectDir: string
): Array<{ id: string; kind: string; version: string; location: "personal" | "project" }> {
  const personal = listInstalledSkills(personalDir).map((s) => ({
    ...s,
    location: "personal" as const,
  }));

  const project = listInstalledSkills(projectDir).map((s) => ({
    ...s,
    location: "project" as const,
  }));

  return [...personal, ...project];
}
