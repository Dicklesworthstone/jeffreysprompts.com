/**
 * Tests for useSwipeGesture hook — touch gesture detection
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useSwipeGesture } from "./useSwipeGesture";

function createTouchEvent(type: string, x: number, y: number): React.TouchEvent {
  return {
    type,
    touches: [{ clientX: x, clientY: y }] as unknown as React.TouchList,
    preventDefault: vi.fn(),
  } as unknown as React.TouchEvent;
}

describe("useSwipeGesture", () => {
  it("returns handlers, state, and reset", () => {
    const { result } = renderHook(() => useSwipeGesture());
    expect(result.current.handlers).toBeDefined();
    expect(result.current.handlers.onTouchStart).toBeDefined();
    expect(result.current.handlers.onTouchMove).toBeDefined();
    expect(result.current.handlers.onTouchEnd).toBeDefined();
    expect(result.current.handlers.onTouchCancel).toBeDefined();
    expect(result.current.state).toBeDefined();
    expect(typeof result.current.reset).toBe("function");
  });

  it("starts with idle state", () => {
    const { result } = renderHook(() => useSwipeGesture());
    expect(result.current.state.isSwiping).toBe(false);
    expect(result.current.state.deltaX).toBe(0);
    expect(result.current.state.deltaY).toBe(0);
    expect(result.current.state.direction).toBeNull();
    expect(result.current.state.velocity).toBe(0);
  });

  it("sets isSwiping on touch start", () => {
    const onSwipeStart = vi.fn();
    const { result } = renderHook(() => useSwipeGesture({ onSwipeStart }));

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100, 200));
    });

    expect(result.current.state.isSwiping).toBe(true);
    expect(onSwipeStart).toHaveBeenCalled();
  });

  it("tracks horizontal delta during move", () => {
    const onSwipeMove = vi.fn();
    const { result } = renderHook(() => useSwipeGesture({ onSwipeMove }));

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100, 200));
    });

    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent("touchmove", 160, 200));
    });

    expect(result.current.state.deltaX).toBe(60);
    expect(result.current.state.deltaY).toBe(0); // horizontal axis default
    expect(onSwipeMove).toHaveBeenCalled();
  });

  it("detects left swipe", () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useSwipeGesture({ onSwipeLeft }, { threshold: 30 })
    );

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 200, 100));
    });

    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent("touchmove", 100, 100));
    });

    act(() => {
      result.current.handlers.onTouchEnd!();
    });

    expect(onSwipeLeft).toHaveBeenCalled();
  });

  it("detects right swipe", () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useSwipeGesture({ onSwipeRight }, { threshold: 30 })
    );

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100, 100));
    });

    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent("touchmove", 200, 100));
    });

    act(() => {
      result.current.handlers.onTouchEnd!();
    });

    expect(onSwipeRight).toHaveBeenCalled();
  });

  it("does not trigger swipe below threshold", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useSwipeGesture({ onSwipeLeft, onSwipeRight }, { threshold: 100, velocityThreshold: Infinity })
    );

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100, 100));
    });
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent("touchmove", 130, 100));
    });
    act(() => {
      result.current.handlers.onTouchEnd!();
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("fires onSwipeEnd callback", () => {
    const onSwipeEnd = vi.fn();
    const { result } = renderHook(() => useSwipeGesture({ onSwipeEnd }));

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100, 100));
    });
    act(() => {
      result.current.handlers.onTouchEnd!();
    });

    expect(onSwipeEnd).toHaveBeenCalled();
  });

  it("resets state", () => {
    const { result } = renderHook(() => useSwipeGesture());

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100, 100));
    });
    expect(result.current.state.isSwiping).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.state.isSwiping).toBe(false);
    expect(result.current.state.deltaX).toBe(0);
  });

  it("locks to vertical axis when configured", () => {
    const { result } = renderHook(() =>
      useSwipeGesture({}, { axis: "vertical" })
    );

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100, 100));
    });
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent("touchmove", 150, 200));
    });

    // Horizontal delta should be 0 with vertical axis
    expect(result.current.state.deltaX).toBe(0);
    expect(result.current.state.deltaY).toBe(100);
  });

  it("calls preventDefault when configured", () => {
    const { result } = renderHook(() =>
      useSwipeGesture({}, { preventDefault: true })
    );

    const event = createTouchEvent("touchmove", 150, 100);
    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100, 100));
    });
    act(() => {
      result.current.handlers.onTouchMove(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
  });
});
