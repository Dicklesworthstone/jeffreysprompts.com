/**
 * Tests for animations/hooks.ts — useStaggerDelays and useHoverState
 *
 * Note: Most hooks in this file use framer-motion's useScroll/useTransform/useSpring
 * which require a full framer-motion context. We test the pure-logic hooks only:
 * useStaggerDelays and useHoverState.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStaggerDelays, useHoverState } from "./hooks";

describe("useStaggerDelays", () => {
  it("returns empty array for count 0", () => {
    const { result } = renderHook(() => useStaggerDelays(0));
    expect(result.current).toEqual([]);
  });

  it("returns correct delays for default params", () => {
    const { result } = renderHook(() => useStaggerDelays(3));
    // baseDelay=0, staggerDelay=75: [0/1000, 75/1000, 150/1000]
    expect(result.current).toEqual([0, 0.075, 0.15]);
  });

  it("applies base delay", () => {
    const { result } = renderHook(() => useStaggerDelays(2, 100, 50));
    // [100/1000, 150/1000]
    expect(result.current).toEqual([0.1, 0.15]);
  });

  it("returns correct number of items", () => {
    const { result } = renderHook(() => useStaggerDelays(5));
    expect(result.current).toHaveLength(5);
  });

  it("is memoized — same params return same reference", () => {
    const { result, rerender } = renderHook(() => useStaggerDelays(3, 0, 75));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

describe("useHoverState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with isHovered false", () => {
    const { result } = renderHook(() => useHoverState());
    expect(result.current.isHovered).toBe(false);
  });

  it("sets isHovered true on mouse enter", () => {
    const { result } = renderHook(() => useHoverState());
    act(() => {
      result.current.hoverProps.onMouseEnter();
    });
    expect(result.current.isHovered).toBe(true);
  });

  it("sets isHovered false on mouse leave", () => {
    const { result } = renderHook(() => useHoverState());
    act(() => {
      result.current.hoverProps.onMouseEnter();
    });
    expect(result.current.isHovered).toBe(true);
    act(() => {
      result.current.hoverProps.onMouseLeave();
    });
    expect(result.current.isHovered).toBe(false);
  });

  it("respects enter delay", () => {
    const { result } = renderHook(() => useHoverState(100));
    act(() => {
      result.current.hoverProps.onMouseEnter();
    });
    // Not yet hovered — delay hasn't passed
    expect(result.current.isHovered).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.isHovered).toBe(true);
  });

  it("respects leave delay", () => {
    const { result } = renderHook(() => useHoverState(0, 100));
    act(() => {
      result.current.hoverProps.onMouseEnter();
    });
    expect(result.current.isHovered).toBe(true);

    act(() => {
      result.current.hoverProps.onMouseLeave();
    });
    // Still hovered — leave delay hasn't passed
    expect(result.current.isHovered).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.isHovered).toBe(false);
  });

  it("cancels leave timeout on re-enter", () => {
    const { result } = renderHook(() => useHoverState(0, 200));
    act(() => {
      result.current.hoverProps.onMouseEnter();
    });
    act(() => {
      result.current.hoverProps.onMouseLeave();
    });
    // Re-enter before leave delay expires
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.hoverProps.onMouseEnter();
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Should still be hovered — leave was cancelled
    expect(result.current.isHovered).toBe(true);
  });
});
