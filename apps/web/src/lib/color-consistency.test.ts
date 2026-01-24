/**
 * Color Palette Consistency Tests
 *
 * Ensures color consistency is maintained across the codebase.
 * These tests validate that:
 * - No zinc-* colors are used (replaced with neutral-*)
 * - Indigo-* is only used in allowlisted files (Pro features)
 * - No arbitrary text sizes like text-[11px] are used
 *
 * @module lib/color-consistency.test
 */

import { describe, test, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

// Recursively find all .tsx files in a directory
function findTsxFiles(dir: string, files: string[] = []): string[] {
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          // Skip node_modules and other non-source directories
          if (entry !== "node_modules" && entry !== "__mocks__" && entry !== "coverage") {
            findTsxFiles(fullPath, files);
          }
        } else if (entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) {
          files.push(fullPath);
        }
      } catch {
        // Skip files we can't read
      }
    }
  } catch {
    // Skip directories we can't read
  }
  return files;
}

// Get all component and page files
const srcDir = path.resolve(__dirname, "..");
const componentDir = path.join(srcDir, "components");
const appDir = path.join(srcDir, "app");

const componentFiles = findTsxFiles(componentDir);
const pageFiles = findTsxFiles(appDir);
const allFiles = [...componentFiles, ...pageFiles];

// Files explicitly allowed to use zinc (none expected after migration)
const zincAllowlist: string[] = [];

// Files allowed to use indigo (Pro features, intentional accents)
// Indigo is used as the brand accent color throughout the design system
const indigoAllowlist = [
  // Pro badge in footer - intentional branding
  "app/page.tsx",
  // Landing page sections use indigo for brand consistency
  "components/landing/",
  // Legal and help pages use indigo accents
  "components/legal/",
  "components/help/",
  "app/help/",
  "app/guidelines/",
  // Mobile components use indigo accents
  "components/mobile/",
  // UI components with indigo accents
  "components/ui/toast-enhanced.tsx",
  "components/KeyboardShortcutsModal.tsx",
  "components/CharacterReveal.tsx",
  "components/MagneticButton.tsx",
  "components/ScrollProgressBar.tsx",
  "components/TextReveal.tsx",
  "components/SwipeablePromptCard.tsx",
  "components/PullToRefresh.tsx",
  // App pages with intentional indigo accents
  "app/user/",
  "app/global-error.tsx",
  // Pro/Premium feature pages - support tickets use indigo branding
  "app/settings/",
  "app/admin/",
  "app/contact/",
  // Documentation components with indigo accents
  "components/docs/",
  // Onboarding components use indigo for brand accent
  "components/onboarding/",
];

// Files allowed to use arbitrary text sizes (for badges and compact labels)
const arbitraryTextAllowlist = [
  "components/Nav.tsx", // Badge counter needs text-[10px]
  "components/mobile/BottomTabBar.tsx", // Tab labels need text-[10px]
  "components/BottomNav.tsx", // Bottom navigation labels need text-[10px]
  "components/onboarding/", // Compact gesture hint labels need text-[10px]
  "components/history/RecentlyViewedSidebar.tsx", // Compact badge labels need text-[10px]
];

