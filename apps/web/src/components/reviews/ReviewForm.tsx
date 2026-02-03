"use client";

/**
 * ReviewForm - Write and submit a review
 *
 * Features:
 * - Thumbs up/down rating selection
 * - Text content with character counter
 * - Optional display name
 * - Edit mode for existing reviews
 * - Mobile-optimized touch targets
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REVIEW_MAX_LENGTH } from "@/lib/reviews/review-store";
import type { Review } from "@/lib/reviews/review-store";

interface ReviewFormProps {
  existingReview?: Review | null;
  onSubmit: (input: {
    rating: "up" | "down";
    content: string;
    displayName?: string;
  }) => Promise<boolean>;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

export function ReviewForm({
  existingReview,
  onSubmit,
  onCancel,
  loading = false,
  className,
}: ReviewFormProps) {
  const [rating, setRating] = useState<"up" | "down" | null>(
    existingReview?.rating ?? null
  );
  const [content, setContent] = useState(existingReview?.content ?? "");
  const [displayName, setDisplayName] = useState(
    existingReview?.displayName ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(existingReview);
  const charCount = content.length;
  const isOverLimit = charCount > REVIEW_MAX_LENGTH;
  const canSubmit = rating !== null && content.trim().length >= 10 && !isOverLimit && !loading && !submitting;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || !rating) return;

      setError(null);
      setSubmitting(true);

      try {
        const success = await onSubmit({
          rating,
          content: content.trim(),
          displayName: displayName.trim() || undefined,
        });

        if (success) {
          if (!isEditing) {
            // Reset form only for new reviews
            setContent("");
            setDisplayName("");
            setRating(null);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit review");
      } finally {
        setSubmitting(false);
      }
    },
    [canSubmit, rating, content, displayName, isEditing, onSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {/* Rating Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Your rating
        </label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={cn(
              "flex-1 h-12 gap-2 transition-colors",
              rating === "up" &&
                "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-500 dark:text-emerald-400"
            )}
            onClick={() => setRating("up")}
            disabled={loading || submitting}
          >
            <ThumbsUp
              className={cn("w-5 h-5", rating === "up" && "fill-current")}
            />
            Recommend
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className={cn(
              "flex-1 h-12 gap-2 transition-colors",
              rating === "down" &&
                "bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/30 dark:border-rose-500 dark:text-rose-400"
            )}
            onClick={() => setRating("down")}
            disabled={loading || submitting}
          >
            <ThumbsDown
              className={cn("w-5 h-5", rating === "down" && "fill-current")}
            />
            Not for me
          </Button>
        </div>
      </div>

      {/* Review Content */}
      <div className="space-y-2">
        <label
          htmlFor="review-content"
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Your review
        </label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience with this prompt. What worked well? What could be improved?"
          className={cn(
            "w-full min-h-[120px] p-3 rounded-lg border resize-y",
            "bg-white dark:bg-neutral-900",
            "border-neutral-200 dark:border-neutral-700",
            "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
            isOverLimit && "border-rose-500 focus:ring-rose-500"
          )}
          disabled={loading || submitting}
          maxLength={REVIEW_MAX_LENGTH + 100} // Allow some overage for warning
        />
        <div className="flex justify-between text-xs">
          <span className="text-neutral-500">
            {content.length < 10 && content.length > 0 && (
              <span className="text-amber-600">
                {10 - content.length} more characters needed
              </span>
            )}
          </span>
          <span
            className={cn(
              "tabular-nums",
              isOverLimit
                ? "text-rose-500 font-medium"
                : charCount > REVIEW_MAX_LENGTH * 0.9
                  ? "text-amber-500"
                  : "text-neutral-500"
            )}
          >
            {charCount}/{REVIEW_MAX_LENGTH}
          </span>
        </div>
      </div>

      {/* Display Name (Optional) */}
      <div className="space-y-2">
        <label
          htmlFor="display-name"
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Display name{" "}
          <span className="text-neutral-400 font-normal">(optional)</span>
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Anonymous"
          autoComplete="name"
          className={cn(
            "w-full h-10 px-3 rounded-lg border",
            "bg-white dark:bg-neutral-900",
            "border-neutral-200 dark:border-neutral-700",
            "focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
          )}
          disabled={loading || submitting}
          maxLength={50}
        />
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading || submitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!canSubmit}
          className="min-w-[120px]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span className="sr-only">Submitting review...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {isEditing ? "Update" : "Submit"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default ReviewForm;
