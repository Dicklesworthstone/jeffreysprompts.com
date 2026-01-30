/**
 * Unit tests for components/ui/badge.tsx
 *
 * Tests the Badge component's variants and accessibility.
 * Philosophy: NO mocks - test real rendering behavior.
 *
 * Run with: bun run test
 */

import Link from "next/link";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

// ============================================================================
// Tests: Basic Rendering
// ============================================================================

describe("Badge", () => {
  describe("basic rendering", () => {
    it("renders with children text", () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText("New")).toBeInTheDocument();
    });

    it("renders as span by default", () => {
      render(<Badge data-testid="badge">Label</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge.tagName).toBe("SPAN");
    });

    it("has data-slot attribute", () => {
      render(<Badge data-testid="badge">Label</Badge>);
      expect(screen.getByTestId("badge")).toHaveAttribute("data-slot", "badge");
    });

    it("applies base classes", () => {
      render(<Badge data-testid="badge">Label</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge.className).toContain("inline-flex");
      expect(badge.className).toContain("rounded-full");
      expect(badge.className).toContain("text-xs");
    });

    it("applies custom className", () => {
      render(<Badge className="custom-badge" data-testid="badge">Label</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge.className).toContain("custom-badge");
    });
  });

  // ============================================================================
  // Tests: Variants
  // ============================================================================

  describe("variants", () => {
    it("applies default variant classes", () => {
      render(<Badge variant="default" data-testid="badge">Default</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge.className).toContain("bg-primary");
      expect(badge.className).toContain("text-primary-foreground");
    });

    it("applies secondary variant classes", () => {
      render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge.className).toContain("bg-secondary");
      expect(badge.className).toContain("text-secondary-foreground");
    });

    it("applies destructive variant classes", () => {
      render(<Badge variant="destructive" data-testid="badge">Destructive</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge.className).toContain("bg-destructive");
      expect(badge.className).toContain("text-white");
    });

    it("applies outline variant classes", () => {
      render(<Badge variant="outline" data-testid="badge">Outline</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge.className).toContain("text-foreground");
    });

    it("uses default variant when none specified", () => {
      render(<Badge data-testid="badge">No variant</Badge>);
      const badge = screen.getByTestId("badge");
      expect(badge.className).toContain("bg-primary");
    });
  });

  // ============================================================================
  // Tests: asChild (Slot pattern)
  // ============================================================================

  describe("asChild prop (Slot pattern)", () => {
    it("renders as child element when asChild is true", () => {
      render(
        <Badge asChild>
          <Link href="/test">Link Badge</Link>
        </Badge>
      );
      const link = screen.getByRole("link", { name: "Link Badge" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/test");
    });

    it("applies badge classes to child when asChild is true", () => {
      render(
        <Badge asChild variant="secondary">
          <Link href="/test" data-testid="badge-link">Link Badge</Link>
        </Badge>
      );
      const link = screen.getByTestId("badge-link");
      expect(link.className).toContain("bg-secondary");
      expect(link.className).toContain("rounded-full");
    });

    it("preserves child element attributes with asChild", () => {
      render(
        <Badge asChild>
          <button type="submit" data-testid="badge-button">Submit</button>
        </Badge>
      );
      const button = screen.getByTestId("badge-button");
      expect(button.getAttribute("type")).toBe("submit");
    });
  });

  // ============================================================================
  // Tests: SVG/Icon support
  // ============================================================================

  describe("icon support", () => {
    it("renders with SVG icon", () => {
      render(
        <Badge data-testid="badge">
          <svg data-testid="icon" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
          </svg>
          With Icon
        </Badge>
      );
      expect(screen.getByTestId("icon")).toBeInTheDocument();
      expect(screen.getByText("With Icon")).toBeInTheDocument();
    });

    it("applies icon size classes", () => {
      render(<Badge data-testid="badge">Label</Badge>);
      const badge = screen.getByTestId("badge");
      // Badge has [&>svg]:size-3 for icon sizing
      expect(badge.className).toContain("[&>svg]:size-3");
    });
  });

  // ============================================================================
  // Tests: Accessibility
  // ============================================================================

  describe("accessibility", () => {
    it("can be focused when rendered as link", () => {
      render(
        <Badge asChild>
          <Link href="/test">Focusable Badge</Link>
        </Badge>
      );
      const link = screen.getByRole("link");
      expect(link.className).toContain("focus-visible:ring");
    });

    it("supports aria-label", () => {
      render(<Badge aria-label="Status: Active">Active</Badge>);
      const badge = screen.getByLabelText("Status: Active");
      expect(badge).toBeInTheDocument();
    });
  });
});
