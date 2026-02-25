/**
 * Unit tests for ReviewForm component
 * @module components/reviews/ReviewForm.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor , fireEvent} from "@testing-library/react";
import { ReviewForm } from "./ReviewForm";
import { REVIEW_MAX_LENGTH } from "@/lib/reviews/review-store";
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
// Fixtures
// ---------------------------------------------------------------------------

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: "review-1",
    contentType: "prompt",
    contentId: "test-prompt",
    userId: "user-1",
    displayName: "Alice",
    rating: "up",
    content: "This prompt works great for brainstorming sessions. Highly recommend it.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    helpfulCount: 0,
    notHelpfulCount: 0,
    reported: false,
    reportInfo: null,
    authorResponse: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ReviewForm", () => {
  type ReviewSubmit = React.ComponentProps<typeof ReviewForm>["onSubmit"];
  let mockSubmit: ReturnType<typeof vi.fn<ReviewSubmit>>;

  beforeEach(() => {
    mockSubmit = vi.fn<ReviewSubmit>().mockResolvedValue(true);
  });

  it("renders rating buttons, text area, and submit button", () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    expect(screen.getByLabelText("Recommend this prompt")).toBeInTheDocument();
    expect(screen.getByLabelText("Do not recommend this prompt")).toBeInTheDocument();
    expect(screen.getByLabelText("Your review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
  });

  it("submit button is disabled when form is empty", () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("submit button is disabled when only rating is selected", () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.click(screen.getByLabelText("Recommend this prompt"));
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("submit button is disabled when content is too short", () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.click(screen.getByLabelText("Recommend this prompt"));
    fireEvent.change(screen.getByLabelText("Your review"), { target: { value: "Short" } });
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("shows characters needed hint when content is under 10 chars", () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.change(screen.getByLabelText("Your review"), { target: { value: "Hello" } });
    expect(screen.getByText(/5 more characters needed/)).toBeInTheDocument();
  });

  it("enables submit button with valid rating and content", () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.click(screen.getByLabelText("Recommend this prompt"));
    fireEvent.change(screen.getByLabelText("Your review"), {
      target: { value: "This is a valid review with enough characters." },
    });
    expect(screen.getByRole("button", { name: /submit/i })).not.toBeDisabled();
  });

  it("shows character count", () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    const text = "Hello world, this is my review.";
    fireEvent.change(screen.getByLabelText("Your review"), { target: { value: text } });
    expect(screen.getByText(`${text.length}/${REVIEW_MAX_LENGTH}`)).toBeInTheDocument();
  });

  it("disables submit when over character limit", () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.click(screen.getByLabelText("Recommend this prompt"));
    const longContent = "x".repeat(REVIEW_MAX_LENGTH + 1);
    fireEvent.change(screen.getByLabelText("Your review"), { target: { value: longContent } });
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("calls onSubmit with form data on valid submission", async () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.click(screen.getByLabelText("Recommend this prompt"));
    fireEvent.change(screen.getByLabelText("Your review"), {
      target: { value: "This is a great prompt that works well." },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Bob" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        rating: "up",
        content: "This is a great prompt that works well.",
        displayName: "Bob",
      });
    });
  });

  it("resets form after successful new review submission", async () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.click(screen.getByLabelText("Recommend this prompt"));
    fireEvent.change(screen.getByLabelText("Your review"), {
      target: { value: "A valid review text that is long enough." },
    });
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled();
    });

    // Form should be reset
    await waitFor(() => {
      expect(screen.getByLabelText("Your review")).toHaveValue("");
    });
  });

  it("shows cancel button when onCancel is provided", () => {
    const onCancel = vi.fn();
    render(<ReviewForm onSubmit={mockSubmit} onCancel={onCancel} />);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<ReviewForm onSubmit={mockSubmit} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("does not show cancel button when onCancel is not provided", () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("supports down rating", async () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.click(screen.getByLabelText("Do not recommend this prompt"));
    fireEvent.change(screen.getByLabelText("Your review"), {
      target: { value: "I did not find this prompt useful at all." },
    });
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ rating: "down" })
      );
    });
  });

  it("pre-fills form in edit mode", () => {
    const existing = makeReview({ content: "Original review text content here." });
    render(<ReviewForm existingReview={existing} onSubmit={mockSubmit} />);
    expect(screen.getByLabelText("Your review")).toHaveValue("Original review text content here.");
    expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
  });

  it("shows Update instead of Submit in edit mode", () => {
    render(<ReviewForm existingReview={makeReview()} onSubmit={mockSubmit} />);
    expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^submit$/i })).not.toBeInTheDocument();
  });

  it("displays error message when onSubmit throws", async () => {
    mockSubmit.mockRejectedValueOnce(new Error("Server error"));
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.click(screen.getByLabelText("Recommend this prompt"));
    fireEvent.change(screen.getByLabelText("Your review"), {
      target: { value: "This is a valid review that should fail." },
    });
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("trims whitespace from content and display name", async () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.click(screen.getByLabelText("Recommend this prompt"));
    fireEvent.change(screen.getByLabelText("Your review"), {
      target: { value: "  Padded review content here  " },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "  Bob  " },
    });
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        rating: "up",
        content: "Padded review content here",
        displayName: "Bob",
      });
    });
  });

  it("sends undefined displayName when display name is empty", async () => {
    render(<ReviewForm onSubmit={mockSubmit} />);
    fireEvent.click(screen.getByLabelText("Recommend this prompt"));
    fireEvent.change(screen.getByLabelText("Your review"), {
      target: { value: "A review without a name attached." },
    });
    fireEvent.submit(screen.getByRole("button", { name: /submit/i }).closest("form")!);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: undefined })
      );
    });
  });
});
