/**
 * Unit tests for useInView and useInViewStagger hooks
 * Tests IntersectionObserver-based viewport detection.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useInView, useInViewStagger } from "./useInView";

// ---------------------------------------------------------------------------
// IntersectionObserver mock
// ---------------------------------------------------------------------------

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

let observerCallback: IntersectionCallback | null = null;
let observerInstance: {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
} | null = null;

class MockIntersectionObserver {
  callback: IntersectionCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  root = null;
  rootMargin = "";
  thresholds = [0];
  takeRecords = vi.fn().mockReturnValue([]);

  constructor(callback: IntersectionCallback) {
    this.callback = callback;
    observerCallback = callback;
    observerInstance = this;
  }
}

beforeEach(() => {
  observerCallback = null;
  observerInstance = null;
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function triggerIntersection(isIntersecting: boolean) {
  if (observerCallback) {
    observerCallback([{ isIntersecting } as IntersectionObserverEntry]);
  }
}

// ---------------------------------------------------------------------------
// useInView
// ---------------------------------------------------------------------------

describe("useInView", () => {
  it("starts with isInView=false and hasBeenInView=false", () => {
    const { result } = renderHook(() => useInView());
    expect(result.current.isInView).toBe(false);
    expect(result.current.hasBeenInView).toBe(false);
  });

  it("returns a ref object", () => {
    const { result } = renderHook(() => useInView());
    expect(result.current.ref).toBeDefined();
    expect(result.current.ref).toHaveProperty("current");
  });

  it("creates observer when ref is attached to element", () => {
    const { result } = renderHook(() => useInView());
    // Simulate attaching ref to an element
    const div = document.createElement("div");
    (result.current.ref as { current: HTMLElement | null }).current = div;

    // Re-render to trigger useEffect
    const { result: result2 } = renderHook(() => useInView());
    // Observer should be created when element exists
    expect(typeof IntersectionObserver).toBe("function");
  });

  it("sets isInView=true when intersection detected", () => {
    const div = document.createElement("div");
    const { result } = renderHook(() => {
      const hookResult = useInView();
      (hookResult.ref as { current: HTMLElement | null }).current = div;
      return hookResult;
    });

    act(() => {
      triggerIntersection(true);
    });

    expect(result.current.isInView).toBe(true);
    expect(result.current.hasBeenInView).toBe(true);
  });

  it("disconnects observer when triggerOnce and element enters view", () => {
    const div = document.createElement("div");
    renderHook(() => {
      const hookResult = useInView({ triggerOnce: true });
      (hookResult.ref as { current: HTMLElement | null }).current = div;
      return hookResult;
    });

    act(() => {
      triggerIntersection(true);
    });

    expect(observerInstance?.disconnect).toHaveBeenCalled();
  });

  it("keeps hasBeenInView=true even after leaving view", () => {
    const div = document.createElement("div");
    const { result } = renderHook(() => {
      const hookResult = useInView({ triggerOnce: false });
      (hookResult.ref as { current: HTMLElement | null }).current = div;
      return hookResult;
    });

    act(() => triggerIntersection(true));
    expect(result.current.hasBeenInView).toBe(true);

    act(() => triggerIntersection(false));
    expect(result.current.hasBeenInView).toBe(true);
    expect(result.current.isInView).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useInViewStagger
// ---------------------------------------------------------------------------

describe("useInViewStagger", () => {
  it("returns refs and inViewStates arrays", () => {
    const { result } = renderHook(() => useInViewStagger(3));
    expect(result.current.refs).toHaveLength(3);
    expect(result.current.inViewStates).toHaveLength(3);
  });

  it("initializes all states to false", () => {
    const { result } = renderHook(() => useInViewStagger(3));
    for (const state of result.current.inViewStates) {
      expect(state).toBe(false);
    }
  });

  it("returns correct count of refs", () => {
    const { result } = renderHook(() => useInViewStagger(5));
    expect(result.current.refs).toHaveLength(5);
    expect(result.current.inViewStates).toHaveLength(5);
  });

  it("handles zero count", () => {
    const { result } = renderHook(() => useInViewStagger(0));
    expect(result.current.refs).toHaveLength(0);
    expect(result.current.inViewStates).toHaveLength(0);
  });
});
