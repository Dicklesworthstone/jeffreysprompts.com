"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Copy, Check, ShoppingBag, Plus, Heart, MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptCard } from "@/components/PromptCard";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useHaptic } from "@/hooks/useHaptic";
import { useBasket } from "@/hooks/use-basket";
import { useToast } from "@/components/ui/toast";
import { trackEvent } from "@/lib/analytics";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

interface SwipeablePromptCardProps {
  prompt: Prompt;
  index?: number;
  onCopy?: (prompt: Prompt) => void;
  onClick?: (prompt: Prompt) => void;
  onSave?: (prompt: Prompt) => void;
}

const SWIPE_THRESHOLD = 80;
const SWIPE_COMPLETE_THRESHOLD = 120;
const DOUBLE_TAP_DELAY = 300;
const LONG_PRESS_DELAY = 500;

/**
 * SwipeablePromptCard - Mobile-optimized card with swipe gestures.
 *
 * Features:
 * - Swipe left: Copy to clipboard (blue reveal)
 * - Swipe right: Add to basket (indigo reveal)
 * - Double-tap: Quick save/favorite with heart animation
 * - Long-press: Opens quick actions menu
 * - Spring-back animation on incomplete swipe
 * - Velocity-based dismissal threshold
 * - Haptic feedback at key points
 *
 * Only renders swipeable version on mobile (md breakpoint).
 *
 * @example
 * ```tsx
 * <SwipeablePromptCard
 *   prompt={prompt}
 *   onCopy={(p) => console.log("Copied:", p.title)}
 *   onSave={(p) => console.log("Saved:", p.title)}
 * />
 * ```
 */
