/**
 * Tests for ViewTransitionLink component.
 *
 * Covers: basic rendering, click handling, external link bypass,
 * modifier key bypass, noTransition prop.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ViewTransitionLink } from "./ViewTransitionLink";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigateWithTransition = vi.fn();
let mockLocale = "en";
vi.mock("@/hooks/useViewTransition", () => ({
  useViewTransition: () => ({
    navigateWithTransition: mockNavigateWithTransition,
    isSupported: true,
  }),
}));
vi.mock("next-intl", () => ({
  useLocale: () => mockLocale,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ViewTransitionLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale = "en";
  });

  it("renders children", () => {
    render(<ViewTransitionLink href="/about">About Us</ViewTransitionLink>);
    expect(screen.getByText("About Us")).toBeInTheDocument();
  });

  it("renders as a link element", () => {
    render(<ViewTransitionLink href="/about">About</ViewTransitionLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/about");
  });

  it("navigates with transition on click", () => {
    render(<ViewTransitionLink href="/about">About</ViewTransitionLink>);

    const link = screen.getByRole("link");
    fireEvent.click(link);

    expect(mockNavigateWithTransition).toHaveBeenCalledWith("/about");
  });

  it("calls original onClick handler", () => {
    const onClick = vi.fn();
    render(
      <ViewTransitionLink href="/about" onClick={onClick}>
        About
      </ViewTransitionLink>
    );

    fireEvent.click(screen.getByRole("link"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not use transition when noTransition is true", () => {
    render(
      <ViewTransitionLink href="/about" noTransition>
        About
      </ViewTransitionLink>
    );

    fireEvent.click(screen.getByRole("link"));

    expect(mockNavigateWithTransition).not.toHaveBeenCalled();
  });

  it("does not use transition on ctrl+click", () => {
    render(<ViewTransitionLink href="/about">About</ViewTransitionLink>);

    fireEvent.click(screen.getByRole("link"), { ctrlKey: true });

    expect(mockNavigateWithTransition).not.toHaveBeenCalled();
  });

  it("does not use transition on meta+click", () => {
    render(<ViewTransitionLink href="/about">About</ViewTransitionLink>);

    fireEvent.click(screen.getByRole("link"), { metaKey: true });

    expect(mockNavigateWithTransition).not.toHaveBeenCalled();
  });

  it("does not use transition for external http links", () => {
    render(
      <ViewTransitionLink href="https://external.com">
        External
      </ViewTransitionLink>
    );

    fireEvent.click(screen.getByRole("link"));

    expect(mockNavigateWithTransition).not.toHaveBeenCalled();
  });

  it("does not rewrite scheme-based links", () => {
    mockLocale = "es";

    render(<ViewTransitionLink href="mailto:test@example.com">Email</ViewTransitionLink>);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "mailto:test@example.com");

    fireEvent.click(link);
    expect(mockNavigateWithTransition).not.toHaveBeenCalled();
  });

  it("localizes internal links for non-default locales", () => {
    mockLocale = "es";

    render(<ViewTransitionLink href="/about">About</ViewTransitionLink>);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/es/about");

    fireEvent.click(link);
    expect(mockNavigateWithTransition).toHaveBeenCalledWith("/es/about");
  });
});
