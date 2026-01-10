// Skills manifest management for tracking installed JFP skills

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { SkillManifest, SkillManifestEntry } from "@jeffreysprompts/core/export";
import { computeSkillHash } from "@jeffreysprompts/core/export";

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
 * Read manifest from a skills directory
 * Returns null if manifest doesn't exist
 */
export function readManifest(skillsDir: string): FullSkillManifest | null {
  const manifestPath = getManifestPath(skillsDir);
  if (!existsSync(manifestPath)) {
    return null;
  }
  try {
    const raw = readFileSync(manifestPath, "utf-8");
    return JSON.parse(raw) as FullSkillManifest;
  } catch {
    return null;
  }
}

/**
 * Write manifest to a skills directory
 */
export function writeManifest(skillsDir: string, manifest: FullSkillManifest): void {
  mkdirSync(skillsDir, { recursive: true });
  const manifestPath = getManifestPath(skillsDir);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
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
  const skillDir = join(skillsDir, id);
  const skillMdPath = join(skillDir, "SKILL.md");
  const exists = existsSync(skillMdPath);
  const isGenerated = exists ? isJfpGenerated(skillMdPath) : false;
  const manifestEntry = findManifestEntry(manifest, id);
  const currentHash = exists ? computeFileHash(skillMdPath) : null;

  // Determine if modified
  let wasModified = false;
  if (exists && manifestEntry && currentHash) {
    wasModified = manifestEntry.hash !== currentHash;
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
