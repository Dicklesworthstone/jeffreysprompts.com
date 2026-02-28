"use client";

/**
 * PromptCard - Truly next-level, high-performance card component.
 *
 * Design features:
 * - 3D Perspective Tilt on hover (GPU accelerated)
 * - Dynamic cursor-following glow (Spotlight effect)
 * - Premium Shimmer Sweep on mount
 * - Terminal streaming preview for agentic feel
 * - Haptic feedback integration
 */

import { useState, useCallback, useRef, useEffect, useMemo, type MouseEvent, type KeyboardEvent } from "react";
import { motion, AnimatePresence, useReducedMotion, useSpring, useMotionTemplate } from "framer-motion";
import {
  Copy,
  Check,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Rocket,
  Zap,
  ShoppingBasket,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useBasket } from "@/hooks/use-basket";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/clipboard";
import type { Prompt, PromptDifficulty } from "@jeffreysprompts/core/prompts/types";
import { RatingDisplay } from "@/components/ratings";
import { useMousePosition } from "@/hooks/useMousePosition";
import { FeaturedContentBadge } from "@/components/featured/staff-pick-badge";
import { TerminalStream } from "./TerminalStream";

interface PromptCardProps {
  prompt: Prompt;
  index?: number;
  onCopy?: (prompt: Prompt) => void;
  onClick?: (prompt: Prompt) => void;
}

const difficultyConfig: Record<
  PromptDifficulty,
  { label: string; icon: typeof GraduationCap; color: string; bgColor: string }
