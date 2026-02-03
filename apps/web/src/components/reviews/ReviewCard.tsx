"use client";

/**
 * ReviewCard - Display a single review
 *
 * Features:
 * - Rating indicator (thumbs up/down)
 * - Review content with author info
 * - Helpful/not helpful voting
 * - Author response display
 * - Report functionality
 * - Edit/delete for own reviews
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp,
  ThumbsDown,
  Flag,
  Trash2,
  Edit2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReviewVote } from "@/hooks/use-reviews";
import type { Review } from "@/lib/reviews/review-store";

interface ReviewCardProps {
  review: Review;
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

export function ReviewCard({
  review,
  isOwn = false,
  onEdit,
  onDelete,
  className,
}: ReviewCardProps) {
  const [showResponse, setShowResponse] = useState(true);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const { userVote, vote, loading: voteLoading } = useReviewVote({
    reviewId: review.id,
  });

  const handleVote = useCallback(
    async (isHelpful: boolean) => {
      if (voteLoading || isOwn) return;
      await vote(isHelpful);
    },
    [vote, voteLoading, isOwn]
  );

  const handleReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews/${review.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Inappropriate content" }),
      });

      if (res.ok) {
        setReportSubmitted(true);
      }
    } catch {
      // Silently fail
    }
  }, [review.id]);

  const displayName = review.displayName || "Anonymous";
  const isRecommended = review.rating === "up";
  const hasResponse = Boolean(review.authorResponse);

  return (
    <div
      className={cn(
        "p-4 rounded-xl border bg-white dark:bg-neutral-900",
        "border-neutral-200 dark:border-neutral-800",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {/* Rating Badge */}
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              isRecommended
                ? "bg-emerald-100 dark:bg-emerald-950/50"
                : "bg-rose-100 dark:bg-rose-950/50"
            )}
          >
            {isRecommended ? (
              <ThumbsUp
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400 fill-current"
                aria-label="Recommended"
              />
            ) : (
              <ThumbsDown
                className="w-5 h-5 text-rose-600 dark:text-rose-400 fill-current"
                aria-label="Not recommended"
              />
            )}
          </div>

          {/* Author Info */}
          <div>
            <div className="font-medium text-neutral-900 dark:text-neutral-100">
              {displayName}
              {isOwn && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                  You
                </span>
              )}
            </div>
            <div className="text-sm text-neutral-500">
              {formatDate(review.createdAt)}
              {review.updatedAt !== review.createdAt && (
                <span className="text-neutral-400"> (edited)</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isOwn && (
            <>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onEdit}
                  aria-label="Edit review"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={onDelete}
                  aria-label="Delete review"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
          {!isOwn && !reportSubmitted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-400 hover:text-neutral-600"
              onClick={handleReport}
              aria-label="Report review"
            >
              <Flag className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Review Content */}
      <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap mb-4">
        {review.content}
      </p>

      {/* Helpful Voting */}
      {!isOwn && (
        <div className="flex items-center gap-4 text-sm text-neutral-500 mb-4">
          <span>Was this helpful?</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5",
                userVote?.isHelpful === true &&
                  "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
              )}
              onClick={() => handleVote(true)}
              disabled={voteLoading}
            >
              <ThumbsUp
                className={cn(
                  "w-4 h-4",
                  userVote?.isHelpful === true && "fill-current"
                )}
              />
              {review.helpfulCount > 0 && (
                <span className="tabular-nums">{review.helpfulCount}</span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5",
                userVote?.isHelpful === false &&
                  "text-rose-600 bg-rose-50 dark:bg-rose-950/30"
              )}
              onClick={() => handleVote(false)}
              disabled={voteLoading}
            >
              <ThumbsDown
                className={cn(
                  "w-4 h-4",
                  userVote?.isHelpful === false && "fill-current"
                )}
              />
              {review.notHelpfulCount > 0 && (
                <span className="tabular-nums">{review.notHelpfulCount}</span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Author Response */}
      <AnimatePresence>
        {hasResponse && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
              onClick={() => setShowResponse((v) => !v)}
            >
              <MessageSquare className="w-4 h-4" />
              Author response
              {showResponse ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showResponse && review.authorResponse && (
              <div className="ml-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                  {review.authorResponse.content}
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  {formatDate(review.authorResponse.createdAt)}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Confirmation */}
      <AnimatePresence>
        {reportSubmitted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="text-sm text-amber-600 dark:text-amber-400 mt-2"
          >
            Thank you for your report. We&apos;ll review it shortly.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ReviewCard;
