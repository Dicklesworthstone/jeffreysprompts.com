#!/usr/bin/env bun
/**
 * Merge coverage reports from web (Vitest) and CLI (Bun) into a combined report.
 *
 * LCOV files are simple text formats that can be concatenated. Since web and CLI
 * packages have non-overlapping source files, we just combine the LCOV data.
 *
 * Usage:
 *   bun run scripts/merge-coverage.ts
 *
 * Outputs:
 *   coverage/combined/lcov.info - merged LCOV data
 *   coverage/combined/summary.txt - text summary
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(import.meta.dir, "..");
const OUTPUT_DIR = join(ROOT, "coverage", "combined");
const COVERAGE_THRESHOLDS = {
  lines: 50,
  functions: 50,
  branches: 50,
};

interface CoverageSource {
  name: string;
  lcovPath: string;
}

const SOURCES: CoverageSource[] = [
  { name: "web", lcovPath: join(ROOT, "apps/web/coverage/lcov.info") },
  { name: "cli", lcovPath: join(ROOT, "coverage/cli/lcov.info") },
];

interface CoverageSummary {
  source: string;
  exists: boolean;
  lines: { found: number; hit: number };
  functions: { found: number; hit: number };
  branches: { found: number; hit: number };
}

/**
 * Parse basic coverage stats from LCOV content
 */
function parseLcovStats(content: string): { lines: { found: number; hit: number }; functions: { found: number; hit: number }; branches: { found: number; hit: number } } {
  const stats = {
    lines: { found: 0, hit: 0 },
    functions: { found: 0, hit: 0 },
    branches: { found: 0, hit: 0 },
  };

  for (const line of content.split("\n")) {
    if (line.startsWith("LF:")) {
      stats.lines.found += parseInt(line.slice(3), 10);
    } else if (line.startsWith("LH:")) {
      stats.lines.hit += parseInt(line.slice(3), 10);
    } else if (line.startsWith("FNF:")) {
      stats.functions.found += parseInt(line.slice(4), 10);
    } else if (line.startsWith("FNH:")) {
      stats.functions.hit += parseInt(line.slice(4), 10);
    } else if (line.startsWith("BRF:")) {
      stats.branches.found += parseInt(line.slice(4), 10);
    } else if (line.startsWith("BRH:")) {
      stats.branches.hit += parseInt(line.slice(4), 10);
    }
  }

  return stats;
}

function formatPercent(hit: number, found: number): string {
  if (found === 0) return "N/A";
  const pct = (hit / found) * 100;
  return `${pct.toFixed(1)}%`;
}

function calcPercent(hit: number, found: number): number {
  if (found === 0) return 0;
  return (hit / found) * 100;
}

function main(): void {
  const summaries: CoverageSummary[] = [];
  const lcovContents: string[] = [];

  console.log("Merging coverage reports...\n");

  for (const source of SOURCES) {
    const exists = existsSync(source.lcovPath);
    if (exists) {
      const content = readFileSync(source.lcovPath, "utf-8");
      lcovContents.push(content);
      const stats = parseLcovStats(content);
      summaries.push({ source: source.name, exists: true, ...stats });
      console.log(`  [OK] ${source.name}: ${source.lcovPath}`);
    } else {
      summaries.push({
        source: source.name,
        exists: false,
        lines: { found: 0, hit: 0 },
        functions: { found: 0, hit: 0 },
        branches: { found: 0, hit: 0 },
      });
      console.log(`  [--] ${source.name}: not found (run tests first)`);
    }
  }

  if (lcovContents.length === 0) {
    console.error("\nNo coverage data found. Run tests with coverage first:");
    console.error("  bun run test:coverage");
    console.error("  bun run test:cli:coverage");
    process.exit(1);
  }

  // Create output directory
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Merge LCOV files (simple concatenation works for non-overlapping sources)
  const mergedLcov = lcovContents.join("\n");
  const lcovOutputPath = join(OUTPUT_DIR, "lcov.info");
  writeFileSync(lcovOutputPath, mergedLcov);

  // Calculate totals
  const totals = {
    lines: { found: 0, hit: 0 },
    functions: { found: 0, hit: 0 },
    branches: { found: 0, hit: 0 },
  };

  for (const s of summaries) {
    if (s.exists) {
      totals.lines.found += s.lines.found;
      totals.lines.hit += s.lines.hit;
      totals.functions.found += s.functions.found;
      totals.functions.hit += s.functions.hit;
      totals.branches.found += s.branches.found;
      totals.branches.hit += s.branches.hit;
    }
  }

  // Generate summary text
  const summaryLines = [
    "Combined Coverage Summary",
    "=".repeat(50),
    "",
    "Per-package breakdown:",
    "",
  ];

  for (const s of summaries) {
    if (s.exists) {
      summaryLines.push(`  ${s.source}:`);
      summaryLines.push(`    Lines:     ${formatPercent(s.lines.hit, s.lines.found)} (${s.lines.hit}/${s.lines.found})`);
      summaryLines.push(`    Functions: ${formatPercent(s.functions.hit, s.functions.found)} (${s.functions.hit}/${s.functions.found})`);
      summaryLines.push(`    Branches:  ${formatPercent(s.branches.hit, s.branches.found)} (${s.branches.hit}/${s.branches.found})`);
      summaryLines.push("");
    }
  }

  summaryLines.push("-".repeat(50));
  summaryLines.push("");
  summaryLines.push("TOTAL:");
  summaryLines.push(`  Lines:     ${formatPercent(totals.lines.hit, totals.lines.found)} (${totals.lines.hit}/${totals.lines.found})`);
  summaryLines.push(`  Functions: ${formatPercent(totals.functions.hit, totals.functions.found)} (${totals.functions.hit}/${totals.functions.found})`);
  summaryLines.push(`  Branches:  ${formatPercent(totals.branches.hit, totals.branches.found)} (${totals.branches.hit}/${totals.branches.found})`);
  summaryLines.push("");

  const summaryText = summaryLines.join("\n");
  const summaryPath = join(OUTPUT_DIR, "summary.txt");
  writeFileSync(summaryPath, summaryText);

  console.log(`\nOutput written to:`);
  console.log(`  ${lcovOutputPath}`);
  console.log(`  ${summaryPath}`);
  console.log("\n" + summaryText);

  // Enforce combined coverage thresholds
  const combinedCoverage = {
    lines: calcPercent(totals.lines.hit, totals.lines.found),
    functions: calcPercent(totals.functions.hit, totals.functions.found),
    branches: calcPercent(totals.branches.hit, totals.branches.found),
  };

  const failures: string[] = [];
  for (const [key, threshold] of Object.entries(COVERAGE_THRESHOLDS)) {
    const metric = key as keyof typeof combinedCoverage;
    const value = combinedCoverage[metric];
    if (value < threshold) {
      failures.push(`${key}: ${value.toFixed(1)}% < ${threshold}%`);
    }
  }

  if (failures.length > 0) {
    console.error("\nCoverage thresholds not met:");
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }
}

main();
