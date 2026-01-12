"use client";

/**
 * PromptCard - Clean, minimal card component (Stripe/Linear inspired)
 *
 * Design principles:
 * - Subtle elevation on hover (lift + shadow only)
 * - Clear visual hierarchy: title > description > preview
 * - Touch-friendly targets (44px minimum on mobile)
 * - No distracting animations or 3D effects
 * - Simplified action row
 */

import { useState, useCallback, useRef, useEffect, type MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Copy,
  Check,
  ChevronRight,
  Sparkles,
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
  const copiedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { success, error } = useToast();
  const { addItem, isInBasket } = useBasket();
  const inBasket = isInBasket(prompt.id);

  useEffect(() => {
    return () => {
      if (copiedResetTimer.current) {
        clearTimeout(copiedResetTimer.current);
      }
    };
  }, []);

  const handleCopy = useCallback(
    async (e: MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(prompt.content);
        setCopied(true);
        success("Copied prompt", prompt.title, 3000);
        trackEvent("prompt_copy", { id: prompt.id, source: "card" });
        onCopy?.(prompt);
        if (copiedResetTimer.current) {
          clearTimeout(copiedResetTimer.current);
        }
        copiedResetTimer.current = setTimeout(() => {
          setCopied(false);
          copiedResetTimer.current = null;
        }, 2000);
      } catch {
        error("Failed to copy", "Please try again");
      }
    },
    [prompt, onCopy, success, error]
  );

  const handleClick = useCallback(() => {
    onClick?.(prompt);
  }, [prompt, onClick]);

  const handleAddToBasket = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (!inBasket) {
        addItem(prompt.id);
        success("Added to basket", prompt.title, 3000);
        trackEvent("basket_add", { id: prompt.id, source: "card" });
      }
    },
    [prompt, inBasket, addItem, success]
  );

  const difficulty = prompt.difficulty && difficultyConfig[prompt.difficulty];
  const DifficultyIcon = difficulty?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: prefersReducedMotion ? 0 : Math.min(index * 0.03, 0.15),
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="h-full"
    >
      <Card
        className={cn(
          "group relative flex flex-col h-full cursor-pointer overflow-hidden",
          // Base styles - clean, neutral
          "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800",
          // Hover: subtle lift + refined shadow (Stripe-style)
          "transition-all duration-200 ease-out",
          "hover:-translate-y-1",
          "hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)]",
          "dark:hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.4)]",
          "hover:border-neutral-300 dark:hover:border-neutral-700"
        )}
        onClick={handleClick}
      >
        {/* Featured indicator - prominent top accent */}
        {prompt.featured && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
        )}

        <CardHeader className="pb-3 pt-4">
          {/* Top row: Category + Difficulty + Featured */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="capitalize text-xs font-medium px-2 py-0.5 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
              >
                {prompt.category}
              </Badge>
              {difficulty && DifficultyIcon && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                  difficulty.color,
                  difficulty.bgColor
                )}>
                  <DifficultyIcon className="w-3 h-3" />
                  {difficulty.label}
                </span>
              )}
            </div>
            {prompt.featured && (
              <Badge className="gap-1 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                <Sparkles className="w-3 h-3" />
                Featured
              </Badge>
            )}
          </div>

          {/* Title - clean typography */}
          <h3 className="text-lg font-semibold leading-snug text-neutral-900 dark:text-neutral-100 line-clamp-2">
            {prompt.title}
          </h3>
        </CardHeader>

        <CardContent className="flex-1 pb-4">
          {/* Description */}
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2 mb-4">
            {prompt.description}
          </p>

          {/* Tags - clean styling */}
          <div className="flex flex-wrap gap-1.5">
            {prompt.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium text-neutral-500 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/70 px-2 py-0.5 rounded-md"
              >
                {tag}
              </span>
            ))}
            {prompt.tags.length > 3 && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 px-1.5 py-0.5">
                +{prompt.tags.length - 3}
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0 pb-4 px-4 mt-auto">
          <div className="w-full space-y-3">
            {/* Content preview */}
            <div className="relative rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
              <div className="p-3 h-[72px] overflow-hidden">
                <p className="font-mono text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                  {prompt.content.length > 180
                    ? `${prompt.content.slice(0, 180)}...`
                    : prompt.content}
                </p>
              </div>
              {/* Fade overlay */}
              <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-neutral-50 dark:from-neutral-800/40 to-transparent pointer-events-none" />
            </div>

            {/* Actions row - simplified to 2 primary actions */}
            <div className="flex items-center justify-between">
              {/* Token count */}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                {prompt.estimatedTokens && (
                  <>
                    <Zap className="w-3 h-3" />
                    <span>{prompt.estimatedTokens} tokens</span>
                  </>
                )}
              </div>

              {/* Action buttons - Basket, Copy, and View */}
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 p-0",
                    "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                    inBasket && "text-emerald-600 dark:text-emerald-400"
                  )}
                  onClick={handleAddToBasket}
                  disabled={inBasket}
                  aria-label={inBasket ? "Already in basket" : "Add to basket"}
                >
                  {inBasket ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ShoppingBasket className="w-4 h-4" aria-hidden="true" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 p-0",
                    "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                    copied && "text-emerald-600 dark:text-emerald-400"
                  )}
                  onClick={handleCopy}
                  aria-label={copied ? "Copied to clipboard" : "Copy prompt to clipboard"}
                >
                  {copied ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  )}
                </Button>

                <Button
                  size="sm"
                  className="h-8 px-3 text-sm font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                >
                  View
                  <ChevronRight className="w-4 h-4 ml-1" />
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
