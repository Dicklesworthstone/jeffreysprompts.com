import { describe, it, expect } from "vitest";
import { scanContent } from "./content-filter";

describe("content-filter", () => {
  describe("scanContent", () => {
    it("returns no signals for clean content", () => {
      const result = scanContent("This is a perfectly normal review about a prompt.");
      expect(result.signals).toHaveLength(0);
      expect(result.urlCount).toBe(0);
    });

    it("detects a single URL", () => {
      const result = scanContent("Check out this link: https://example.com for more info.");
      expect(result.urlCount).toBe(1);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].score).toBe(0.1);
    });

    it("detects multiple URLs with increasing severity", () => {
      const result = scanContent(
        "Visit https://a.com and https://b.com and https://c.com now."
      );
      expect(result.urlCount).toBe(3);
      expect(result.signals.some((s) => s.reason === "Contains many links")).toBe(true);
    });

    it("detects excessive capitalization", () => {
      const result = scanContent(
        "THIS IS ALL CAPS AND IT SHOULD BE FLAGGED BECAUSE ITS VERY LONG"
      );
      expect(result.uppercaseRatio).toBeGreaterThan(0.5);
      expect(result.signals.some((s) => s.reason === "Excessive capitalization")).toBe(true);
    });

    it("ignores capitalization in short content", () => {
      const result = scanContent("OK FINE");
      // Short content (<=40 chars) should not trigger capitalization flag
      expect(result.signals.filter((s) => s.reason === "Excessive capitalization")).toHaveLength(0);
    });

    it("detects repeated characters", () => {
      const result = scanContent("This prompt is greaaaaaaaat!");
      expect(result.repeatedCharRuns).toBeGreaterThanOrEqual(6);
      expect(result.signals.some((s) => s.reason === "Repeated characters detected")).toBe(true);
    });

    it("does not flag normal repeated characters", () => {
      const result = scanContent("This looks good and works well.");
      expect(result.repeatedCharRuns).toBeLessThan(6);
      expect(result.signals.filter((s) => s.reason.includes("Repeated"))).toHaveLength(0);
    });

    it("detects spam terms", () => {
      const result = scanContent("Get free money by clicking this buy now button.");
      const spamSignals = result.signals.filter((s) => s.reason.includes("spam term"));
      expect(spamSignals.length).toBeGreaterThanOrEqual(2);
    });

    it("matches spam terms case-insensitively", () => {
      const result = scanContent("CLICK HERE to get started with this amazing deal.");
      expect(result.signals.some((s) => s.reason.includes("click here"))).toBe(true);
    });

    it("normalizes whitespace", () => {
      const result = scanContent("  Multiple   spaces   and   tabs  ");
      expect(result.normalized).toBe("Multiple spaces and tabs");
    });
  });
});
