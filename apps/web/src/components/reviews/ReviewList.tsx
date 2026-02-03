"use client";

/**
 * ReviewList - Display reviews for content with pagination
 *
 * Features:
 * - List of reviews with load more
 * - Write review form
 * - Summary statistics
 * - Empty state handling
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReviews } from "@/hooks/use-reviews";
import { ReviewForm } from "./ReviewForm";
import { ReviewCard } from "./ReviewCard";
import type { RatingContentType } from "@/lib/reviews/review-store";

interface ReviewListProps {
  contentType: RatingContentType;
  contentId: string;
  className?: string;
}

export function ReviewList({
  contentType,
  contentId,
  className,
}: ReviewListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    reviews,
    summary,
    userReview,
    pagination,
    loading,
    submitReview,
    deleteReview,
    loadMore,
  } = useReviews({
    contentType,
    contentId,
  });

  const handleSubmit = useCallback(
    async (input: { rating: "up" | "down"; content: string; displayName?: string }) => {
      const success = await submitReview(input);
      if (success) {
        setShowForm(false);
        setEditingReview(false);
      }
      return success;
    },
    [submitReview]
  );

  const handleDelete = useCallback(async () => {
    const success = await deleteReview();
    if (success) {
      setConfirmDelete(false);
    }
  }, [deleteReview]);

  const hasReviews = reviews.length > 0;
  const canWriteReview = !userReview && !showForm;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquareText className="w-5 h-5 text-neutral-500" />
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Reviews
          </h3>
          {summary && summary.totalReviews > 0 && (
            <span className="text-sm text-neutral-500">
              ({summary.totalReviews})
            </span>
          )}
        </div>

        {canWriteReview && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            Write a review
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      {summary && summary.totalReviews > 0 && (
        <div className="flex items-center gap-6 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {summary.totalReviews}
            </div>
            <div className="text-xs text-neutral-500">Total reviews</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {summary.averageHelpfulness}%
            </div>
            <div className="text-xs text-neutral-500">Found helpful</div>
          </div>
          {summary.recentReviews > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {summary.recentReviews}
              </div>
              <div className="text-xs text-neutral-500">This month</div>
            </div>
          )}
        </div>
      )}

      {/* Review Form (New) */}
      <AnimatePresence>
        {showForm && !userReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <h4 className="font-medium mb-4 text-neutral-900 dark:text-neutral-100">
                Write your review
              </h4>
              <ReviewForm
                onSubmit={handleSubmit}
                onCancel={() => setShowForm(false)}
                loading={loading}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User's Own Review */}
      <AnimatePresence>
        {userReview && !editingReview && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="relative">
              <div className="absolute -top-2 left-4 px-2 bg-white dark:bg-neutral-900 text-xs font-medium text-blue-600 dark:text-blue-400">
                Your review
              </div>
              <ReviewCard
                review={userReview}
                isOwn
                onEdit={() => setEditingReview(true)}
                onDelete={() => setConfirmDelete(true)}
                className="border-blue-200 dark:border-blue-800"
              />
            </div>

            {/* Delete Confirmation */}
            <AnimatePresence>
              {confirmDelete && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800"
                >
                  <p className="text-sm text-rose-700 dark:text-rose-300 mb-3">
                    Are you sure you want to delete your review? This cannot be undone.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={loading}
                    >
                      Delete
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Form */}
      <AnimatePresence>
        {editingReview && userReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <h4 className="font-medium mb-4 text-neutral-900 dark:text-neutral-100">
                Edit your review
              </h4>
              <ReviewForm
                existingReview={userReview}
                onSubmit={handleSubmit}
                onCancel={() => setEditingReview(false)}
                loading={loading}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review List */}
      {hasReviews && (
        <div className="space-y-4">
          {reviews
            .filter((r) => r.id !== userReview?.id) // Exclude user's review from list
            .map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
        </div>
      )}

      {/* Empty State */}
      {!hasReviews && !showForm && !userReview && (
        <div className="text-center py-12">
          <MessageSquareText className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
          <h4 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            No reviews yet
          </h4>
          <p className="text-sm text-neutral-500 mb-4">
            Be the first to share your experience with this prompt.
          </p>
          <Button onClick={() => setShowForm(true)}>Write a review</Button>
        </div>
      )}

      {/* Load More */}
      {pagination.hasMore && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={loading}
            className="min-w-[150px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Load more
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ReviewList;
