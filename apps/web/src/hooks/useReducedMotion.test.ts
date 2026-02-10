/**
 * Unit tests for useReducedMotion hook
 * Tests media query-based reduced motion detection.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useReducedMotion } from "./useReducedMotion";

// ---------------------------------------------------------------------------
// matchMedia mock
// ---------------------------------------------------------------------------

let changeListeners: Array<(e: MediaQueryListEvent) => void> = [];
let matchesValue = false;

function createMockMatchMedia(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      if (event === "change") {
        changeListeners.push(listener);
      }
    }),
    removeEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      changeListeners = changeListeners.filter((l) => l !== listener);
    }),
    dispatchEvent: vi.fn(),
  }));
}

beforeEach(() => {
  changeListeners = [];
  matchesValue = false;
  window.matchMedia = createMockMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useReducedMotion", () => {
  it("returns false when user does not prefer reduced motion", () => {
    window.matchMedia = createMockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when user prefers reduced motion", () => {
    window.matchMedia = createMockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("queries the correct media query", () => {
    const mockMatchMedia = createMockMatchMedia(false);
    window.matchMedia = mockMatchMedia;
    renderHook(() => useReducedMotion());
    expect(mockMatchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  it("updates when preference changes", () => {
    window.matchMedia = createMockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      for (const listener of changeListeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });

  it("cleans up listener on unmount", () => {
    const mockMediaQueryList = {
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    window.matchMedia = vi.fn().mockReturnValue(mockMediaQueryList);

    const { unmount } = renderHook(() => useReducedMotion());
    unmount();

    expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });
});
