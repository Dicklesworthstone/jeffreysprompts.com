"use client";

import {
  useCallback,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { Copy, Check, ShoppingBasket, Plus, Heart, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptCard } from "@/components/PromptCard";
import { GestureHint } from "@/components/onboarding";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useHaptic } from "@/hooks/useHaptic";
import { useIsSmallScreen } from "@/hooks/useIsMobile";
import { useBasket } from "@/hooks/use-basket";
import { useOnboarding } from "@/hooks/useOnboarding";
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
  const { shouldShowHint, dismissHint } = useOnboarding();
  const showGestureHint = shouldShowHint("swipe-gestures");
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
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0 }}
        className="flex flex-col items-center gap-2 text-white"
      >
        <div className="p-3 rounded-full bg-white/20">
          <Check className="w-7 h-7" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest">Added!</span>
      </motion.div>
    );
  } else if (inBasket) {
    basketRevealContent = (
      <motion.div
        key="in-basket"
        className="flex flex-col items-center gap-2 text-white/70"
      >
        <div className="p-3 rounded-full bg-white/10">
          <ShoppingBasket className="w-7 h-7" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest">In Basket</span>
      </motion.div>
    );
  } else {
    basketRevealContent = (
      <motion.div
        key="add"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center gap-2 text-white"
      >
        <div className="p-3 rounded-full bg-white/20">
          <Plus className="w-7 h-7" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest">Add</span>
      </motion.div>
    );
  }

  useEffect(() => {
    const timers = actionTimers.current;
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (showQuickActions && quickActionsRef.current) {
      return focusTrap(quickActionsRef.current);
    }
  }, [showQuickActions]);

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
      haptic.error();
      error("Failed to copy", "Clipboard access denied.");
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

  const handleLongPress = useCallback(() => {
    haptic.heavy();
    setShowQuickActions(true);
  }, [haptic]);

  const handleTouchStart = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;

    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      handleLongPress();
    }, LONG_PRESS_DELAY);

    if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
      tapCount.current++;
      if (tapCount.current >= 2) {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        handleDoubleTap();
        tapCount.current = 0;
      }
    } else {
      tapCount.current = 1;
    }
    lastTapTime.current = now;
  }, [handleDoubleTap, handleLongPress]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const { handlers, state } = useSwipeGesture(
    {
      onSwipeMove: (s) => {
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
        if (Math.abs(s.deltaX) >= SWIPE_COMPLETE_THRESHOLD || s.velocity > 0.8) {
          if (s.deltaX < 0) {
            handleCopy();
          } else {
            handleAddToBasket();
          }
        }
        controls.start({
          x: 0,
          transition: { type: "spring", stiffness: 500, damping: 30 },
        });
      },
    },
    { axis: "horizontal", threshold: SWIPE_THRESHOLD, velocityThreshold: 0.8 }
  );

  useEffect(() => {
    if (state.isSwiping) {
      const clampedX = Math.max(-SWIPE_COMPLETE_THRESHOLD - 20, Math.min(SWIPE_COMPLETE_THRESHOLD + 20, state.deltaX));
      controls.set({ x: clampedX });
    }
  }, [state.deltaX, state.isSwiping, controls]);

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

  const leftProgress = Math.min(1, Math.max(0, -state.deltaX / SWIPE_COMPLETE_THRESHOLD));
  const rightProgress = Math.min(1, Math.max(0, state.deltaX / SWIPE_COMPLETE_THRESHOLD));

  return (
    <div className="relative overflow-hidden rounded-2xl h-full shadow-sm">
      {/* Left action reveal (Copy) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end px-8",
          "bg-gradient-to-l from-sky-500 to-sky-400",
          actionTriggered === "copy" && "from-emerald-500 to-emerald-400"
        )}
        style={{
          width: `${Math.max(0, -state.deltaX) + 80}px`,
          opacity: leftProgress,
        }}
      >
        <AnimatePresence mode="wait">
          {actionTriggered === "copy" ? (
            <motion.div
              key="check"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="flex flex-col items-center gap-2 text-white"
            >
              <div className="p-3 rounded-full bg-white/20">
                <Check className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Copied!</span>
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 text-white"
            >
              <div className="p-3 rounded-full bg-white/20">
                <Copy className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Copy</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Right action reveal (Basket) */}
      <motion.div
        className={cn(
          "absolute inset-y-0 left-0 flex items-center justify-start px-8",
          inBasket
            ? "bg-gradient-to-r from-neutral-500 to-neutral-400"
            : "bg-gradient-to-r from-indigo-600 to-indigo-500",
          actionTriggered === "basket" && "from-emerald-500 to-emerald-400"
        )}
        style={{
          width: `${Math.max(0, state.deltaX) + 80}px`,
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
        className="relative z-10 h-full"
        style={{
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
        <div className="h-full">
          <PromptCard
            prompt={prompt}
            index={index}
            onCopy={onCopy}
            onClick={onClick}
          />
        </div>

        {/* Heart animation on double-tap */}
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.5, 1], 
                opacity: [0, 1, 1],
                rotate: [0, -15, 15, 0]
              }}
              exit={{ scale: 2, opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className="relative">
                <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.6)]" />
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                  className="absolute inset-0 bg-rose-500 rounded-full blur-2xl"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gesture hint for first-time mobile users */}
        <AnimatePresence>
          {showGestureHint && index === 0 && isMobile && (
            <GestureHint type="all" onDismiss={() => dismissHint("swipe-gestures")} />
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setShowQuickActions(false)}
              aria-hidden="true"
            />
            {/* Menu */}
            <motion.div
              ref={quickActionsRef}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl rounded-t-[2.5rem] p-8 shadow-2xl border-t border-white/10"
              style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 2.5rem))" }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-actions-title"
            >
              <div className="w-12 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full mx-auto mb-8" aria-hidden="true" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h3 id="quick-actions-title" className="font-bold text-xl truncate">{prompt.title}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mt-0.5">{prompt.category}</p>
                </div>
              </div>

              <div className="grid gap-3" role="group" aria-label="Quick actions">
                <button
                  onClick={() => {
                    handleCopy();
                    setShowQuickActions(false);
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                      <Copy className="w-5 h-5" />
                    </div>
                    <span className="font-bold">Copy to Clipboard</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    handleAddToBasket();
                    setShowQuickActions(false);
                  }}
                  disabled={inBasket}
                  className={cn(
                    "w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all group",
                    inBasket
                      ? "bg-neutral-50 dark:bg-neutral-800/50 opacity-60 cursor-not-allowed"
                      : "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-lg bg-indigo-500/10", inBasket ? "text-neutral-400" : "text-indigo-500")}>
                      <ShoppingBasket className="w-5 h-5" />
                    </div>
                    <span className="font-bold">{inBasket ? "Already in Basket" : "Add to Basket"}</span>
                  </div>
                  {!inBasket && <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />}
                </button>

                <button
                  onClick={() => {
                    onSave?.(prompt);
                    haptic.success();
                    setShowQuickActions(false);
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                      <Heart className="w-5 h-5" />
                    </div>
                    <span className="font-bold">Save to Favorites</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <button
                onClick={() => setShowQuickActions(false)}
                className="mt-6 w-full py-4 rounded-2xl font-bold text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SwipeablePromptCard;