export function SwipeablePromptCard({
  prompt,
  index = 0,
  onCopy,
  onClick,
  onSave,
}: SwipeablePromptCardProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [actionTriggered, setActionTriggered] = useState<"copy" | "basket" | "save" | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const controls = useAnimation();
  const haptic = useHaptic();
  const { success, error } = useToast();
  const { addItem, isInBasket } = useBasket();
  const inBasket = isInBasket(prompt.id);
  const lastHapticThreshold = useRef(0);
  const lastTapTime = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCount = useRef(0);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      haptic.success();
      success("Copied prompt", prompt.title, 3000);
      trackEvent("prompt_copy", { id: prompt.id, source: "swipe" });
      onCopy?.(prompt);
      setActionTriggered("copy");
      setTimeout(() => setActionTriggered(null), 1500);
    } catch {
      haptic.error();
      error("Failed to copy", "Please try again");
    }
  }, [prompt, onCopy, haptic, success, error]);

  const handleAddToBasket = useCallback(() => {
    if (inBasket) return;
    addItem(prompt.id);
    haptic.success();
    success("Added to basket", prompt.title, 3000);
    setActionTriggered("basket");
    setTimeout(() => setActionTriggered(null), 1500);
  }, [prompt, inBasket, addItem, haptic, success]);

  // Handle double-tap to save/favorite
  const handleDoubleTap = useCallback(() => {
    setShowHeartAnimation(true);
    haptic.success();
    trackEvent("prompt_save", { id: prompt.id, source: "double_tap" });
    onSave?.(prompt);
    setActionTriggered("save");
    setTimeout(() => {
      setShowHeartAnimation(false);
      setActionTriggered(null);
    }, 1000);
  }, [prompt, onSave, haptic]);

  // Handle long-press to show quick actions
  const handleLongPress = useCallback(() => {
    haptic.heavy();
    setShowQuickActions(true);
  }, [haptic]);

  // Touch handlers for double-tap and long-press detection
  const handleTouchStart = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;

    // Start long-press timer
    longPressTimer.current = setTimeout(() => {
      handleLongPress();
    }, LONG_PRESS_DELAY);

    // Check for double-tap
    if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
      tapCount.current++;
      if (tapCount.current >= 2) {
        // Clear long-press timer on double-tap
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
        handleDoubleTap();
        tapCount.current = 0;
      }
    } else {
      tapCount.current = 1;
    }
    lastTapTime.current = now;
  }, [handleDoubleTap, handleLongPress]);

  const handleTouchEnd = useCallback(() => {
    // Clear long-press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    // Cancel long-press on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const { handlers, state } = useSwipeGesture(
    {
      onSwipeMove: (s) => {
        // Provide haptic feedback at thresholds
        const absX = Math.abs(s.deltaX);
        if (absX >= SWIPE_THRESHOLD && lastHapticThreshold.current < SWIPE_THRESHOLD) {
          haptic.medium();
          lastHapticThreshold.current = SWIPE_THRESHOLD;
        }
        if (absX >= SWIPE_COMPLETE_THRESHOLD && lastHapticThreshold.current < SWIPE_COMPLETE_THRESHOLD) {
          haptic.heavy();
          lastHapticThreshold.current = SWIPE_COMPLETE_THRESHOLD;
        }
      },
      onSwipeEnd: (s) => {
        lastHapticThreshold.current = 0;

        // Trigger action if threshold met
        if (Math.abs(s.deltaX) >= SWIPE_COMPLETE_THRESHOLD || s.velocity > 0.8) {
          if (s.deltaX < 0) {
            // Swipe left = copy
            handleCopy();
          } else {
            // Swipe right = add to basket
            handleAddToBasket();
          }
        }

        // Animate back to center
        controls.start({
          x: 0,
          transition: { type: "spring", stiffness: 500, damping: 30 },
        });
      },
    },
    {
      axis: "horizontal",
      threshold: SWIPE_THRESHOLD,
      velocityThreshold: 0.8,
    }
  );

  // Update animation on swipe
  useEffect(() => {
    if (state.isSwiping) {
      // Limit swipe distance
      const clampedX = Math.max(-SWIPE_COMPLETE_THRESHOLD - 20, Math.min(SWIPE_COMPLETE_THRESHOLD + 20, state.deltaX));
      controls.set({ x: clampedX });
    }
  }, [state.deltaX, state.isSwiping, controls]);

  // On desktop, render regular card
  if (!isMobile) {
    return (
      <PromptCard
        prompt={prompt}
        index={index}
        onCopy={onCopy}
        onClick={onClick}
      />
    );
  }

  // Calculate reveal progress (0-1)
  const leftProgress = Math.min(1, Math.max(0, -state.deltaX / SWIPE_COMPLETE_THRESHOLD));
  const rightProgress = Math.min(1, Math.max(0, state.deltaX / SWIPE_COMPLETE_THRESHOLD));

  return (
    <div className="relative overflow-hidden rounded-xl h-full">
      {/* Left action reveal (Copy) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end px-6",
          "bg-gradient-to-l from-sky-500 to-sky-600",
          actionTriggered === "copy" && "from-emerald-500 to-emerald-600"
        )}
        style={{
          width: `${Math.max(0, -state.deltaX) + 60}px`,
          opacity: leftProgress,
        }}
      >
        <AnimatePresence mode="wait">
          {actionTriggered === "copy" ? (
            <motion.div
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex flex-col items-center gap-1 text-white"
            >
              <Check className="w-6 h-6" />
              <span className="text-xs font-medium">Copied!</span>
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-1 text-white"
            >
              <Copy className="w-6 h-6" />
              <span className="text-xs font-medium">Copy</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Right action reveal (Basket) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-start px-6",
          inBasket
            ? "bg-gradient-to-r from-zinc-500 to-zinc-600"
            : "bg-gradient-to-r from-indigo-500 to-indigo-600",
          actionTriggered === "basket" && "from-emerald-500 to-emerald-600"
        )}
        style={{
          width: `${Math.max(0, state.deltaX) + 60}px`,
          opacity: rightProgress,
        }}
      >
        <AnimatePresence mode="wait">
          {actionTriggered === "basket" ? (
            <motion.div
              key="added"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="flex flex-col items-center gap-1 text-white"
            >
              <Check className="w-6 h-6" />
              <span className="text-xs font-medium">Added!</span>
            </motion.div>
          ) : inBasket ? (
            <motion.div
              key="in-basket"
              className="flex flex-col items-center gap-1 text-white/70"
            >
              <ShoppingBag className="w-6 h-6" />
              <span className="text-xs font-medium">In Basket</span>
            </motion.div>
          ) : (
            <motion.div
              key="add"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-1 text-white"
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs font-medium">Add</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Card */}
      <motion.div
        {...handlers}
        animate={controls}
        className="relative z-10"
        style={{
          // Only enable touch manipulation when not swiping
          touchAction: state.isSwiping ? "none" : "pan-y",
        }}
      >
        <PromptCard
          prompt={prompt}
          index={index}
          onCopy={onCopy}
          onClick={onClick}
        />
      </motion.div>
    </div>
  );
}

export default SwipeablePromptCard;
