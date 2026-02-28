import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act , fireEvent} from "@testing-library/react";
import { ReferralCard } from "./referral-card";

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("./referral-share-modal", () => ({
  ReferralShareModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="share-modal">Share Modal</div> : null,
}));

import { copyToClipboard } from "@/lib/clipboard";

const mockReferralData = {
  success: true,
  data: {
    code: "TESTCODE",
    url: "https://jeffreysprompts.com/r/TESTCODE",
    rewards: {
      referrer: "30-day free trial",
      referee: "20% off first month",
      maxPerYear: "$500",
    },
  },
};

describe("ReferralCard", () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockResolvedValue({ success: true });
    // @ts-expect-error: Mocking global fetch for tests
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockReferralData),
    });
  });

  it("shows loading skeleton initially", () => {
    // Fetch never resolves
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    const { container } = render(<ReferralCard />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders referral card after loading", async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText("Invite Friends, Get Rewards")).toBeInTheDocument();
    });
  });

  it("displays referral URL in input", async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(
        screen.getByDisplayValue("https://jeffreysprompts.com/r/TESTCODE")
      ).toBeInTheDocument();
    });
  });

  it("displays reward info", async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText("30-day free trial")).toBeInTheDocument();
      expect(screen.getByText("20% off first month")).toBeInTheDocument();
    });
  });

  it("copies referral URL on copy click", async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByLabelText("Copy link")).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Copy link"));
    });
    expect(copyToClipboard).toHaveBeenCalledWith(
      "https://jeffreysprompts.com/r/TESTCODE"
    );
  });

  it("shows error state on fetch failure", async () => {
    // @ts-expect-error: Mocking global fetch for tests
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    });
    render(<ReferralCard />);
    await waitFor(() => {
      expect(
        screen.getByText(/Unable to load referral information/)
      ).toBeInTheDocument();
    });
  });

  it("opens share modal on Share button click", async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText("Share Your Link")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Share Your Link"));
    expect(screen.getByTestId("share-modal")).toBeInTheDocument();
  });

  it("shows max rewards per year", async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText(/Earn up to \$500 per year/)).toBeInTheDocument();
    });
  });
});
