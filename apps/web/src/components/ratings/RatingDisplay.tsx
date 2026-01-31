"use client";

/**
 * RatingDisplay - Shows rating summary with approval rate bar
 *
 * Design principles:
 * - Clear visual representation of approval rate
 * - Compact design for cards, detailed for modals
 * - Accessible with proper ARIA labels
 */

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRating } from "@/hooks/use-rating";

interface RatingDisplayProps {
  contentType: "prompt" | "bundle" | "workflow" | "collection" | "skill";
  contentId: string;
  variant?: "compact" | "detailed";
  className?: string;
}

function formatCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

export function RatingDisplay({
  contentType,
  contentId,
  variant = "compact",
  className,
}: RatingDisplayProps) {
  const { summary, loading } = useRating({ contentType, contentId });

  if (loading || !summary) {
    return null;
  }

  const { upvotes, downvotes, total, approvalRate } = summary;

  if (total === 0) {
    return null;
  }

  // Color based on approval rate
  const getApprovalColor = (rate: number) => {
    if (rate >= 80) return "bg-emerald-500";
    if (rate >= 60) return "bg-lime-500";
    if (rate >= 40) return "bg-amber-500";
    if (rate >= 20) return "bg-orange-500";
    return "bg-rose-500";
  };

  const getApprovalTextColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 60) return "text-lime-600 dark:text-lime-400";
    if (rate >= 40) return "text-amber-600 dark:text-amber-400";
    if (rate >= 20) return "text-orange-600 dark:text-orange-400";
    return "text-rose-600 dark:text-rose-400";
  };

  if (variant === "compact") {
    return (
      <div
        className={cn("flex items-center gap-2", className)}
        role="meter"
        aria-label={`${approvalRate}% approval rate from ${total} votes`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={approvalRate}
      >
        <div className="flex items-center gap-1">
          <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {approvalRate}%
          </span>
        </div>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          ({formatCount(total)})
        </span>
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-semibold", getApprovalTextColor(approvalRate))}>
          {approvalRate}% Approval
        </span>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatCount(total)} {total === 1 ? "vote" : "votes"}
        </span>
      </div>

      {/* Approval bar */}
      <div
        className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden"
        role="meter"
        aria-label={`${approvalRate}% approval rate`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={approvalRate}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", getApprovalColor(approvalRate))}
          style={{ width: `${approvalRate}%` }}
        />
      </div>

      {/* Vote breakdown */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <ThumbsUp className="w-3 h-3" aria-hidden="true" />
          <span>{formatCount(upvotes)}</span>
        </div>
        <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
          <ThumbsDown className="w-3 h-3" aria-hidden="true" />
          <span>{formatCount(downvotes)}</span>
        </div>
      </div>
    </div>
  );
}

export default RatingDisplay;
