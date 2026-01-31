"use client";

/**
 * RatingButton - Thumbs up/down rating component
 *
 * Design principles:
 * - Simple binary rating (up/down)
 * - Clear visual feedback
 * - Touch-friendly targets (44px minimum)
 * - Accessible with keyboard navigation
 */

import { useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRating } from "@/hooks/use-rating";
import type { RatingValue } from "@/lib/ratings/rating-store";

interface RatingButtonProps {
  contentType: "prompt" | "bundle" | "workflow" | "collection" | "skill";
  contentId: string;
  showCount?: boolean;
  size?: "sm" | "default";
  className?: string;
}

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function RatingButton({
  contentType,
  contentId,
  showCount = true,
  size = "default",
  className,
}: RatingButtonProps) {
  const { summary, userRating, loading, rate } = useRating({
    contentType,
    contentId,
  });
  const prefersReducedMotion = useReducedMotion();

  const handleRate = useCallback(
    (value: RatingValue) => {
      if (loading) return;
      rate(value);

      // Haptic feedback for mobile
      if ("vibrate" in navigator) {
        navigator.vibrate(30);
      }
    },
    [loading, rate]
  );

  const upvotes = summary?.upvotes ?? 0;
  const downvotes = summary?.downvotes ?? 0;
  const isUpvoted = userRating === "up";
  const isDownvoted = userRating === "down";

  const buttonSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Upvote Button */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            buttonSize,
            "rounded-full transition-colors",
            isUpvoted && "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
            !isUpvoted && "text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400"
          )}
          onClick={() => handleRate("up")}
          disabled={loading}
          aria-label={isUpvoted ? "Remove upvote" : "Upvote"}
          aria-pressed={isUpvoted}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isUpvoted ? "upvoted" : "default"}
              initial={prefersReducedMotion ? {} : { scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={prefersReducedMotion ? {} : { scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <ThumbsUp
                className={cn(iconSize, isUpvoted && "fill-current")}
                aria-hidden="true"
              />
            </motion.div>
          </AnimatePresence>
        </Button>
        {showCount && upvotes > 0 && (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              isUpvoted
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            {formatCount(upvotes)}
          </span>
        )}
      </div>

      {/* Downvote Button */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            buttonSize,
            "rounded-full transition-colors",
            isDownvoted && "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30",
            !isDownvoted && "text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400"
          )}
          onClick={() => handleRate("down")}
          disabled={loading}
          aria-label={isDownvoted ? "Remove downvote" : "Downvote"}
          aria-pressed={isDownvoted}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isDownvoted ? "downvoted" : "default"}
              initial={prefersReducedMotion ? {} : { scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={prefersReducedMotion ? {} : { scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <ThumbsDown
                className={cn(iconSize, isDownvoted && "fill-current")}
                aria-hidden="true"
              />
            </motion.div>
          </AnimatePresence>
        </Button>
        {showCount && downvotes > 0 && (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              isDownvoted
                ? "text-rose-600 dark:text-rose-400"
                : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            {formatCount(downvotes)}
          </span>
        )}
      </div>
    </div>
  );
}

export default RatingButton;
