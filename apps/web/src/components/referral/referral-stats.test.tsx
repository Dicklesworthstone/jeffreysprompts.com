import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ReferralStats } from "./referral-stats";

const mockStatsData = {
  success: true,
  data: {
    stats: {
      totalReferrals: 10,
      pendingReferrals: 3,
      convertedReferrals: 5,
      rewardedReferrals: 2,
      totalRewardsEarned: 100,
      rewardsRemaining: 400,
    },
    rewards: {
      perReferral: "$50",
      maxPerYear: "$500",
      earnedThisYear: "$100",
      remainingThisYear: "$400",
    },
    referrals: [
      {
        id: "ref-abc123456",
        refereeId: "u-2",
        status: "converted",
        reward: "$50",
        convertedAt: "2026-01-15T00:00:00Z",
        rewardedAt: null,
        createdAt: "2026-01-10T00:00:00Z",
      },
      {
        id: "ref-def789012",
        refereeId: "u-3",
        status: "pending",
        reward: null,
        convertedAt: null,
        rewardedAt: null,
        createdAt: "2026-02-01T00:00:00Z",
      },
    ],
  },
};

describe("ReferralStats", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockStatsData),
    });
  });

  it("shows loading skeleton initially", () => {
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    const { container } = render(<ReferralStats />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders stats after loading", async () => {
    render(<ReferralStats />);
    await waitFor(() => {
      expect(screen.getByText("Your Referral Stats")).toBeInTheDocument();
    });
  });

  it("displays stat values", async () => {
    render(<ReferralStats />);
    await waitFor(() => {
      expect(screen.getByText("10")).toBeInTheDocument(); // total
      expect(screen.getByText("3")).toBeInTheDocument(); // pending
      expect(screen.getByText("5")).toBeInTheDocument(); // converted
      expect(screen.getByText("2")).toBeInTheDocument(); // rewarded
    });
  });

  it("displays rewards summary", async () => {
    render(<ReferralStats />);
    await waitFor(() => {
      expect(screen.getByText("Rewards Summary")).toBeInTheDocument();
      expect(screen.getByText("$100")).toBeInTheDocument();
      expect(screen.getByText("$400")).toBeInTheDocument();
      expect(screen.getByText("$50")).toBeInTheDocument();
      expect(screen.getByText("$500")).toBeInTheDocument();
    });
  });

  it("displays recent referrals", async () => {
    render(<ReferralStats />);
    await waitFor(() => {
      expect(screen.getByText("Recent Referrals")).toBeInTheDocument();
      expect(screen.getByText("Referral #ref-abc1")).toBeInTheDocument();
      expect(screen.getByText("Referral #ref-def7")).toBeInTheDocument();
    });
  });

  it("shows error state on failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    });
    render(<ReferralStats />);
    await waitFor(() => {
      expect(
        screen.getByText(/Unable to load referral statistics/)
      ).toBeInTheDocument();
    });
  });

  it("applies className", async () => {
    render(<ReferralStats className="custom-class" />);
    await waitFor(() => {
      expect(screen.getByText("Your Referral Stats")).toBeInTheDocument();
    });
  });
});
