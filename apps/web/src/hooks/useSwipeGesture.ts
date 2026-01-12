"use client";

import { useRef, useCallback, useState, useEffect } from "react";

export type SwipeDirection = "left" | "right" | "up" | "down" | null;

interface SwipeState {
  /** Whether a swipe is currently in progress */
  isSwiping: boolean;
  /** Current horizontal displacement */
  deltaX: number;
  /** Current vertical displacement */
  deltaY: number;
  /** Detected swipe direction (null if not determined) */
  direction: SwipeDirection;
  /** Swipe velocity (pixels per millisecond) */
  velocity: number;
}

interface SwipeConfig {
  /** Minimum distance to trigger a swipe (default: 50) */
  threshold?: number;
  /** Velocity threshold for quick swipes (default: 0.5) */
  velocityThreshold?: number;
  /** Lock to horizontal or vertical axis (default: horizontal) */
  axis?: "horizontal" | "vertical" | "both";
  /** Prevent default touch behavior */
  preventDefault?: boolean;
}

interface SwipeHandlers {
  onSwipeStart?: () => void;
  onSwipeMove?: (state: SwipeState) => void;
  onSwipeEnd?: (state: SwipeState) => void;
  onSwipeLeft?: (state: SwipeState) => void;
  onSwipeRight?: (state: SwipeState) => void;
  onSwipeUp?: (state: SwipeState) => void;
  onSwipeDown?: (state: SwipeState) => void;
}

/**
 * useSwipeGesture - Hook for detecting swipe gestures on touch devices.
 *
 * Features:
 * - Configurable swipe threshold and velocity
 * - Axis locking (horizontal, vertical, or both)
 * - Velocity-based dismissal
 * - Spring-back animation support via state
 *
 * @example
 * ```tsx
 * function SwipeableCard() {
 *   const { handlers, state, reset } = useSwipeGesture({
 *     onSwipeLeft: () => console.log("Swiped left!"),
 *     onSwipeRight: () => console.log("Swiped right!"),
 *   });
 *
 *   return (
 *     <div
 *       {...handlers}
 *       style={{ transform: `translateX(${state.deltaX}px)` }}
 *     >
 *       Swipe me!
 *     </div>
 *   );
 * }
 * ```
 */
export function useSwipeGesture(
  callbacks: SwipeHandlers = {},
  config: SwipeConfig = {}
) {
  const {
    threshold = 50,
    velocityThreshold = 0.5,
    axis = "horizontal",
    preventDefault = false,
  } = config;

  const [state, setState] = useState<SwipeState>({
    isSwiping: false,
    deltaX: 0,
    deltaY: 0,
    direction: null,
    velocity: 0,
  });

  const startPos = useRef({ x: 0, y: 0 });
  const startTime = useRef(0);
  const currentPos = useRef({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);

  // Cleanup animation frame on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    setState({
      isSwiping: false,
      deltaX: 0,
      deltaY: 0,
      direction: null,
      velocity: 0,
    });
  }, []);

  const calculateDirection = useCallback(
    (deltaX: number, deltaY: number): SwipeDirection => {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (axis === "horizontal" || (axis === "both" && absX > absY)) {
        if (absX < 10) return null;
        return deltaX > 0 ? "right" : "left";
      } else if (axis === "vertical" || (axis === "both" && absY > absX)) {
        if (absY < 10) return null;
        return deltaY > 0 ? "down" : "up";
      }
      return null;
    },
    [axis]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      const touch = e.touches[0];
      startPos.current = { x: touch.clientX, y: touch.clientY };
      currentPos.current = { x: touch.clientX, y: touch.clientY };
      startTime.current = Date.now();

      setState((prev) => ({ ...prev, isSwiping: true }));
      callbacks.onSwipeStart?.();
    },
    [callbacks]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (preventDefault) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      currentPos.current = { x: touch.clientX, y: touch.clientY };

      const deltaX = touch.clientX - startPos.current.x;
      const deltaY = touch.clientY - startPos.current.y;

      // Lock to axis
      let finalDeltaX = deltaX;
      let finalDeltaY = deltaY;

      if (axis === "horizontal") {
        finalDeltaY = 0;
      } else if (axis === "vertical") {
        finalDeltaX = 0;
      }

      const direction = calculateDirection(finalDeltaX, finalDeltaY);

      // Calculate velocity
      const elapsed = Date.now() - startTime.current;
      const distance = Math.sqrt(finalDeltaX ** 2 + finalDeltaY ** 2);
      const velocity = elapsed > 0 ? distance / elapsed : 0;

      const newState: SwipeState = {
        isSwiping: true,
        deltaX: finalDeltaX,
        deltaY: finalDeltaY,
        direction,
        velocity,
      };

      setState(newState);
      callbacks.onSwipeMove?.(newState);
    },
    [axis, calculateDirection, callbacks, preventDefault]
  );

  const handleTouchEnd = useCallback(() => {
    const deltaX = currentPos.current.x - startPos.current.x;
    const deltaY = currentPos.current.y - startPos.current.y;
    const elapsed = Date.now() - startTime.current;
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    const velocity = elapsed > 0 ? distance / elapsed : 0;

    const direction = calculateDirection(deltaX, deltaY);

    const finalState: SwipeState = {
      isSwiping: false,
      deltaX: axis === "horizontal" ? deltaX : axis === "vertical" ? 0 : deltaX,
      deltaY: axis === "vertical" ? deltaY : axis === "horizontal" ? 0 : deltaY,
      direction,
      velocity,
    };

    callbacks.onSwipeEnd?.(finalState);

    // Check if swipe exceeds threshold
    const meetsThreshold =
      Math.abs(deltaX) > threshold ||
      Math.abs(deltaY) > threshold ||
      velocity > velocityThreshold;

    if (meetsThreshold && direction) {
      switch (direction) {
        case "left":
          callbacks.onSwipeLeft?.(finalState);
          break;
        case "right":
          callbacks.onSwipeRight?.(finalState);
          break;
        case "up":
          callbacks.onSwipeUp?.(finalState);
          break;
        case "down":
          callbacks.onSwipeDown?.(finalState);
          break;
      }
    }

    // Reset state after animation frame (store ID for cleanup on unmount)
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      setState({
        isSwiping: false,
        deltaX: 0,
        deltaY: 0,
        direction: null,
        velocity: 0,
      });
    });
  }, [axis, calculateDirection, callbacks, threshold, velocityThreshold]);

  const handlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd,
  };

  return {
    /** Touch event handlers to spread on the element */
    handlers,
    /** Current swipe state */
    state,
    /** Reset the swipe state */
    reset,
  };
}

export default useSwipeGesture;
