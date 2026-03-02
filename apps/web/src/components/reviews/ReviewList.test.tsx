/**
 * Unit tests for ReviewList component
 * @module components/reviews/ReviewList.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ReviewList } from "./ReviewList";
import { fixtures } from "@/test-utils/fetch-fixtures";
import type { Review } from "@/lib/reviews/review-store";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLProps<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Hook mock state (module-level so tests can override per-test)
// ---------------------------------------------------------------------------

const mockSubmitReview = vi.fn().mockResolvedValue(true);
const mockDeleteReview = vi.fn().mockResolvedValue(true);
const mockLoadMore = vi.fn();

let hookState: {
  reviews: Review[];
  summary: { totalReviews: number; averageHelpfulness: number; recentReviews: number } | null;
  userReview: Review | null;
  pagination: { hasMore: boolean; page: number };
  loading: boolean;
  submitReview: typeof mockSubmitReview;
  deleteReview: typeof mockDeleteReview;
  loadMore: typeof mockLoadMore;
};

vi.mock("@/hooks/use-reviews", () => ({
  useReviews: () => hookState,
  useReviewVote: () => ({
    userVote: null,
    vote: vi.fn(),
    loading: false,
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures based on shared realistic data
// ---------------------------------------------------------------------------

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: fixtures.review.id,
    contentType: fixtures.review.contentType,
    contentId: fixtures.review.contentId,
    userId: fixtures.review.userId,
    displayName: "Alice",
    rating: fixtures.review.rating,
    content: fixtures.review.content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    helpfulCount: fixtures.review.helpfulCount,
    notHelpfulCount: fixtures.review.notHelpfulCount,
    reported: false,
    reportInfo: null,
    authorResponse: null,
    ...overrides,
  };
}

const review1 = makeReview({ id: "r1", displayName: "Alice" });
const review2 = makeReview({ id: "r2", displayName: "Bob", rating: "down" });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReviewList", () => {
  beforeEach(() => {
    mockSubmitReview.mockClear();
    mockDeleteReview.mockClear();
    mockLoadMore.mockClear();

    hookState = {
      reviews: [],
      summary: null,
      userReview: null,
      pagination: { hasMore: false, page: 0 },
      loading: false,
      submitReview: mockSubmitReview,
      deleteReview: mockDeleteReview,
      loadMore: mockLoadMore,
    };
  });

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  it("shows empty state when there are no reviews", () => {
    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByText("No reviews yet")).toBeInTheDocument();
    expect(screen.getByText(/be the first/i)).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: /write a review/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  // -----------------------------------------------------------------------
  // With reviews
  // -----------------------------------------------------------------------

  it("renders reviews in a list", () => {
    hookState.reviews = [review1, review2];
    hookState.summary = { totalReviews: 2, averageHelpfulness: 80, recentReviews: 2 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows summary stats when reviews exist", () => {
    hookState.reviews = [review1];
    hookState.summary = {
      totalReviews: 5,
      averageHelpfulness: 72,
      recentReviews: 4,
    };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByText("Total reviews")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("This month")).toBeInTheDocument();
  });

  it("shows total review count in header", () => {
    hookState.reviews = [review1];
    hookState.summary = { totalReviews: 10, averageHelpfulness: 90, recentReviews: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByText("(10)")).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Sort
  // -----------------------------------------------------------------------

  it("shows sort dropdown when reviews exist", () => {
    hookState.reviews = [review1];
    hookState.summary = { totalReviews: 1, averageHelpfulness: 100, recentReviews: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByLabelText("Sort reviews")).toBeInTheDocument();
  });

  it("does not show sort dropdown when empty", () => {
    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.queryByLabelText("Sort reviews")).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Write a review
  // -----------------------------------------------------------------------

  it("shows 'Write a review' button when user has no review", () => {
    hookState.reviews = [review1];
    hookState.summary = { totalReviews: 1, averageHelpfulness: 100, recentReviews: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    const buttons = screen.getAllByRole("button", { name: /write a review/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("hides 'Write a review' button when user already has a review", () => {
    hookState.reviews = [review1];
    hookState.userReview = review1;
    hookState.summary = { totalReviews: 1, averageHelpfulness: 100, recentReviews: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.queryByText("Write a review")).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // User's own review
  // -----------------------------------------------------------------------

  it("shows user review with 'Your review' label", () => {
    hookState.reviews = [review1];
    hookState.userReview = review1;
    hookState.summary = { totalReviews: 1, averageHelpfulness: 100, recentReviews: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByText("Your review")).toBeInTheDocument();
  });

  it("excludes user review from main list to avoid duplication", () => {
    const userReview = makeReview({ id: "user-r", displayName: "Me" });
    const otherReview = makeReview({ id: "other-r", displayName: "Other" });
    hookState.reviews = [userReview, otherReview];
    hookState.userReview = userReview;
    hookState.summary = { totalReviews: 2, averageHelpfulness: 50, recentReviews: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByText("Other")).toBeInTheDocument();
    const meElements = screen.getAllByText("Me");
    expect(meElements).toHaveLength(1);
  });

  // -----------------------------------------------------------------------
  // Load more
  // -----------------------------------------------------------------------

  it("shows load more button when hasMore is true", () => {
    hookState.reviews = [review1];
    hookState.summary = { totalReviews: 5, averageHelpfulness: 100, recentReviews: 0 };
    hookState.pagination = { hasMore: true, page: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument();
  });

  it("calls loadMore when load more button is clicked", () => {
    hookState.reviews = [review1];
    hookState.summary = { totalReviews: 5, averageHelpfulness: 100, recentReviews: 0 };
    hookState.pagination = { hasMore: true, page: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    expect(mockLoadMore).toHaveBeenCalledOnce();
  });

  it("hides load more button when hasMore is false", () => {
    hookState.reviews = [review1];
    hookState.summary = { totalReviews: 1, averageHelpfulness: 100, recentReviews: 0 };
    hookState.pagination = { hasMore: false, page: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Delete flow
  // -----------------------------------------------------------------------

  it("shows delete confirmation when delete button is clicked", async () => {
    hookState.reviews = [review1];
    hookState.userReview = review1;
    hookState.summary = { totalReviews: 1, averageHelpfulness: 100, recentReviews: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    fireEvent.click(screen.getByLabelText("Delete review"));

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });
  });

  it("calls deleteReview when delete is confirmed", async () => {
    hookState.reviews = [review1];
    hookState.userReview = review1;
    hookState.summary = { totalReviews: 1, averageHelpfulness: 100, recentReviews: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    fireEvent.click(screen.getByLabelText("Delete review"));

    await waitFor(() => {
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockDeleteReview).toHaveBeenCalledOnce();
    });
  });

  // -----------------------------------------------------------------------
  // Accessibility
  // -----------------------------------------------------------------------

  it("renders review list with proper ARIA role", () => {
    hookState.reviews = [review1, review2];
    hookState.summary = { totalReviews: 2, averageHelpfulness: 50, recentReviews: 0 };

    render(<ReviewList contentType="prompt" contentId="idea-wizard" />);
    expect(screen.getByRole("list", { name: "Reviews" })).toBeInTheDocument();
  });
});
