/**
 * Unit tests for useMousePosition hook
 * Tests mouse position tracking and motion value updates.
 */

import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useMousePosition } from "./useMousePosition";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useMousePosition", () => {
  it("returns all expected properties", () => {
    const { result } = renderHook(() => useMousePosition());
    expect(result.current.positionRef).toBeDefined();
    expect(result.current.motionPercentageX).toBeDefined();
    expect(result.current.motionPercentageY).toBeDefined();
    expect(result.current.handleMouseMove).toBeInstanceOf(Function);
    expect(result.current.resetMousePosition).toBeInstanceOf(Function);
  });

  it("initializes position at center (50%, 50%)", () => {
    const { result } = renderHook(() => useMousePosition());
    expect(result.current.positionRef.current.percentageX).toBe(50);
    expect(result.current.positionRef.current.percentageY).toBe(50);
  });

  it("initializes motion values at 50", () => {
    const { result } = renderHook(() => useMousePosition());
    expect(result.current.motionPercentageX.get()).toBe(50);
    expect(result.current.motionPercentageY.get()).toBe(50);
  });

  it("updates position on mouse move", () => {
    const { result } = renderHook(() => useMousePosition());

    const mockEvent = {
      clientX: 150,
      clientY: 75,
      currentTarget: {
        getBoundingClientRect: () => ({
          left: 100,
          top: 50,
          width: 200,
          height: 100,
        }),
      },
    } as unknown as React.MouseEvent<HTMLElement>;

    act(() => {
      result.current.handleMouseMove(mockEvent);
    });

    // x = 150 - 100 = 50, percentageX = (50/200) * 100 = 25
    expect(result.current.positionRef.current.x).toBe(50);
    expect(result.current.positionRef.current.percentageX).toBe(25);

    // y = 75 - 50 = 25, percentageY = (25/100) * 100 = 25
    expect(result.current.positionRef.current.y).toBe(25);
    expect(result.current.positionRef.current.percentageY).toBe(25);
  });

  it("updates motion values on mouse move", () => {
    const { result } = renderHook(() => useMousePosition());

    const mockEvent = {
      clientX: 200,
      clientY: 100,
      currentTarget: {
        getBoundingClientRect: () => ({
          left: 100,
          top: 50,
          width: 200,
          height: 100,
        }),
      },
    } as unknown as React.MouseEvent<HTMLElement>;

    act(() => {
      result.current.handleMouseMove(mockEvent);
    });

    // x = 200 - 100 = 100, percentageX = (100/200) * 100 = 50
    expect(result.current.motionPercentageX.get()).toBe(50);
    // y = 100 - 50 = 50, percentageY = (50/100) * 100 = 50
    expect(result.current.motionPercentageY.get()).toBe(50);
  });

  it("resets position to center", () => {
    const { result } = renderHook(() => useMousePosition());

    // Move mouse first
    const mockEvent = {
      clientX: 200,
      clientY: 100,
      currentTarget: {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 400,
          height: 200,
        }),
      },
    } as unknown as React.MouseEvent<HTMLElement>;

    act(() => {
      result.current.handleMouseMove(mockEvent);
    });

    // Position should be updated
    expect(result.current.positionRef.current.x).toBe(200);

    // Reset
    act(() => {
      result.current.resetMousePosition();
    });

    expect(result.current.positionRef.current.x).toBe(0);
    expect(result.current.positionRef.current.y).toBe(0);
    expect(result.current.positionRef.current.percentageX).toBe(50);
    expect(result.current.positionRef.current.percentageY).toBe(50);
    expect(result.current.motionPercentageX.get()).toBe(50);
    expect(result.current.motionPercentageY.get()).toBe(50);
  });

  it("returns stable function references", () => {
    const { result, rerender } = renderHook(() => useMousePosition());
    const firstHandleMove = result.current.handleMouseMove;
    const firstReset = result.current.resetMousePosition;

    rerender();

    expect(result.current.handleMouseMove).toBe(firstHandleMove);
    expect(result.current.resetMousePosition).toBe(firstReset);
  });
});
