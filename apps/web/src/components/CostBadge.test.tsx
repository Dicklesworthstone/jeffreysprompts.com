import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CostBadge } from "./CostBadge";

// Mock the core module
vi.mock("@jeffreysprompts/core", () => ({
  estimateCost: vi.fn(({ inputTokens }) => ({
    model: "gpt-4o-mini",
    inputTokens,
    outputTokens: 0,
    totalTokens: inputTokens,
    inputCost: (inputTokens / 1000) * 0.00015,
    outputCost: 0,
    totalCost: (inputTokens / 1000) * 0.00015,
    currency: "USD" as const,
    unit: "per_1k_tokens" as const,
  })),
  DEFAULT_MODEL: "gpt-4o-mini",
  DEFAULT_PRICING_TABLE: {
    "gpt-4o-mini": { inputPer1k: 0.00015, outputPer1k: 0.0006, currency: "USD" },
  },
}));

describe("CostBadge", () => {
  it("renders cost estimate in compact mode", () => {
    render(<CostBadge tokens={1000} />);

    // 1000 tokens at $0.00015/1k = $0.00015, formatted as $0.0001
    expect(screen.getByText("$0.0001")).toBeInTheDocument();
  });

  it("renders cost estimate in detailed mode", () => {
    render(<CostBadge tokens={1000} variant="detailed" />);

    expect(screen.getByText("$0.0001")).toBeInTheDocument();
    expect(screen.getByText(/gpt-4o-mini/)).toBeInTheDocument();
    expect(screen.getByText(/1000 tokens/)).toBeInTheDocument();
  });

  it("shows tooltip with model info in compact mode", () => {
    render(<CostBadge tokens={5000} />);

    const badge = screen.getByTitle(/Estimated cost using gpt-4o-mini/);
    expect(badge).toBeInTheDocument();
  });

  it("formats small costs with more decimals", () => {
    render(<CostBadge tokens={100} />);

    // 100 tokens at $0.00015/1k = $0.000015
    expect(screen.getByText("$0.0000")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<CostBadge tokens={1000} className="custom-class" />);

    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });

  it("uses custom model when provided", () => {
    render(<CostBadge tokens={1000} model="gpt-4o" variant="detailed" />);

    expect(screen.getByText(/gpt-4o/)).toBeInTheDocument();
  });
});