> = {
  beginner: {
    label: "Beginner",
    icon: BookOpen,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  intermediate: {
    label: "Intermediate",
    icon: GraduationCap,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
  },
  advanced: {
    label: "Advanced",
    icon: Rocket,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
  },
};

export function PromptCard({ prompt, index = 0, onCopy, onClick }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  // Skip expensive hover effects on touch devices
  const isTouch = useMemo(() => typeof window !== "undefined" && !window.matchMedia("(hover: hover)").matches, []);
  const enableTilt = !prefersReducedMotion && !isTouch;

  const { motionPercentageX, motionPercentageY, handleMouseMove, resetMousePosition } = useMousePosition();

  // Spring configuration for smooth tilt
  const springConfig = { stiffness: 150, damping: 20 };
  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);

  const glowBackground = useMotionTemplate`radial-gradient(circle at ${motionPercentageX}% ${motionPercentageY}%, rgba(99, 102, 241, 0.1), transparent 70%)`;

  const { success, error } = useToast();
  const { addItem, isInBasket } = useBasket();
  const inBasket = isInBasket(prompt.id);

  useEffect(() => {
    if (!isHovered || !enableTilt) {
      rotateX.set(0);
      rotateY.set(0);
      return;
    }

    const unsubX = motionPercentageX.on("change", () => {
      const rX = (motionPercentageY.get() - 50) / -8;
      const rY = (motionPercentageX.get() - 50) / 8;
      rotateX.set(rX);
      rotateY.set(rY);
    });
    const unsubY = motionPercentageY.on("change", () => {
      const rX = (motionPercentageY.get() - 50) / -8;
      const rY = (motionPercentageX.get() - 50) / 8;
      rotateX.set(rX);
      rotateY.set(rY);
    });

    return () => { unsubX(); unsubY(); };
  }, [isHovered, rotateX, rotateY, motionPercentageX, motionPercentageY, enableTilt]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    resetMousePosition();
  }, [resetMousePosition]);

  const handleCopy = useCallback(
    async (e: MouseEvent) => {
      e.stopPropagation();
      const result = await copyToClipboard(prompt.content);

      if (result.success) {
        setCopied(true);

        if ("vibrate" in navigator) {
          navigator.vibrate(50);
        }

        success("Copied prompt", prompt.title, { duration: 3000 });
        trackEvent("prompt_copy", { id: prompt.id, source: "card" });
        onCopy?.(prompt);

        setTimeout(() => setCopied(false), 2000);
      } else {
        error("Failed to copy", "Please try again");
      }
    },
    [prompt, onCopy, success, error]
  );

  const handleClick = useCallback(() => {
    onClick?.(prompt);
  }, [prompt, onClick]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.(prompt);
      }
    },
    [prompt, onClick]
  );

  const handleAddToBasket = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (!inBasket) {
        addItem(prompt.id);

        if ("vibrate" in navigator) {
          navigator.vibrate(50);
        }

        success("Added to basket", prompt.title, { duration: 3000 });
        trackEvent("basket_add", { id: prompt.id, source: "card" });
      }
    },
    [prompt, inBasket, addItem, success]
  );

  const difficulty = prompt.difficulty && difficultyConfig[prompt.difficulty];
  const DifficultyIcon = difficulty?.icon;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: prefersReducedMotion ? 0 : Math.min(index * 0.05, 0.25),
        ease: [0.23, 1, 0.32, 1],
      }}
      className="h-full perspective-1000"
      onMouseEnter={enableTilt ? handleMouseEnter : undefined}
      onMouseLeave={enableTilt ? handleMouseLeave : undefined}
      onMouseMove={enableTilt ? handleMouseMove : undefined}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="h-full"
      >
        <Card
          data-testid="prompt-card"
          className={cn(
            "group relative flex flex-col h-full overflow-hidden border-2",
            "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm",
            "border-neutral-200/50 dark:border-neutral-800/50",
            "transition-all duration-300",
            isHovered ? "shadow-2xl shadow-neutral-200/50 dark:shadow-black/50 border-primary/20" : "shadow-md"
          )}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          {/* Dynamic Glow Effect */}
          {enableTilt && (
            <motion.div
              className="absolute inset-0 pointer-events-none z-0"
              style={{ background: glowBackground }}
              animate={{ opacity: isHovered ? 1 : 0 }}
            />
          )}

          {/* Shimmer Sweep on Mount */}
          {enableTilt && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: index * 0.1 + 0.5 }}
              className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent skew-x-12"
            />
          )}

          {/* Featured indicator */}
          {prompt.featured && (
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
          )}

          <CardHeader className="pb-3 pt-5 relative z-10">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="capitalize text-xs font-semibold px-2.5 py-0.5 bg-neutral-100/50 dark:bg-neutral-800/50 border-neutral-200/50 dark:border-neutral-700/50"
                >
                  {prompt.category}
                </Badge>
                {difficulty && DifficultyIcon && (
                  <span className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full",
                    difficulty.color,
                    difficulty.bgColor
                  )}>
                    <DifficultyIcon className="w-3.5 h-3.5" />
                    {difficulty.label}
                  </span>
                )}
              </div>
              {prompt.featured && (
                <FeaturedContentBadge size="sm" className="shadow-sm shadow-amber-200/20" />
              )}
            </div>

            <h3 className="text-xl font-bold leading-tight text-neutral-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {prompt.title}
            </h3>
          </CardHeader>

          <CardContent className="flex-1 pb-4 relative z-10">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-3 mb-5">
              {prompt.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {prompt.tags.slice(0, 3).map((tag) => (
                <motion.span
                  key={tag}
                  whileHover={enableTilt ? { scale: 1.05 } : undefined}
                  className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-500 bg-neutral-100/80 dark:bg-neutral-800/80 px-2 py-1 rounded-md border border-neutral-200/30 dark:border-neutral-700/30"
                >
                  {tag}
                </motion.span>
              ))}
              {prompt.tags.length > 3 && (
                <span className="text-xs font-bold text-neutral-400 dark:text-neutral-500 px-1 py-1">
                  +{prompt.tags.length - 3}
                </span>
              )}
            </div>
          </CardContent>

          <CardFooter className="pt-0 pb-5 px-5 mt-auto relative z-10">
            <div className="w-full space-y-4">
              {/* Terminal streaming preview */}
              <div className="relative rounded-xl overflow-hidden bg-neutral-50/50 dark:bg-black/20 border border-neutral-200/30 dark:border-neutral-800/30 backdrop-blur-md">
                <div className="p-4 h-[84px] overflow-hidden">
                  <TerminalStream 
                    text={prompt.content.length > 200 ? `${prompt.content.slice(0, 200)}...` : prompt.content}
                    className="font-mono text-xs leading-relaxed text-neutral-500 dark:text-neutral-400 whitespace-pre-wrap"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-neutral-50/80 dark:from-neutral-900/80 to-transparent pointer-events-none" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                  {prompt.estimatedTokens && (
                    <div className="flex items-center gap-1.5 group/stat">
                      <Zap className="w-3.5 h-3.5 text-amber-500 group-hover/stat:scale-110 transition-transform" />
                      <span>{prompt.estimatedTokens} tokens</span>
                    </div>
                  )}
                  <div className="scale-90 origin-left">
                    <RatingDisplay
                      contentType="prompt"
                      contentId={prompt.id}
                      variant="compact"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={inBasket ? "Added to basket" : "Add to basket"}
                    className={cn(
                      "h-9 w-9 p-0 rounded-full transition-all duration-300",
                      inBasket ? "bg-emerald-500 text-white" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                    onClick={handleAddToBasket}
                    disabled={inBasket}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {inBasket ? (
                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <motion.div key="basket" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <ShoppingBasket className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={copied ? "Copied" : "Copy prompt"}
                    className={cn(
                      "h-9 w-9 p-0 rounded-full transition-all duration-300",
                      copied ? "bg-emerald-500 text-white" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                    onClick={handleCopy}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {copied ? (
                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Copy className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>

                  <div
                    className={cn(
                      "inline-flex items-center justify-center h-9 px-4 rounded-full text-xs font-bold transition-all duration-300",
                      "bg-neutral-900 text-white group-hover:bg-black dark:bg-white dark:text-neutral-900 dark:group-hover:bg-neutral-200",
                      "shadow-lg shadow-neutral-200 dark:shadow-black"
                    )}
                  >
                    View
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              </div>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default PromptCard;
