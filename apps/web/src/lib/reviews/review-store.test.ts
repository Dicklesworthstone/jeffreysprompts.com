import { describe, it, expect, beforeEach } from "vitest";
import {
  submitReview,
  getUserReview,
  listReviewsForContent,
  getReviewSummary,
  deleteReview,
  voteReview,
  getVote,
  submitAuthorResponse,
  deleteAuthorResponse,
  reportReview,
} from "./review-store";

// Clear store between tests by accessing the global store
function clearStore() {
  const globalStore = globalThis as unknown as Record<string, unknown>;
  delete globalStore["__jfp_review_store__"];
}

describe("review-store", () => {
  beforeEach(() => {
    clearStore();
  });

  describe("submitReview", () => {
    it("creates a new review", () => {
      const result = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "This is a great prompt! Very helpful.",
      });

      expect(result.review).toBeDefined();
      expect(result.review.rating).toBe("up");
      expect(result.review.content).toBe("This is a great prompt! Very helpful.");
      expect(result.review.userId).toBe("user-1");
      expect(result.isNew).toBe(true);
    });

    it("updates existing review from same user", () => {
      submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Original review content here.",
      });

      const result = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "down",
        content: "Updated review content here.",
      });

      expect(result.isNew).toBe(false);
      expect(result.review.rating).toBe("down");
      expect(result.review.content).toBe("Updated review content here.");
    });

    it("sanitizes HTML from content", () => {
      const result = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "<script>alert('xss')</script>Safe content",
      });

      expect(result.review.content).not.toContain("<script>");
      expect(result.review.content).toContain("Safe content");
    });

    it("allows display name", () => {
      const result = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Great prompt for coding tasks!",
        displayName: "JohnDoe",
      });

      expect(result.review.displayName).toBe("JohnDoe");
    });
  });

  describe("getUserReview", () => {
    it("returns null for non-existent review", () => {
      const review = getUserReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
      });

      expect(review).toBeNull();
    });

    it("returns existing review", () => {
      submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Existing review for testing.",
      });

      const review = getUserReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
      });

      expect(review).not.toBeNull();
      expect(review?.content).toBe("Existing review for testing.");
    });
  });

  describe("listReviewsForContent", () => {
    it("returns empty list for content with no reviews", () => {
      const result = listReviewsForContent({
        contentType: "prompt",
        contentId: "test-prompt-1",
      });

      expect(result.reviews).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("returns reviews for content", () => {
      submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "First review for test content.",
      });

      submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-2",
        rating: "down",
        content: "Second review for test content.",
      });

      const result = listReviewsForContent({
        contentType: "prompt",
        contentId: "test-prompt-1",
      });

      expect(result.reviews).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("respects pagination", () => {
      for (let i = 0; i < 15; i++) {
        submitReview({
          contentType: "prompt",
          contentId: "test-prompt-1",
          userId: `user-${i}`,
          rating: "up",
          content: `Review number ${i} content.`,
        });
      }

      const result = listReviewsForContent({
        contentType: "prompt",
        contentId: "test-prompt-1",
        limit: 5,
        offset: 0,
      });

      expect(result.reviews).toHaveLength(5);
      expect(result.total).toBe(15);
      expect(result.hasMore).toBe(true);
    });

    it("excludes reported reviews by default", () => {
      submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Normal review content here.",
      });

      const reportedReview = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-2",
        rating: "down",
        content: "Reported review content here.",
      });

      reportReview({
        reviewId: reportedReview.review.id,
        reporterId: "reporter-1",
      });

      const result = listReviewsForContent({
        contentType: "prompt",
        contentId: "test-prompt-1",
      });

      expect(result.reviews).toHaveLength(1);
    });
  });

  describe("getReviewSummary", () => {
    it("returns zero stats for content with no reviews", () => {
      const summary = getReviewSummary({
        contentType: "prompt",
        contentId: "test-prompt-1",
      });

      expect(summary.totalReviews).toBe(0);
      expect(summary.averageHelpfulness).toBe(0);
      expect(summary.recentReviews).toBe(0);
    });

    it("calculates stats correctly", () => {
      submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "First positive review content.",
      });

      submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-2",
        rating: "up",
        content: "Second positive review content.",
      });

      submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-3",
        rating: "down",
        content: "One negative review content.",
      });

      const summary = getReviewSummary({
        contentType: "prompt",
        contentId: "test-prompt-1",
      });

      expect(summary.totalReviews).toBe(3);
      expect(summary.recentReviews).toBe(3); // All recent
    });
  });

  describe("deleteReview", () => {
    it("deletes own review", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review to be deleted later.",
      });

      const success = deleteReview({
        reviewId: review.id,
        userId: "user-1",
      });

      expect(success).toBe(true);

      const userReview = getUserReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
      });

      expect(userReview).toBeNull();
    });

    it("cannot delete another user's review", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review that belongs to user-1.",
      });

      const success = deleteReview({
        reviewId: review.id,
        userId: "user-2",
      });

      expect(success).toBe(false);
    });
  });

  describe("voteReview", () => {
    it("adds helpful vote", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review that will receive votes.",
      });

      const result = voteReview({
        reviewId: review.id,
        visitorId: "visitor-1",
        isHelpful: true,
      });

      expect(result).not.toBeNull();
      expect(result?.review.helpfulCount).toBe(1);
      expect(result?.vote.isHelpful).toBe(true);
    });

    it("changes vote", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review for vote change test.",
      });

      voteReview({
        reviewId: review.id,
        visitorId: "visitor-1",
        isHelpful: true,
      });

      const result = voteReview({
        reviewId: review.id,
        visitorId: "visitor-1",
        isHelpful: false,
      });

      expect(result?.review.helpfulCount).toBe(0);
      expect(result?.review.notHelpfulCount).toBe(1);
    });
  });

  describe("getVote", () => {
    it("returns null for non-existent vote", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review without any votes yet.",
      });

      const vote = getVote({
        reviewId: review.id,
        visitorId: "visitor-1",
      });

      expect(vote).toBeNull();
    });

    it("returns existing vote", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review that will be voted on.",
      });

      voteReview({
        reviewId: review.id,
        visitorId: "visitor-1",
        isHelpful: true,
      });

      const vote = getVote({
        reviewId: review.id,
        visitorId: "visitor-1",
      });

      expect(vote).not.toBeNull();
      expect(vote?.isHelpful).toBe(true);
    });
  });

  describe("submitAuthorResponse", () => {
    it("adds author response", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review that needs author response.",
      });

      const result = submitAuthorResponse({
        reviewId: review.id,
        authorId: "author-1",
        content: "Thank you for your kind review!",
      });

      expect(result).not.toBeNull();
      expect(result?.response.content).toBe("Thank you for your kind review!");
      expect(result?.review.authorResponse).not.toBeNull();
    });

    it("updates existing response", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review for response update test.",
      });

      submitAuthorResponse({
        reviewId: review.id,
        authorId: "author-1",
        content: "Original response content here.",
      });

      const result = submitAuthorResponse({
        reviewId: review.id,
        authorId: "author-1",
        content: "Updated response content here.",
      });

      expect(result?.response.content).toBe("Updated response content here.");
    });
  });

  describe("deleteAuthorResponse", () => {
    it("deletes author response", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review with response to delete.",
      });

      submitAuthorResponse({
        reviewId: review.id,
        authorId: "author-1",
        content: "Response that will be deleted.",
      });

      const success = deleteAuthorResponse({
        reviewId: review.id,
        authorId: "author-1",
      });

      expect(success).toBe(true);

      const updatedReview = getUserReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
      });

      expect(updatedReview?.authorResponse).toBeNull();
    });
  });

  describe("reportReview", () => {
    it("marks review as reported", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review that will be reported.",
      });

      const success = reportReview({
        reviewId: review.id,
        reporterId: "reporter-1",
      });

      expect(success).toBe(true);

      const result = listReviewsForContent({
        contentType: "prompt",
        contentId: "test-prompt-1",
        includeReported: true,
      });

      expect(result.reviews[0].reported).toBe(true);
    });

    it("stores report info with reason", () => {
      const { review } = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review that will be reported with reason.",
      });

      const success = reportReview({
        reviewId: review.id,
        reporterId: "reporter-1",
        reason: "Inappropriate content",
      });

      expect(success).toBe(true);

      const result = listReviewsForContent({
        contentType: "prompt",
        contentId: "test-prompt-1",
        includeReported: true,
      });

      expect(result.reviews[0].reportInfo).not.toBeNull();
      expect(result.reviews[0].reportInfo?.reporterId).toBe("reporter-1");
      expect(result.reviews[0].reportInfo?.reason).toBe("Inappropriate content");
      expect(result.reviews[0].reportInfo?.createdAt).toBeDefined();
    });
  });

  describe("displayName sanitization", () => {
    it("sanitizes HTML from displayName", () => {
      const result = submitReview({
        contentType: "prompt",
        contentId: "test-prompt-1",
        userId: "user-1",
        rating: "up",
        content: "Review with script in display name.",
        displayName: "<script>alert('xss')</script>BadUser",
      });

      expect(result.review.displayName).not.toContain("<script>");
      expect(result.review.displayName).toContain("BadUser");
    });
  });
});
