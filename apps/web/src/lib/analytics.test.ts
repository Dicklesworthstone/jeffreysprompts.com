/**
 * Tests for analytics.ts — event tracking utilities
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { trackEvent, trackGaEvent, trackPageView } from "./analytics";

describe("analytics", () => {

  beforeEach(() => {
    // Reset window mocks
    (globalThis as unknown as Record<string, unknown>).window = globalThis;
    delete (window as unknown as Record<string, unknown>).plausible;
    delete (window as unknown as Record<string, unknown>).gtag;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("trackEvent", () => {
    it("calls plausible when available", () => {
      const plausible = vi.fn();
      (window as unknown as Record<string, unknown>).plausible = plausible;

      trackEvent("prompt_copy", { id: "p1" });

      expect(plausible).toHaveBeenCalledWith("prompt_copy", {
        props: { id: "p1" },
      });
    });

    it("does not throw when plausible is unavailable", () => {
      expect(() => trackEvent("prompt_view")).not.toThrow();
    });

    it("strips undefined props", () => {
      const plausible = vi.fn();
      (window as unknown as Record<string, unknown>).plausible = plausible;

      trackEvent("search", { query: "test", filter: undefined });

      expect(plausible).toHaveBeenCalledWith("search", {
        props: { query: "test" },
      });
    });

    it("passes undefined props when all values are undefined", () => {
      const plausible = vi.fn();
      (window as unknown as Record<string, unknown>).plausible = plausible;

      trackEvent("search", { filter: undefined });

      expect(plausible).toHaveBeenCalledWith("search", {
        props: undefined,
      });
    });
  });

  describe("trackGaEvent", () => {
    it("does not throw without GA ID", () => {
      expect(() => trackGaEvent("page_view")).not.toThrow();
    });

    it("does not throw without gtag function", () => {
      expect(() => trackGaEvent("page_view")).not.toThrow();
    });
  });

  describe("trackPageView", () => {
    it("does not throw without GA", () => {
      expect(() => trackPageView("/about")).not.toThrow();
    });
  });
});
