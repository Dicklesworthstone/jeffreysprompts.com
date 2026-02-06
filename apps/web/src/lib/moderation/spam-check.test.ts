import { describe, it, expect } from "vitest";
import { checkContentForSpam } from "./spam-check";

describe("spam-check", () => {
  it("classifies clean content as not spam", () => {
    const result = checkContentForSpam(
      "This prompt helped me write better code reviews. Highly recommend it."
    );
    expect(result.isSpam).toBe(false);
    expect(result.requiresReview).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it("flags obvious spam as spam", () => {
    const result = checkContentForSpam(
      "FREE MONEY GUARANTEED! Click here to buy now at https://spam.com and https://more-spam.com and https://evil.com. Winner of bitcoin airdrop!"
    );
    expect(result.isSpam).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("marks borderline content for review", () => {
    // One spam term (0.15) + one URL (0.1) + excessive caps (0.2) = 0.45, which is >= 0.4 threshold
    const result = checkContentForSpam(
      "CHECK OUT THIS GUARANTEED AMAZING PROMPT AT https://example.com ITS THE BEST THING EVER MADE"
    );
    expect(result.requiresReview).toBe(true);
    expect(result.isSpam).toBe(false);
    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
    expect(result.confidence).toBeLessThan(0.7);
  });

  it("caps confidence score at 1.0", () => {
    // Lots of spam signals that would exceed 1.0 raw
    const result = checkContentForSpam(
      "FREE MONEY GUARANTEED CLICK HERE BUY NOW LIMITED OFFER WINNER PROMO CODE CRYPTO BITCOIN AIRDROP at https://a.com and https://b.com and https://c.com AAAAAAAAA"
    );
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("returns reasons for each signal", () => {
    const result = checkContentForSpam("Click here for free money at https://scam.com");
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes("click here"))).toBe(true);
  });
});
