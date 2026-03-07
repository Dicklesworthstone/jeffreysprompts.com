import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReferralLandingPage, { generateMetadata } from "./page";
import { getOrCreateReferralCode } from "@/lib/referral/referral-store";
import { createSignedToken } from "@/lib/user-id";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function clearReferralStore() {
  const globalStore = globalThis as unknown as Record<string, unknown>;
  globalStore.__jfp_referral_store__ = undefined;
}

describe("ReferralLandingPage", () => {
  beforeEach(() => {
    clearReferralStore();
  });

  it("uses locale-aware links for a valid referral code", async () => {
    const referralCode = getOrCreateReferralCode("referrer-1");
    const page = await ReferralLandingPage({
      params: Promise.resolve({ locale: "es", code: referralCode.code }),
    });

    render(page);

    expect(screen.getByRole("link", { name: "Claim Your Reward" })).toHaveAttribute(
      "href",
      `/es?ref=${encodeURIComponent(referralCode.code)}`
    );
    expect(
      screen.getByRole("link", { name: "Learn More About JeffreysPrompts" })
    ).toHaveAttribute("href", "/es");
  });

  it("shows an unavailable state for an invalid referral code", async () => {
    const page = await ReferralLandingPage({
      params: Promise.resolve({ locale: "fr", code: "missing123" }),
    });

    render(page);

    expect(screen.getByText("Referral Link Unavailable")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore JeffreysPrompts" })
    ).toHaveAttribute("href", "/fr");
    expect(screen.queryByRole("link", { name: "Claim Your Reward" })).not.toBeInTheDocument();
  });

  it("returns unavailable metadata for an invalid referral code", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en", code: "missing123" }),
    });

    expect(metadata.title).toBe("Referral Link Unavailable - JeffreysPrompts");
  });

  it("accepts a valid referral code even after the in-memory store is cleared", async () => {
    const referralCode = getOrCreateReferralCode("referrer-2");
    clearReferralStore();

    const page = await ReferralLandingPage({
      params: Promise.resolve({ locale: "es", code: referralCode.code }),
    });

    render(page);

    expect(screen.getByRole("link", { name: "Claim Your Reward" })).toHaveAttribute(
      "href",
      `/es?ref=${encodeURIComponent(referralCode.code)}`
    );
  });

  it("still accepts legacy signed referral codes after store state is gone", async () => {
    const legacyCode = createSignedToken("legacy-referrer", "referral-code");
    clearReferralStore();

    const page = await ReferralLandingPage({
      params: Promise.resolve({ locale: "fr", code: legacyCode }),
    });

    render(page);

    expect(screen.getByRole("link", { name: "Claim Your Reward" })).toHaveAttribute(
      "href",
      `/fr?ref=${encodeURIComponent(legacyCode)}`
    );
  });
});
