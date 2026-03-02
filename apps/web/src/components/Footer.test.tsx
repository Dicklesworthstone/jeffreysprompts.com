/**
 * Tests for Footer component.
 *
 * Covers: link sections, social links, CLI install snippet,
 * copyright, ecosystem links.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "./Footer";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, whileInView, viewport, transition, ...rest } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
    a: ({ children, ...props }: Record<string, unknown>) => {
      const { whileHover, whileTap, ...rest } = props;
      return <a {...rest}>{children as React.ReactNode}</a>;
    },
  },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Footer", () => {
  // --- Section headers ---

  it("renders Product section", () => {
    render(<Footer />);
    expect(screen.getByText("Product")).toBeInTheDocument();
  });

  it("renders Resources section", () => {
    render(<Footer />);
    expect(screen.getByText("Resources")).toBeInTheDocument();
  });

  it("renders Legal section", () => {
    render(<Footer />);
    expect(screen.getByText("Legal")).toBeInTheDocument();
  });

  it("renders CLI Tool section", () => {
    render(<Footer />);
    expect(screen.getByText("CLI Tool")).toBeInTheDocument();
  });

  // --- Product links ---

  it("shows Browse Prompts link", () => {
    render(<Footer />);
    expect(screen.getByText("Browse Prompts")).toBeInTheDocument();
  });

  it("shows Bundles link", () => {
    render(<Footer />);
    expect(screen.getByText("Bundles")).toBeInTheDocument();
  });

  it("shows Pricing link", () => {
    render(<Footer />);
    expect(screen.getByText("Pricing")).toBeInTheDocument();
  });

  // --- Legal links ---

  it("shows Terms of Service link", () => {
    render(<Footer />);
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
  });

  it("shows Privacy Policy link", () => {
    render(<Footer />);
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("shows Community Guidelines link", () => {
    render(<Footer />);
    expect(screen.getByText("Community Guidelines")).toBeInTheDocument();
  });

  // --- Resource links ---

  it("shows Contribute link", () => {
    render(<Footer />);
    expect(screen.getByText("Contribute")).toBeInTheDocument();
  });

  it("shows Contact Support link", () => {
    render(<Footer />);
    expect(screen.getByText("Contact Support")).toBeInTheDocument();
  });

  // --- Social links ---

  it("has Twitter social link", () => {
    render(<Footer />);
    const twitterLink = screen.getByLabelText("Twitter");
    expect(twitterLink).toHaveAttribute("href", "https://twitter.com/doodlestein");
  });

  it("has GitHub social link", () => {
    render(<Footer />);
    const githubLink = screen.getByLabelText("GitHub");
    expect(githubLink).toHaveAttribute("href", "https://github.com/Dicklesworthstone/jeffreysprompts.com");
  });

  it("has Email social link", () => {
    render(<Footer />);
    const emailLink = screen.getByLabelText("Email");
    expect(emailLink).toHaveAttribute("href", "mailto:hello@jeffreysprompts.com");
  });

  // --- CLI install ---

  it("shows CLI install command", () => {
    render(<Footer />);
    expect(screen.getByText(/curl -fsSL jeffreysprompts\.com\/install-cli\.sh/)).toBeInTheDocument();
  });

  // --- Brand ---

  it("shows brand name", () => {
    render(<Footer />);
    // Brand name is split across spans: "Jeffreys" + "Prompts"
    expect(screen.getByText("Prompts")).toBeInTheDocument();
  });

  it("shows tagline", () => {
    render(<Footer />);
    expect(screen.getByText(/premium prompt library/)).toBeInTheDocument();
  });

  // --- Copyright ---

  it("shows copyright with current year", () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year}`))).toBeInTheDocument();
    expect(screen.getByText(/Jeffrey Emanuel/)).toBeInTheDocument();
  });

  // --- Ecosystem ---

  it("shows ecosystem links", () => {
    render(<Footer />);
    expect(screen.getByText("jeffreyemanuel.com")).toBeInTheDocument();
    expect(screen.getByText("agent-flywheel.com")).toBeInTheDocument();
  });

  // --- External links open in new tab ---

  it("external links have noopener noreferrer", () => {
    render(<Footer />);
    const githubLink = screen.getByLabelText("GitHub");
    expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(githubLink).toHaveAttribute("target", "_blank");
  });
});
