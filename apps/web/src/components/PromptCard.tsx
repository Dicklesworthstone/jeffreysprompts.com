"use client";

/**
 * PromptCard - World-class card component for displaying prompts
 *
 * Design principles:
 * - Subtle elevation on hover (lift + shadow, no jarring transforms)
 * - Clear visual hierarchy: title > description > preview
 * - Touch-friendly targets (44px minimum on mobile)
 * - Smooth GPU-accelerated transitions
 * - Responsive typography that's readable at all sizes
 * - Cursor-tracking glow effect (desktop)
 * - Preview expansion on hover
 */

import { useState, useCallback, useRef, type MouseEvent } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  GraduationCap,
  BookOpen,
  Rocket,
  Zap,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useBasket } from "@/hooks/use-basket";
import { trackEvent } from "@/lib/analytics";
import type { Prompt, PromptDifficulty } from "@jeffreysprompts/core/prompts/types";

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
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();
  const { isInBasket, addItem, removeItem } = useBasket();
  const inBasket = isInBasket(prompt.id);

  // Cursor-tracking glow effect (desktop only)
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);
  const springConfig = { stiffness: 300, damping: 30 };
  const glowX = useSpring(mouseX, springConfig);
  const glowY = useSpring(mouseY, springConfig);
  const glow = useMotionTemplate`radial-gradient(240px circle at ${glowX}% ${glowY}%, rgba(99,102,241,0.18), rgba(99,102,241,0.06) 45%, transparent 70%)`;

  // Transform for 3D tilt effect
  const rotateX = useTransform(mouseY, [0, 100], [2, -2]);
  const rotateY = useTransform(mouseX, [0, 100], [-2, 2]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(50);
    mouseY.set(50);
  }, [mouseX, mouseY]);

  const handleCopy = useCallback(
    async (e: MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(prompt.content);
        setCopied(true);
        success("Copied prompt", prompt.title, 3000);
        trackEvent("prompt_copy", { id: prompt.id, source: "card" });
        onCopy?.(prompt);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        error("Failed to copy", "Please try again");
      }
    },
    [prompt, onCopy, success, error]
  );

  const handleBasketToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (inBasket) {
        removeItem(prompt.id);
      } else {
        addItem(prompt.id);
      }
    },
    [prompt.id, inBasket, addItem, removeItem]
  );

  const handleClick = useCallback(() => {
    onClick?.(prompt);
  }, [prompt, onClick]);

  const difficulty = prompt.difficulty && difficultyConfig[prompt.difficulty];
  const DifficultyIcon = difficulty?.icon;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.04, 0.2),
        ease: [0.25, 0.1, 0.25, 1],
        scale: { type: "spring", stiffness: 400, damping: 25 },
      }}
      onMouseMove={prefersReducedMotion ? undefined : handleMouseMove}
      onMouseLeave={prefersReducedMotion ? undefined : handleMouseLeave}
      className="h-full"
      style={
        prefersReducedMotion
          ? { transformStyle: "preserve-3d" }
          : { rotateX, rotateY, transformPerspective: 1000, transformStyle: "preserve-3d" }
      }
    >
      <Card
        className={cn(
          "group relative flex flex-col h-full cursor-pointer overflow-hidden",
          // Base styles
          "bg-white dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800/80",
          // Hover: elevation lift with enhanced shadow (Stripe-style)
          "hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1),0_0_0_1px_rgba(99,102,241,0.1)]",
          "dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4),0_0_0_1px_rgba(99,102,241,0.2)]",
          "hover:border-indigo-200 dark:hover:border-indigo-900/60",
          // Smooth GPU-accelerated transitions
          "transition-all duration-300 ease-out",
          // In-basket state
          inBasket && "ring-2 ring-indigo-500/70 ring-offset-2 dark:ring-offset-zinc-950 border-indigo-300 dark:border-indigo-800"
        )}
        onClick={handleClick}
      >
        {/* Cursor glow */}
        {!prefersReducedMotion && (
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 hidden md:block"
            style={{ background: glow }}
          />
        )}
        {/* Featured indicator - subtle top accent */}
        {prompt.featured && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />
        )}

        <CardHeader className="pb-3 pt-4">
          {/* Top row: Category + Difficulty + Featured */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="capitalize text-[11px] font-medium px-2 py-0.5 bg-zinc-50 dark:bg-zinc-800/50"
              >
                {prompt.category}
              </Badge>
              {difficulty && DifficultyIcon && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                  difficulty.color,
                  difficulty.bgColor
                )}>
                  <DifficultyIcon className="w-3 h-3" />
                  {difficulty.label}
                </span>
              )}
            </div>
            {prompt.featured && (
              <Badge className="gap-1 text-[11px] bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-400 border-amber-400/30 dark:border-amber-500/30">
                <Sparkles className="w-3 h-3" />
                Featured
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 line-clamp-2">
            {prompt.title}
          </h3>
        </CardHeader>

        <CardContent className="flex-1 pb-4">
          {/* Description */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2 mb-4">
            {prompt.description}
          </p>

          {/* Tags - refined styling */}
          <div className="flex flex-wrap gap-1.5">
            {prompt.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/70 px-2 py-0.5 rounded-md"
              >
                {tag}
              </span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-600 px-1.5 py-0.5">
                +{prompt.tags.length - 3}
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0 pb-4 px-4 mt-auto">
          {/* Content preview - improved typography */}
          <div className="w-full space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 transition-colors duration-300 group-hover:border-indigo-200/70 dark:group-hover:border-indigo-900/50 group-hover:bg-white/80 dark:group-hover:bg-zinc-800/60">
              <div className="p-3 h-[72px] overflow-hidden">
                <p className="font-mono text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap transition-transform duration-300 group-hover:-translate-y-1">
                  {prompt.content.length > 180
                    ? `${prompt.content.slice(0, 180)}...`
                    : prompt.content}
                </p>
              </div>
              {/* Fade overlay */}
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-50 dark:from-zinc-800/40 to-transparent pointer-events-none transition-all duration-300 group-hover:h-4" />
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between">
              {/* Token count */}
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-600">
                {prompt.estimatedTokens && (
                  <>
                    <Zap className="w-3 h-3" />
                    <span>{prompt.estimatedTokens} tokens</span>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Copy button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-8 px-2.5 text-xs font-medium touch-manipulation",
                    "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    copied && "text-emerald-600 dark:text-emerald-400"
                  )}
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                </Button>

                {/* Basket button */}
                <Button
                  size="sm"
                  variant={inBasket ? "default" : "ghost"}
                  className={cn(
                    "h-8 px-2.5 text-xs font-medium touch-manipulation",
                    inBasket
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                  onClick={handleBasketToggle}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span className="ml-1.5 hidden sm:inline">{inBasket ? "Added" : "Save"}</span>
                </Button>

                {/* View button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-xs font-medium touch-manipulation hover:bg-zinc-100 dark:hover:bg-zinc-800 group/btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                >
                  <span className="hidden sm:inline">View</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:ml-0.5 transition-transform group-hover/btn:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default PromptCard;