describe("Color Palette Consistency", () => {
  describe("No zinc-* colors in components", () => {
    test.each(allFiles)("should not contain zinc-* colors: %s", (filePath) => {
      const fileName = path.relative(srcDir, filePath);

      if (zincAllowlist.some((allowed) => filePath.includes(allowed))) {
        console.log(`[SKIP] ${fileName} is in zinc allowlist`);
        return;
      }

      const content = readFileSync(filePath, "utf-8");
      const zincMatches = content.match(/zinc-\d+/g) || [];

      if (zincMatches.length > 0) {
        console.log(`[FAIL] ${fileName}:`);
        console.log(`  Found zinc colors: ${[...new Set(zincMatches)].join(", ")}`);
        console.log(`  Lines:`);
        content.split("\n").forEach((line, idx) => {
          if (line.includes("zinc-")) {
            console.log(`    ${idx + 1}: ${line.trim().slice(0, 80)}`);
          }
        });
        console.log(`  Fix: Replace zinc-* with neutral-*`);
      } else {
        console.log(`[PASS] ${fileName} - no zinc colors`);
      }

      expect(zincMatches, `${fileName} contains zinc-* colors: ${zincMatches.join(", ")}`).toHaveLength(0);
    });
  });

  describe("Indigo-* only in allowed files", () => {
    test.each(allFiles)("indigo usage should be intentional: %s", (filePath) => {
      const fileName = path.relative(srcDir, filePath);
      const content = readFileSync(filePath, "utf-8");
      const indigoMatches = content.match(/indigo-\d+/g) || [];

      if (indigoMatches.length === 0) {
        console.log(`[PASS] ${fileName} - no indigo colors`);
        return;
      }

      const isAllowed = indigoAllowlist.some((allowed) => filePath.includes(allowed));

      if (!isAllowed) {
        console.log(`[FAIL] ${fileName}:`);
        console.log(`  Found indigo colors: ${[...new Set(indigoMatches)].join(", ")}`);
        console.log(`  This file is not in the indigo allowlist.`);
        console.log(`  Lines:`);
        content.split("\n").forEach((line, idx) => {
          if (line.includes("indigo-")) {
            console.log(`    ${idx + 1}: ${line.trim().slice(0, 80)}`);
          }
        });
        console.log(`  Fix: Replace indigo-* with neutral-* OR add to indigoAllowlist if intentional.`);
      } else {
        console.log(`[PASS] ${fileName} - indigo usage is allowlisted`);
      }

      expect(
        isAllowed,
        `${fileName} contains unauthorized indigo-* colors: ${indigoMatches.join(", ")}. ` +
          `Either replace with neutral-* or add to indigoAllowlist.`
      ).toBe(true);
    });
  });

  describe("Typography consistency", () => {
    test.each(allFiles)("should not use arbitrary text sizes: %s", (filePath) => {
      const fileName = path.relative(srcDir, filePath);
      const content = readFileSync(filePath, "utf-8");
      const arbitraryTextMatches = content.match(/text-\[\d+px\]/g) || [];

      if (arbitraryTextMatches.length === 0) {
        console.log(`[PASS] ${fileName} - no arbitrary text sizes`);
        return;
      }

      const isAllowed = arbitraryTextAllowlist.some((allowed) => filePath.includes(allowed));

      if (!isAllowed) {
        console.log(`[FAIL] ${fileName}:`);
        console.log(`  Found arbitrary text sizes: ${[...new Set(arbitraryTextMatches)].join(", ")}`);
        console.log(`  Use standard sizes: text-xs (12px), text-sm (14px), text-base (16px)`);
        console.log(`  Lines:`);
        content.split("\n").forEach((line, idx) => {
          if (/text-\[\d+px\]/.test(line)) {
            console.log(`    ${idx + 1}: ${line.trim().slice(0, 80)}`);
          }
        });
      } else {
        console.log(`[PASS] ${fileName} - arbitrary text sizes allowlisted`);
      }

      expect(
        isAllowed || arbitraryTextMatches.length === 0,
        `${fileName} contains arbitrary text sizes: ${arbitraryTextMatches.join(", ")}. ` +
          `Use text-xs, text-sm, or text-base instead.`
      ).toBe(true);
    });
  });

  describe("Green color consistency", () => {
    test.each(allFiles)("should use emerald-* instead of green-*: %s", (filePath) => {
      const fileName = path.relative(srcDir, filePath);
      const content = readFileSync(filePath, "utf-8");
      const greenMatches = content.match(/green-\d+/g) || [];

      if (greenMatches.length > 0) {
        console.log(`[FAIL] ${fileName}:`);
        console.log(`  Found green colors: ${[...new Set(greenMatches)].join(", ")}`);
        console.log(`  Use emerald-* for success states (emerald-500, emerald-600)`);
        console.log(`  Lines:`);
        content.split("\n").forEach((line, idx) => {
          if (/green-\d+/.test(line)) {
            console.log(`    ${idx + 1}: ${line.trim().slice(0, 80)}`);
          }
        });
      } else {
        console.log(`[PASS] ${fileName} - no green colors`);
      }

      expect(
        greenMatches,
        `${fileName} contains green-* colors: ${greenMatches.join(", ")}. ` +
          `Use emerald-* for success states instead.`
      ).toHaveLength(0);
    });
  });
});

describe("Color palette summary", () => {
  test("should pass all color consistency checks", () => {
    let totalZinc = 0;
    let totalIndigo = 0;
    let totalArbitrary = 0;
    let totalGreen = 0;
    const violations: string[] = [];

    for (const filePath of allFiles) {
      const fileName = path.relative(srcDir, filePath);
      const content = readFileSync(filePath, "utf-8");

      const zincMatches = content.match(/zinc-\d+/g) || [];
      const indigoMatches = content.match(/indigo-\d+/g) || [];
      const arbitraryMatches = content.match(/text-\[\d+px\]/g) || [];
      const greenMatches = content.match(/green-\d+/g) || [];

      if (zincMatches.length > 0 && !zincAllowlist.some((a) => filePath.includes(a))) {
        totalZinc += zincMatches.length;
        violations.push(`${fileName}: ${zincMatches.length} zinc-* colors`);
      }

      if (indigoMatches.length > 0 && !indigoAllowlist.some((a) => filePath.includes(a))) {
        totalIndigo += indigoMatches.length;
        violations.push(`${fileName}: ${indigoMatches.length} unauthorized indigo-* colors`);
      }

      if (arbitraryMatches.length > 0 && !arbitraryTextAllowlist.some((a) => filePath.includes(a))) {
        totalArbitrary += arbitraryMatches.length;
        violations.push(`${fileName}: ${arbitraryMatches.length} arbitrary text sizes`);
      }

      if (greenMatches.length > 0) {
        totalGreen += greenMatches.length;
        violations.push(`${fileName}: ${greenMatches.length} green-* colors`);
      }
    }

    console.log("\n=== Color Palette Summary ===");
    console.log(`Files scanned: ${allFiles.length}`);
    console.log(`Zinc violations: ${totalZinc}`);
    console.log(`Unauthorized indigo: ${totalIndigo}`);
    console.log(`Arbitrary text sizes: ${totalArbitrary}`);
    console.log(`Green (use emerald): ${totalGreen}`);
    console.log(`Total violations: ${totalZinc + totalIndigo + totalArbitrary + totalGreen}`);

    if (violations.length > 0) {
      console.log("\nViolations:");
      violations.forEach((v) => console.log(`  - ${v}`));
    }

    const totalViolations = totalZinc + totalIndigo + totalArbitrary + totalGreen;
    expect(totalViolations, `Found ${totalViolations} color consistency violations`).toBe(0);
  });
});
