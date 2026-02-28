import { Page, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Result } from "axe-core";

/**
 * Accessibility test helpers
 */

/**
 * Run axe-core audit on the current page
 * Returns violations filtered by severity
 */
export async function runAxeAudit(
  page: Page,
  options?: {
    include?: string[];
    exclude?: string[];
    tags?: string[];
    minImpact?: "minor" | "moderate" | "serious" | "critical";
  }
): Promise<{
  violations: Result[];
  allViolations: Result[];
  passes: Result[];
  incomplete: Result[];
}> {
  const { include, exclude, tags, minImpact = "serious" } = options || {};

  let builder = new AxeBuilder({ page }).withTags(
    tags || ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]
  );

  if (include) {
    for (const selector of include) {
      builder = builder.include(selector);
    }
  }

  if (exclude) {
    for (const selector of exclude) {
      builder = builder.exclude(selector);
    }
  }

  const results = await builder.analyze();

  const impactLevels = ["minor", "moderate", "serious", "critical"];
  const minImpactIndex = impactLevels.indexOf(minImpact);

  const filteredViolations = results.violations.filter((v) => {
    const violationIndex = impactLevels.indexOf(v.impact || "minor");
    return violationIndex >= minImpactIndex;
  });

  return {
    violations: filteredViolations,
    allViolations: results.violations,
    passes: results.passes,
    incomplete: results.incomplete,
  };
}

/**
 * Assert page has no critical/serious accessibility violations
 */
export async function expectNoA11yViolations(
  page: Page,
  options?: Parameters<typeof runAxeAudit>[1]
) {
  const { violations } = await runAxeAudit(page, options);

  if (violations.length > 0) {
    const summary = violations
      .map(
        (v) =>
          `[${v.impact}] ${v.id}: ${v.description}\n  ${v.nodes.map((n) => `- ${n.html.slice(0, 100)}`).join("\n  ")}`
      )
      .join("\n\n");

    console.error("Accessibility violations:\n" + summary);
  }

  expect(violations).toHaveLength(0);
}

/**
 * Check that focus is visible on the current element
 */
export async function expectFocusVisible(page: Page) {
  const hasFocusIndicator = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    if (!el) return false;

    const styles = window.getComputedStyle(el);
    const pseudoStyles = window.getComputedStyle(el, ":focus-visible");

    // Check for outline
    const hasOutline =
      styles.outlineWidth !== "0px" &&
      styles.outlineStyle !== "none" &&
      styles.outlineColor !== "transparent";

    // Check for box-shadow (common focus ring alternative)
    const hasBoxShadow =
      styles.boxShadow !== "none" && styles.boxShadow !== "";

    // Check for border change
    const hasBorder = styles.borderWidth !== "0px";

    return hasOutline || hasBoxShadow || hasBorder;
  });

  expect(hasFocusIndicator).toBe(true);
}

/**
 * Tab through elements and return the focus sequence
 */
export async function getFocusSequence(
  page: Page,
  maxSteps: number = 20
): Promise<
  Array<{
    tag: string;
    text: string;
    ariaLabel: string | null;
    rect: { top: number; left: number };
  }>
> {
  const sequence: Array<{
    tag: string;
    text: string;
    ariaLabel: string | null;
    rect: { top: number; left: number };
  }> = [];

  for (let i = 0; i < maxSteps; i++) {
    await page.keyboard.press("Tab");

    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el || el === document.body) return null;

      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        text: (el.textContent || "").trim().slice(0, 50),
        ariaLabel: el.getAttribute("aria-label"),
        rect: { top: rect.top, left: rect.left },
      };
    });

    if (info) sequence.push(info);
  }

  return sequence;
}

/**
 * Verify heading hierarchy is valid
 */
export async function checkHeadingHierarchy(
  page: Page
): Promise<{ valid: boolean; issues: string[] }> {
  const headings = await page.evaluate(() => {
    const h = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    return Array.from(h).map((el) => ({
      level: parseInt(el.tagName.slice(1)),
      text: el.textContent?.slice(0, 50) || "",
    }));
  });

  const issues: string[] = [];

  // Check for single h1
  const h1Count = headings.filter((h) => h.level === 1).length;
  if (h1Count === 0) {
    issues.push("No h1 found on page");
  } else if (h1Count > 1) {
    issues.push(`Multiple h1 elements found (${h1Count})`);
  }

  // Check for skipped levels
  let prevLevel = 0;
  for (const heading of headings) {
    if (prevLevel > 0 && heading.level > prevLevel + 1) {
      issues.push(
        `Heading level skipped: h${prevLevel} -> h${heading.level} ("${heading.text}")`
      );
    }
    prevLevel = heading.level;
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Check color contrast ratio between two colors
 */
export function getContrastRatio(
  foreground: string,
  background: string
): number {
  // Parse RGB values
  const parseColor = (color: string): [number, number, number] => {
    const match = color.match(/\d+/g);
    if (!match || match.length < 3) return [0, 0, 0];
    return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
  };

  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const [r1, g1, b1] = parseColor(foreground);
  const [r2, g2, b2] = parseColor(background);

  const l1 = getLuminance(r1, g1, b1);
  const l2 = getLuminance(r2, g2, b2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 2.1 AA contrast requirements
 */
export const WCAG_CONTRAST = {
  normalText: 4.5, // Normal text (< 18pt or < 14pt bold)
  largeText: 3, // Large text (>= 18pt or >= 14pt bold)
  uiComponents: 3, // UI components and graphics
};
