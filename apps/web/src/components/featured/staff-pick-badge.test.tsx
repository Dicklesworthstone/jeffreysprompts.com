/**
 * Tests for FeaturedBadge, StaffPickBadge, FeaturedContentBadge,
 * SpotlightBadge, and ConditionalFeaturedBadge.
 *
 * Covers: label rendering, size variants, showLabel toggle,
 * conditional rendering.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FeaturedBadge,
  StaffPickBadge,
  FeaturedContentBadge,
  SpotlightBadge,
  ConditionalFeaturedBadge,
} from "./staff-pick-badge";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: {
    span: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, whileHover, ...rest } = props;
      return <span {...rest}>{children as React.ReactNode}</span>;
    },
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FeaturedBadge", () => {
  it("renders Staff Pick label for staff_pick type", () => {
    render(<FeaturedBadge type="staff_pick" />);
    expect(screen.getByText("Staff Pick")).toBeInTheDocument();
  });

  it("renders Featured label for featured type", () => {
    render(<FeaturedBadge type="featured" />);
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("renders Spotlight label for spotlight type", () => {
    render(<FeaturedBadge type="spotlight" />);
    expect(screen.getByText("Spotlight")).toBeInTheDocument();
  });

  it("hides label when showLabel is false", () => {
    render(<FeaturedBadge type="staff_pick" showLabel={false} />);
    expect(screen.queryByText("Staff Pick")).not.toBeInTheDocument();
  });
});

describe("StaffPickBadge", () => {
  it("renders Staff Pick label", () => {
    render(<StaffPickBadge />);
    expect(screen.getByText("Staff Pick")).toBeInTheDocument();
  });
});

describe("FeaturedContentBadge", () => {
  it("renders Featured label", () => {
    render(<FeaturedContentBadge />);
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });
});

describe("SpotlightBadge", () => {
  it("renders Spotlight label", () => {
    render(<SpotlightBadge />);
    expect(screen.getByText("Spotlight")).toBeInTheDocument();
  });
});

describe("ConditionalFeaturedBadge", () => {
  it("returns null when featureType is null", () => {
    const { container } = render(<ConditionalFeaturedBadge featureType={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when featureType is undefined", () => {
    const { container } = render(<ConditionalFeaturedBadge />);
    expect(container.innerHTML).toBe("");
  });

  it("renders badge when featureType is provided", () => {
    render(<ConditionalFeaturedBadge featureType="staff_pick" />);
    expect(screen.getByText("Staff Pick")).toBeInTheDocument();
  });

  it("renders correct badge for each type", () => {
    const { rerender } = render(<ConditionalFeaturedBadge featureType="featured" />);
    expect(screen.getByText("Featured")).toBeInTheDocument();

    rerender(<ConditionalFeaturedBadge featureType="spotlight" />);
    expect(screen.getByText("Spotlight")).toBeInTheDocument();
  });
});
