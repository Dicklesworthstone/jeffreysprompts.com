import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppealForm } from "./appeal-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/moderation/appeal-store", () => ({
  APPEAL_SUBMISSION_WINDOW_DAYS: 14,
}));

describe("AppealForm", () => {
  const defaultProps = {
    actionId: "action-1",
    userId: "user-1",
    userEmail: "test@example.com",
    userName: "Test User",
    actionType: "content_removal",
    reason: "spam",
    actionDate: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-02-09T12:00:00Z") });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the form with action summary", () => {
    render(<AppealForm {...defaultProps} />);
    expect(screen.getByText("Appealing: content_removal")).toBeInTheDocument();
    expect(screen.getByText("Reason: spam")).toBeInTheDocument();
  });

  it("renders explanation textarea", () => {
    render(<AppealForm {...defaultProps} />);
    expect(screen.getByText("Your Explanation")).toBeInTheDocument();
  });

  it("renders guidelines", () => {
    render(<AppealForm {...defaultProps} />);
    expect(screen.getByText("Guidelines for your appeal:")).toBeInTheDocument();
    expect(screen.getByText(/Be honest and respectful/)).toBeInTheDocument();
  });

  it("disables submit with insufficient text", () => {
    render(<AppealForm {...defaultProps} />);
    const submitBtn = screen.getByText("Submit Appeal").closest("button");
    expect(submitBtn).toBeDisabled();
  });

  it("shows minimum character warning", () => {
    render(<AppealForm {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Please explain/);
    fireEvent.change(textarea, { target: { value: "short" } });
    expect(screen.getByText(/Please provide at least/)).toBeInTheDocument();
  });

  it("shows expired window message when past deadline", () => {
    render(
      <AppealForm
        {...defaultProps}
        actionDate="2025-01-01T00:00:00Z"
      />
    );
    expect(screen.getByText("Appeal Window Expired")).toBeInTheDocument();
    expect(
      screen.getByText(/The 14-day window to submit an appeal/)
    ).toBeInTheDocument();
  });

  it("shows days remaining", () => {
    render(<AppealForm {...defaultProps} />);
    expect(screen.getByText(/remaining to submit appeal/)).toBeInTheDocument();
  });
});
