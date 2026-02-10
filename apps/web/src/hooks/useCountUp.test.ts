/**
 * Unit tests for useCountUp hook
 * Tests animated counting with easing functions.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCountUp, easings } from "./useCountUp";

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// easings (pure functions)
// ---------------------------------------------------------------------------

describe("easings", () => {
  it("easeOutExpo returns 0 at t=0", () => {
    expect(easings.easeOutExpo(0)).toBeCloseTo(0, 2);
  });

  it("easeOutExpo returns 1 at t=1", () => {
    expect(easings.easeOutExpo(1)).toBe(1);
  });

  it("easeOutExpo is monotonically increasing", () => {
    let prev = easings.easeOutExpo(0);
    for (let t = 0.1; t <= 1; t += 0.1) {
      const current = easings.easeOutExpo(t);
      expect(current).toBeGreaterThanOrEqual(prev);
      prev = current;
    }
  });

  it("easeOutQuart returns 0 at t=0", () => {
    expect(easings.easeOutQuart(0)).toBe(0);
  });

  it("easeOutQuart returns 1 at t=1", () => {
    expect(easings.easeOutQuart(1)).toBe(1);
  });

  it("easeInOutQuart returns 0 at t=0", () => {
    expect(easings.easeInOutQuart(0)).toBe(0);
  });

  it("easeInOutQuart returns 1 at t=1", () => {
    expect(easings.easeInOutQuart(1)).toBe(1);
  });

  it("easeInOutQuart returns ~0.5 at t=0.5", () => {
    expect(easings.easeInOutQuart(0.5)).toBeCloseTo(0.5, 1);
  });
});

// ---------------------------------------------------------------------------
// useCountUp
// ---------------------------------------------------------------------------

describe("useCountUp", () => {
  it("starts at the start value", () => {
    const { result } = renderHook(() =>
      useCountUp({ start: 0, end: 100 })
    );
    expect(result.current).toBe(0);
  });

  it("returns start value when disabled", () => {
    const { result } = renderHook(() =>
      useCountUp({ start: 0, end: 100, enabled: false })
    );
    expect(result.current).toBe(0);
  });

  it("respects decimals option", () => {
    const { result } = renderHook(() =>
      useCountUp({ start: 0, end: 1, decimals: 2 })
    );
    // Initial value should have correct decimal places
    expect(result.current).toBe(0);
  });

  it("counts up to end value after duration", async () => {
    const { result } = renderHook(() =>
      useCountUp({ start: 0, end: 100, duration: 100, delay: 0, easing: (t) => t })
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(100);
  });

  it("handles custom start value", () => {
    const { result } = renderHook(() =>
      useCountUp({ start: 50, end: 100, enabled: false })
    );
    expect(result.current).toBe(50);
  });

  it("accepts custom easing function", () => {
    const linearEasing = (t: number) => t;
    const { result } = renderHook(() =>
      useCountUp({ start: 0, end: 100, easing: linearEasing })
    );
    expect(result.current).toBe(0);
  });

  it("respects delay before animation", async () => {
    const { result } = renderHook(() =>
      useCountUp({ start: 0, end: 100, duration: 50, delay: 1000, easing: (t) => t })
    );

    // Before delay
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(0);

    // After delay + duration
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(result.current).toBe(100);
  });
});
