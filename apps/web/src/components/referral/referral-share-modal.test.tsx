import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReferralShareModal } from "./referral-share-modal";

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn(() => Promise.resolve({ success: true })),
}));

import { copyToClipboard } from "@/lib/clipboard";

describe("ReferralShareModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    referralCode: "ABC123",
    referralUrl: "https://jeffreysprompts.com/r/ABC123",
  };

  beforeEach(() => {
    vi.mocked(copyToClipboard).mockResolvedValue({ success: true });
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("renders dialog title", () => {
    render(<ReferralShareModal {...defaultProps} />);
    expect(screen.getByText("Share Your Referral Link")).toBeInTheDocument();
  });

  it("displays referral code", () => {
    render(<ReferralShareModal {...defaultProps} />);
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });

  it("displays referral URL in input", () => {
    render(<ReferralShareModal {...defaultProps} />);
    const input = screen.getByDisplayValue(
      "https://jeffreysprompts.com/r/ABC123"
    );
    expect(input).toBeInTheDocument();
  });

  it("copies URL on Copy button click", async () => {
    render(<ReferralShareModal {...defaultProps} />);
    const copyBtn = screen.getByText("Copy");
    fireEvent.click(copyBtn);
    expect(copyToClipboard).toHaveBeenCalledWith(
      "https://jeffreysprompts.com/r/ABC123"
    );
  });

  it("renders social share buttons", () => {
    render(<ReferralShareModal {...defaultProps} />);
    expect(screen.getByText("Twitter")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("opens twitter share link", () => {
    render(<ReferralShareModal {...defaultProps} />);
    fireEvent.click(screen.getByText("Twitter"));
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("twitter.com/intent/tweet"),
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("toggles QR code visibility", () => {
    render(<ReferralShareModal {...defaultProps} />);
    expect(screen.getByText("Show QR Code")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Show QR Code"));
    expect(screen.getByText("Hide QR Code")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ReferralShareModal {...defaultProps} open={false} />);
    expect(
      screen.queryByText("Share Your Referral Link")
    ).not.toBeInTheDocument();
  });
});
