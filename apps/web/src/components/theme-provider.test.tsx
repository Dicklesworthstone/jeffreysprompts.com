/**
 * Unit tests for ThemeProvider and useTheme
 *
 * Tests theme initialization, localStorage persistence, system theme detection,
 * theme transitions, and context usage.
 *
 * @see @/components/theme-provider.tsx
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme, type Theme } from "./theme-provider";
import type { ReactNode } from "react";

// Mock matchMedia
function createMatchMediaMock(matches: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  return {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_, handler) => listeners.push(handler)),
    removeEventListener: vi.fn((_, handler) => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    dispatchEvent: vi.fn(),
    // Helper for tests to trigger change
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach((l) =>
        l({ matches: newMatches } as MediaQueryListEvent)
      );
    },
    _listeners: listeners,
  };
}

describe("ThemeProvider", () => {
  let matchMediaMock: ReturnType<typeof createMatchMediaMock>;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();

    // Reset document classes
    document.documentElement.classList.remove(
      "light",
      "dark",
      "theme-transitioning"
    );

    // Setup matchMedia mock
    matchMediaMock = createMatchMediaMock(false);
    vi.stubGlobal("matchMedia", () => matchMediaMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  describe("initialization", () => {
    it("uses default theme when no stored theme", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Default is "system"
      expect(result.current.theme).toBe("system");
    });

    it("uses custom default theme", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe("dark");
    });

    it("loads stored theme from localStorage", async () => {
      localStorage.setItem("jfp-theme", "dark");

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Wait for effect to run
      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.theme).toBe("dark");
    });

    it("ignores invalid stored theme", async () => {
      localStorage.setItem("jfp-theme", "invalid");

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      // Should keep default since stored is invalid
      expect(result.current.theme).toBe("light");
    });
  });

  describe("resolved theme", () => {
    it("resolves light theme to light", async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.resolvedTheme).toBe("light");
    });

    it("resolves dark theme to dark", async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.resolvedTheme).toBe("dark");
    });

    it("resolves system theme to light when system prefers light", async () => {
      matchMediaMock = createMatchMediaMock(false);
      vi.stubGlobal("matchMedia", () => matchMediaMock);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="system">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.resolvedTheme).toBe("light");
    });

    it("resolves system theme to dark when system prefers dark", async () => {
      matchMediaMock = createMatchMediaMock(true);
      vi.stubGlobal("matchMedia", () => matchMediaMock);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="system">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.resolvedTheme).toBe("dark");
    });
  });

  describe("setTheme", () => {
    it("updates theme state", async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");
    });

    it("persists theme to localStorage", async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.setTheme("dark");
      });

      expect(localStorage.getItem("jfp-theme")).toBe("dark");
    });

    it("can cycle through all theme values", async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.setTheme("light");
      });
      expect(result.current.theme).toBe("light");

      act(() => {
        result.current.setTheme("dark");
      });
      expect(result.current.theme).toBe("dark");

      act(() => {
        result.current.setTheme("system");
      });
      expect(result.current.theme).toBe("system");
    });
  });

  describe("document class updates", () => {
    it("adds light class for light theme", async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      );

      renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("adds dark class for dark theme", async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
      );

      renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
    });

    it("adds transition class during theme change", async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.setTheme("dark");
      });

      // Transition class should be added
      expect(
        document.documentElement.classList.contains("theme-transitioning")
      ).toBe(true);
    });

    it("removes transition class after 300ms", async () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.setTheme("dark");
      });

      // Before timeout
      expect(
        document.documentElement.classList.contains("theme-transitioning")
      ).toBe(true);

      // After 300ms timeout
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(
        document.documentElement.classList.contains("theme-transitioning")
      ).toBe(false);
    });
  });

  describe("system theme changes", () => {
    it("responds to system theme change when using system theme", async () => {
      matchMediaMock = createMatchMediaMock(false); // Start with light
      vi.stubGlobal("matchMedia", () => matchMediaMock);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="system">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.resolvedTheme).toBe("light");

      // Simulate system theme change to dark
      act(() => {
        matchMediaMock._triggerChange(true);
      });

      expect(result.current.resolvedTheme).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("does not respond to system change when using explicit theme", async () => {
      matchMediaMock = createMatchMediaMock(false);
      vi.stubGlobal("matchMedia", () => matchMediaMock);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        vi.runAllTimers();
      });

      expect(result.current.resolvedTheme).toBe("light");

      // Simulate system theme change
      act(() => {
        matchMediaMock._triggerChange(true);
      });

      // Should still be light since we're using explicit light, not system
      expect(result.current.resolvedTheme).toBe("light");
    });
  });

  describe("children rendering", () => {
    it("renders children", () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Test Child</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId("child")).toHaveTextContent("Test Child");
    });
  });
});

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    document.documentElement.classList.remove(
      "light",
      "dark",
      "theme-transitioning"
    );
    vi.stubGlobal("matchMedia", () => createMatchMediaMock(false));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("throws error when used outside ThemeProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTheme());
    }).toThrow("useTheme must be used within a ThemeProvider");

    consoleSpy.mockRestore();
  });

  it("returns theme, resolvedTheme, and setTheme", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current).toHaveProperty("theme");
    expect(result.current).toHaveProperty("resolvedTheme");
    expect(result.current).toHaveProperty("setTheme");
    expect(typeof result.current.setTheme).toBe("function");
  });

  it("provides stable setTheme reference", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result, rerender } = renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      vi.runAllTimers();
    });

    const initialSetTheme = result.current.setTheme;

    rerender();

    await act(async () => {
      vi.runAllTimers();
    });

    // setTheme should be memoized
    expect(result.current.setTheme).toBe(initialSetTheme);
  });
});
