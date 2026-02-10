import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppealStatus } from "./appeal-status";

const baseAppeal = {
  id: "appeal-1",
  explanation: "I believe this was a mistake",
  submittedAt: "2026-01-15T10:00:00Z",
  deadlineAt: "2026-03-15T10:00:00Z",
};

const baseAction = {
  actionType: "content_removal",
  reason: "spam_content",
  details: "Duplicate content detected",
  createdAt: "2026-01-10T08:00:00Z",
};

describe("AppealStatus", () => {
  it("renders pending status", () => {
    render(
      <AppealStatus
        appeal={{ ...baseAppeal, status: "pending", reviewedAt: null, adminResponse: null }}
      />
    );
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders under_review status", () => {
    render(
      <AppealStatus
        appeal={{ ...baseAppeal, status: "under_review", reviewedAt: null, adminResponse: null }}
      />
    );
    expect(screen.getByText("Under Review")).toBeInTheDocument();
    expect(screen.getByText("under review")).toBeInTheDocument();
  });

  it("renders approved status", () => {
    render(
      <AppealStatus
        appeal={{
          ...baseAppeal,
          status: "approved",
          reviewedAt: "2026-02-01T12:00:00Z",
          adminResponse: "Your appeal has been accepted",
        }}
      />
    );
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Your appeal has been accepted")).toBeInTheDocument();
  });

  it("renders denied status", () => {
    render(
      <AppealStatus
        appeal={{
          ...baseAppeal,
          status: "denied",
          reviewedAt: "2026-02-01T12:00:00Z",
          adminResponse: "Appeal denied after review",
        }}
      />
    );
    expect(screen.getByText("Denied")).toBeInTheDocument();
    expect(screen.getByText("Appeal denied after review")).toBeInTheDocument();
  });

  it("renders admin response card when present", () => {
    render(
      <AppealStatus
        appeal={{
          ...baseAppeal,
          status: "approved",
          reviewedAt: "2026-02-01T12:00:00Z",
          adminResponse: "Reviewed and accepted",
        }}
      />
    );
    expect(screen.getByText("Admin Response")).toBeInTheDocument();
    expect(screen.getByText("Reviewed and accepted")).toBeInTheDocument();
  });

  it("renders original action details when provided", () => {
    render(
      <AppealStatus
        appeal={{ ...baseAppeal, status: "pending", reviewedAt: null, adminResponse: null }}
        action={baseAction}
      />
    );
    expect(screen.getByText("Original Action")).toBeInTheDocument();
    expect(screen.getByText("content removal")).toBeInTheDocument();
    expect(screen.getByText("spam content")).toBeInTheDocument();
    expect(screen.getByText("Duplicate content detected")).toBeInTheDocument();
  });

  it("renders explanation section", () => {
    render(
      <AppealStatus
        appeal={{ ...baseAppeal, status: "pending", reviewedAt: null, adminResponse: null }}
      />
    );
    expect(screen.getByText("Your Explanation")).toBeInTheDocument();
    expect(screen.getByText("I believe this was a mistake")).toBeInTheDocument();
  });

  it("shows next steps for pending status", () => {
    render(
      <AppealStatus
        appeal={{ ...baseAppeal, status: "pending", reviewedAt: null, adminResponse: null }}
      />
    );
    expect(screen.getByText("What happens next?")).toBeInTheDocument();
    expect(screen.getByText(/review your case within 14 days/)).toBeInTheDocument();
  });

  it("does not show next steps for approved status", () => {
    render(
      <AppealStatus
        appeal={{
          ...baseAppeal,
          status: "approved",
          reviewedAt: "2026-02-01T12:00:00Z",
          adminResponse: null,
        }}
      />
    );
    expect(screen.queryByText("What happens next?")).not.toBeInTheDocument();
  });
});
