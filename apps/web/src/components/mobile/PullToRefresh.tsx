"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useHaptic } from "@/hooks/useHaptic";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: ReactNode;
  /** Called when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Threshold in pixels to trigger refresh */
  threshold?: number;
  /** Maximum pull distance */
  maxPull?: number;
  /** Custom loading indicator */
  loadingIndicator?: ReactNode;
  /** Additional className */
  className?: string;
  /** Disable pull-to-refresh */
  disabled?: boolean;
}

/**
 * PullToRefresh - iOS-style pull-to-refresh with spring physics.
 *
 * Features:
 * - Natural rubber-band physics
 * - Haptic feedback at threshold
 * - Custom loading indicator support
 * - Momentum-based pull resistance
 *
 * @example
 * ```tsx
 * <PullToRefresh onRefresh={async () => await fetchData()}>
 *   <div className="space-y-4">
 *     {items.map(item => <Card key={item.id} {...item} />)}
 *   </div>
 * </PullToRefresh>
 * ```
 */
export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 150,
  loadingIndicator,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);

  const haptic = useHaptic();

  // Spring for smooth pull animation
  const pullSpring = useSpring(0, {
    stiffness: 400,
    damping: 40,
  });

  // Transform pull distance to rotation for spinner
  const spinnerRotation = useTransform(pullSpring, [0, threshold], [0, 180]);

  // Transform for resistance (rubber-band effect)
  const rubberBandTransform = (pull: number) => {
    if (pull <= 0) return 0;
    // Logarithmic resistance for natural feel
    const resistance = 0.55;
    const normalizedPull = pull / maxPull;
    const resistedPull = Math.pow(normalizedPull, resistance);
    return Math.min(resistedPull * maxPull, maxPull);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled || isRefreshing) return;

    // Only enable if at top of scroll
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    currentY.current = startY.current;
    setIsPulling(true);
    setHasTriggeredHaptic(false);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) {
      setIsPulling(false);
      pullSpring.set(0);
      return;
    }

    currentY.current = e.touches[0].clientY;
    const pull = currentY.current - startY.current;

    if (pull > 0) {
      e.preventDefault();
      const resistedPull = rubberBandTransform(pull);
      pullSpring.set(resistedPull);

      // Trigger haptic at threshold
      if (resistedPull >= threshold && !hasTriggeredHaptic) {
        haptic.medium();
        setHasTriggeredHaptic(true);
      } else if (resistedPull < threshold && hasTriggeredHaptic) {
        setHasTriggeredHaptic(false);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);
    const pull = currentY.current - startY.current;
    const resistedPull = rubberBandTransform(pull);

    if (resistedPull >= threshold && !isRefreshing) {
      // Trigger refresh
      setIsRefreshing(true);
      haptic.success();

      // Keep indicator visible during refresh
      pullSpring.set(threshold * 0.8);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        pullSpring.set(0);
      }
    } else {
      // Snap back
      pullSpring.set(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: isPulling ? "none" : "auto" }}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center z-10"
        style={{
          top: 0,
          height: pullSpring,
        }}
      >
        <AnimatePresence>
          {(isPulling || isRefreshing) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center justify-center"
            >
              {loadingIndicator || (
                <RefreshIndicator
                  isRefreshing={isRefreshing}
                  rotation={spinnerRotation}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Content with pull offset */}
      <motion.div style={{ y: pullSpring }}>{children}</motion.div>
    </div>
  );
}

/**
 * Default refresh indicator with spinning animation.
 */
function RefreshIndicator({
  isRefreshing,
  rotation,
}: {
  isRefreshing: boolean;
  rotation: ReturnType<typeof useTransform>;
}) {
  return (
    <motion.div
      className={cn(
        "w-8 h-8 rounded-full border-2 border-indigo-500",
        "border-t-transparent"
      )}
      style={{
        rotate: isRefreshing ? undefined : rotation,
      }}
      animate={
        isRefreshing
          ? {
              rotate: 360,
            }
          : undefined
      }
      transition={
        isRefreshing
          ? {
              rotate: {
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              },
            }
          : undefined
      }
    />
  );
}

export default PullToRefresh;
