/**
 * Tests for theme.ts — pure theme utility functions (no hooks)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getStoredThemePreference,
  getSystemThemePreference,
  getPreferredTheme,
  applyThemeClass,
  setThemePreference,
  toggleThemePreference,
} from "./theme";

describe("theme", () => {
  let origLocalStorage: Storage;

  beforeEach(() => {
    origLocalStorage = globalThis.localStorage;
    // Ensure clean state
    try {
      localStorage.removeItem("theme");
    } catch {
      // ignore
    }
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    try {
      localStorage.removeItem("theme");
    } catch {
      // ignore
    }
    document.documentElement.classList.remove("dark");
  });

  describe("getStoredThemePreference", () => {
    it("returns null when nothing stored", () => {
      expect(getStoredThemePreference()).toBeNull();
    });

    it("returns 'dark' when stored", () => {
      localStorage.setItem("theme", "dark");
      expect(getStoredThemePreference()).toBe("dark");
    });

    it("returns 'light' when stored", () => {
      localStorage.setItem("theme", "light");
      expect(getStoredThemePreference()).toBe("light");
    });

    it("returns null for invalid stored value", () => {
      localStorage.setItem("theme", "blue");
      expect(getStoredThemePreference()).toBeNull();
    });
  });

  describe("getSystemThemePreference", () => {
    it("returns light or dark", () => {
      const result = getSystemThemePreference();
      expect(["light", "dark"]).toContain(result);
    });
  });

  describe("getPreferredTheme", () => {
    it("uses stored preference when available", () => {
      localStorage.setItem("theme", "dark");
      expect(getPreferredTheme()).toBe("dark");
    });

    it("falls back to system preference", () => {
      const result = getPreferredTheme();
      expect(["light", "dark"]).toContain(result);
    });
  });

  describe("applyThemeClass", () => {
    it("adds dark class for dark theme", () => {
      applyThemeClass("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes dark class for light theme", () => {
      document.documentElement.classList.add("dark");
      applyThemeClass("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("setThemePreference", () => {
    it("stores preference and applies class", () => {
      setThemePreference("dark");
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("stores light preference", () => {
      setThemePreference("light");
      expect(localStorage.getItem("theme")).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("toggleThemePreference", () => {
    it("toggles from light to dark", () => {
      document.documentElement.classList.remove("dark");
      const next = toggleThemePreference();
      expect(next).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("toggles from dark to light", () => {
      document.documentElement.classList.add("dark");
      const next = toggleThemePreference();
      expect(next).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });
});
