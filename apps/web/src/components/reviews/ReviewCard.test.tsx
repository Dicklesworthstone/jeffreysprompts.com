/**
 * Unit tests for ReviewCard component
 * @module components/reviews/ReviewCard.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReviewCard } from "./ReviewCard";
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

// Mock the useReviewVote hook
const mockVote = vi.fn();
vi.mock("@/hooks/use-reviews", () => ({
  useReviewVote: () => ({
    userVote: null,
    vote: mockVote,
    loading: false,
  }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date();
const today = now.toISOString();
const yesterday = new Date(now.getTime() - 86_400_000).toISOString();
const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
const monthAgo = new Date(now.getTime() - 35 * 86_400_000).toISOString();

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "review-1",
    contentType: "prompt",
    contentId: "test-prompt",
    userId: "user-1",
    displayName: "Alice",
    rating: "up",
    content: "This prompt is excellent for brainstorming sessions.",
    createdAt: yesterday,
    updatedAt: yesterday,
    helpfulCount: 5,
    notHelpfulCount: 1,
    reported: false,
    reportInfo: null,
    authorResponse: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReviewCard", () => {
  beforeEach(() => {
    mockVote.mockClear();
    globalThis.fetch = vi.fn();
  });

  it("renders review content and author name", () => {
    render(<ReviewCard review={makeReview()} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("This prompt is excellent for brainstorming sessions.")).toBeInTheDocument();
  });

  it("shows Anonymous when displayName is null", () => {
    render(<ReviewCard review={makeReview({ displayName: null })} />);
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("shows thumbs up for positive rating", () => {
    render(<ReviewCard review={makeReview({ rating: "up" })} />);
    expect(screen.getByLabelText("Recommended")).toBeInTheDocument();
  });

  it("shows thumbs down for negative rating", () => {
    render(<ReviewCard review={makeReview({ rating: "down" })} />);
    expect(screen.getByLabelText("Not recommended")).toBeInTheDocument();
  });

  it("shows 'You' badge when isOwn is true", () => {
    render(<ReviewCard review={makeReview()} isOwn />);
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows edit and delete buttons for own reviews", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ReviewCard review={makeReview()} isOwn onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByLabelText("Edit review")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete review")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn();
    render(<ReviewCard review={makeReview()} isOwn onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText("Edit review"));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(<ReviewCard review={makeReview()} isOwn onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText("Delete review"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("shows report button for non-own reviews", () => {
    render(<ReviewCard review={makeReview()} />);
    expect(screen.getByLabelText("Report review")).toBeInTheDocument();
  });

  it("does not show report button for own reviews", () => {
    render(<ReviewCard review={makeReview()} isOwn />);
    expect(screen.queryByLabelText("Report review")).not.toBeInTheDocument();
  });

  it("displays helpful vote counts", () => {
    render(<ReviewCard review={makeReview({ helpfulCount: 7, notHelpfulCount: 2 })} />);
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows helpful voting section for non-own reviews", () => {
    render(<ReviewCard review={makeReview()} />);
    expect(screen.getByText("Was this helpful?")).toBeInTheDocument();
  });

  it("hides helpful voting section for own reviews", () => {
    render(<ReviewCard review={makeReview()} isOwn />);
    expect(screen.queryByText("Was this helpful?")).not.toBeInTheDocument();
  });

  it("calls vote(true) when helpful button is clicked", async () => {
    render(<ReviewCard review={makeReview()} />);
    const helpfulBtn = screen.getByLabelText(/^Helpful/);
    fireEvent.click(helpfulBtn);
    await waitFor(() => {
      expect(mockVote).toHaveBeenCalledWith(true);
    });
  });

  it("calls vote(false) when not helpful button is clicked", async () => {
    render(<ReviewCard review={makeReview()} />);
    const notHelpfulBtn = screen.getByLabelText(/^Not helpful/);
    fireEvent.click(notHelpfulBtn);
    await waitFor(() => {
      expect(mockVote).toHaveBeenCalledWith(false);
    });
  });

  it("shows (edited) when updatedAt differs from createdAt", () => {
    render(<ReviewCard review={makeReview({ createdAt: yesterday, updatedAt: today })} />);
    expect(screen.getByText("(edited)")).toBeInTheDocument();
  });

  it("does not show (edited) when timestamps match", () => {
    render(<ReviewCard review={makeReview({ createdAt: yesterday, updatedAt: yesterday })} />);
    expect(screen.queryByText("(edited)")).not.toBeInTheDocument();
  });

  it("displays relative date: Today", () => {
    render(<ReviewCard review={makeReview({ createdAt: today })} />);
    expect(screen.getByText("Today", { exact: false })).toBeInTheDocument();
  });

  it("displays relative date: Yesterday", () => {
    render(<ReviewCard review={makeReview({ createdAt: yesterday })} />);
    expect(screen.getByText("Yesterday", { exact: false })).toBeInTheDocument();
  });

  it("displays relative date: N days ago", () => {
    const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000).toISOString();
    render(<ReviewCard review={makeReview({ createdAt: threeDaysAgo })} />);
    expect(screen.getByText("3 days ago", { exact: false })).toBeInTheDocument();
  });

  it("displays relative date: week(s) ago", () => {
    render(<ReviewCard review={makeReview({ createdAt: weekAgo })} />);
    expect(screen.getByText("1 week ago", { exact: false })).toBeInTheDocument();
  });

  it("shows author response section when present", () => {
    const review = makeReview({
      authorResponse: {
        id: "resp-1",
        reviewId: "review-1",
        authorId: "author-1",
        content: "Thank you for your feedback!",
        createdAt: today,
        updatedAt: today,
      },
    });
    render(<ReviewCard review={review} />);
    expect(screen.getByText("Author response")).toBeInTheDocument();
    expect(screen.getByText("Thank you for your feedback!")).toBeInTheDocument();
  });

  it("does not show author response section when absent", () => {
    render(<ReviewCard review={makeReview({ authorResponse: null })} />);
    expect(screen.queryByText("Author response")).not.toBeInTheDocument();
  });

  it("toggles author response visibility", () => {
    const review = makeReview({
      authorResponse: {
        id: "resp-1",
        reviewId: "review-1",
        authorId: "author-1",
        content: "Thanks!",
        createdAt: today,
        updatedAt: today,
      },
    });
    render(<ReviewCard review={review} />);
    expect(screen.getByText("Thanks!")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Author response"));
    // After toggle, response should be hidden
    expect(screen.queryByText("Thanks!")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Author response"));
    // After second toggle, response should be visible again
    expect(screen.getByText("Thanks!")).toBeInTheDocument();
  });

  it("shows report confirmation after successful report", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    render(<ReviewCard review={makeReview()} />);
    fireEvent.click(screen.getByLabelText("Report review"));
    await waitFor(() => {
      expect(screen.getByText(/thank you for your report/i)).toBeInTheDocument();
    });
  });

  it("shows error after failed report", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false });
    render(<ReviewCard review={makeReview()} />);
    fireEvent.click(screen.getByLabelText("Report review"));
    await waitFor(() => {
      expect(screen.getByText(/failed to submit report/i)).toBeInTheDocument();
    });
  });

  it("shows error after network error during report", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));
    render(<ReviewCard review={makeReview()} />);
    fireEvent.click(screen.getByLabelText("Report review"));
    await waitFor(() => {
      expect(screen.getByText(/failed to submit report/i)).toBeInTheDocument();
    });
  });

  it("applies custom className", () => {
    const { container } = render(<ReviewCard review={makeReview()} className="custom-class" />);
    expect(container.firstElementChild?.classList.contains("custom-class")).toBe(true);
  });
});
