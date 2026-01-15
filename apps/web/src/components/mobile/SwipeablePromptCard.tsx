"use client";

import {
  useCallback,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Copy, Check, ShoppingBag, Plus, Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptCard } from "@/components/PromptCard";
import { SwipeHint } from "@/components/mobile/SwipeHint";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useHaptic } from "@/hooks/useHaptic";
import { useIsSmallScreen } from "@/hooks/useIsMobile";
import { useBasket } from "@/hooks/use-basket";
import { useSwipeHint } from "@/hooks/useSwipeHint";
import { useToast } from "@/components/ui/toast";
import { trackEvent } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/clipboard";
import { focusTrap } from "@/lib/accessibility";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

interface SwipeablePromptCardProps {
  prompt: Prompt;
  index?: number;
  onCopy?: (prompt: Prompt) => void;
  onClick?: (prompt: Prompt) => void;
  onSave?: (prompt: Prompt) => void;
  isMobile?: boolean;
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
  isMobile: isMobileProp,
}: SwipeablePromptCardProps) {
  const fallbackIsMobile = useIsSmallScreen();
  const [actionTriggered, setActionTriggered] = useState<"copy" | "basket" | "save" | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const controls = useAnimation();
  const haptic = useHaptic();
  const { success, error } = useToast();
  const { addItem, isInBasket } = useBasket();
  const { showHint, dismissHint } = useSwipeHint();
  const inBasket = isInBasket(prompt.id);
  const lastHapticThreshold = useRef(0);
  const lastTapTime = useRef(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCount = useRef(0);
  const actionTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const quickActionsRef = useRef<HTMLDivElement>(null);

  let basketRevealContent: ReactNode;
  if (actionTriggered === "basket") {
    basketRevealContent = (
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
    );
  } else if (inBasket) {
    basketRevealContent = (
      <motion.div
        key="in-basket"
        className="flex flex-col items-center gap-1 text-white/70"
      >
        <ShoppingBag className="w-6 h-6" />
        <span className="text-xs font-medium">In Basket</span>
      </motion.div>
    );
  } else {
    basketRevealContent = (
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
    );
  }

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = actionTimers.current;
    return () => {
      // Clear long-press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      // Clear all action timers
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // Focus trap for quick actions menu (accessibility)
  useEffect(() => {
    if (showQuickActions && quickActionsRef.current) {
      return focusTrap(quickActionsRef.current);
    }
  }, [showQuickActions]);

  // Helper to create tracked timeouts that auto-cleanup
  const safeTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      actionTimers.current.delete(timer);
      callback();
    }, delay);
    actionTimers.current.add(timer);
    return timer;
  }, []);

  const isMobile = typeof isMobileProp === "boolean" ? isMobileProp : fallbackIsMobile;

  const handleCopy = useCallback(async () => {
    const result = await copyToClipboard(prompt.content);

    if (result.success) {
      haptic.success();
      success("Copied prompt", prompt.title, { duration: 3000 });
      trackEvent("prompt_copy", { id: prompt.id, source: "swipe" });
      onCopy?.(prompt);
      setActionTriggered("copy");
      safeTimeout(() => setActionTriggered(null), 1500);
    } else {
      console.error("Clipboard copy failed:", result.error);
      haptic.error();
      error("Failed to copy", "Clipboard access denied. Try tapping the copy button instead.");
    }
  }, [prompt, onCopy, haptic, success, error, safeTimeout]);

  const handleAddToBasket = useCallback(() => {
    if (inBasket) return;
    addItem(prompt.id);
    haptic.success();
    success("Added to basket", prompt.title, { duration: 3000 });
    setActionTriggered("basket");
    safeTimeout(() => setActionTriggered(null), 1500);
  }, [prompt, inBasket, addItem, haptic, success, safeTimeout]);

  // Handle double-tap to save/favorite
  const handleDoubleTap = useCallback(() => {
    setShowHeartAnimation(true);
    haptic.success();
    onSave?.(prompt);
    setActionTriggered("save");
    safeTimeout(() => {
      setShowHeartAnimation(false);
      setActionTriggered(null);
    }, 1000);
  }, [prompt, onSave, haptic, safeTimeout]);

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
            ? "bg-gradient-to-r from-neutral-500 to-neutral-600"
            : "bg-gradient-to-r from-indigo-500 to-indigo-600",
          actionTriggered === "basket" && "from-emerald-500 to-emerald-600"
        )}
        style={{
          width: `${Math.max(0, state.deltaX) + 60}px`,
          opacity: rightProgress,
        }}
      >
        <AnimatePresence mode="wait">
          {basketRevealContent}
        </AnimatePresence>
      </motion.div>

      {/* Card */}
      <motion.div
        animate={controls}
        className="relative z-10"
        style={{
          // Only enable touch manipulation when not swiping
          touchAction: state.isSwiping ? "none" : "pan-y",
        }}
        onTouchStart={(e) => {
          handlers.onTouchStart(e);
          handleTouchStart();
        }}
        onTouchEnd={() => {
          handlers.onTouchEnd();
          handleTouchEnd();
        }}
        onTouchMove={(e) => {
          handlers.onTouchMove(e);
          handleTouchMove();
        }}
        onTouchCancel={() => {
          handlers.onTouchCancel();
          handleTouchEnd();
        }}
      >
        <PromptCard
          prompt={prompt}
          index={index}
          onCopy={onCopy}
          onClick={onClick}
        />

        {/* Heart animation on double-tap */}
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <Heart className="w-16 h-16 text-pink-500 fill-pink-500 drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Swipe hint for first-time mobile users (only on first card) */}
        <AnimatePresence>
          {showHint && index === 0 && isMobile && (
            <SwipeHint onDismiss={dismissHint} />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Quick actions menu (long-press) */}
      <AnimatePresence>
        {showQuickActions && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowQuickActions(false)}
              aria-hidden="true"
            />
            {/* Menu */}
            <motion.div
              ref={quickActionsRef}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 rounded-t-3xl p-4 shadow-2xl"
              style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 2rem))" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-actions-title"
            >
              <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mb-4" aria-hidden="true" />
              <h3 id="quick-actions-title" className="font-semibold text-lg mb-4 text-center">{prompt.title}</h3>
              <div className="space-y-2" role="group" aria-label="Quick actions">
                <button
                  onClick={() => {
                    handleCopy();
                    setShowQuickActions(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  aria-label={`Copy "${prompt.title}" to clipboard`}
                >
                  <Copy className="w-5 h-5 text-sky-500" aria-hidden="true" />
                  <span>Copy to Clipboard</span>
                </button>
                <button
                  onClick={() => {
                    handleAddToBasket();
                    setShowQuickActions(false);
                  }}
                  disabled={inBasket}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                    inBasket
                      ? "bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400"
                      : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  )}
                  aria-label={inBasket ? `"${prompt.title}" is already in basket` : `Add "${prompt.title}" to basket`}
                >
                  <ShoppingBag className={cn("w-5 h-5", inBasket ? "text-neutral-400" : "text-indigo-500")} aria-hidden="true" />
                  <span>{inBasket ? "Already in Basket" : "Add to Basket"}</span>
                </button>
                <button
                  onClick={() => {
                    onSave?.(prompt);
                    haptic.success();
                    setShowQuickActions(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  aria-label={`Save "${prompt.title}" to favorites`}
                >
                  <Heart className="w-5 h-5 text-pink-500" aria-hidden="true" />
                  <span>Save Prompt</span>
                </button>
              </div>
              <button
                onClick={() => setShowQuickActions(false)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close quick actions menu"
              >
                <X className="w-5 h-5" aria-hidden="true" />
                <span>Cancel</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SwipeablePromptCard;
