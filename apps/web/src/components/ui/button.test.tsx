/**
 * Unit tests for Button component
 *
 * Tests the Button component's variants, sizes, loading state, and accessibility.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see @/components/ui/button.tsx
 */

import Link from "next/link";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  describe("rendering", () => {
    it("renders with children text", () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
    });

    it("renders as a button element by default", () => {
      render(<Button>Test</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<Button className="custom-class">Test</Button>);
      expect(screen.getByRole("button")).toHaveClass("custom-class");
    });

    it("forwards ref to button element", () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Test</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe("variants", () => {
    it("applies default variant styles", () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", "default");
    });

    it("applies destructive variant", () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", "destructive");
    });

    it("applies outline variant", () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", "outline");
    });

    it("applies secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", "secondary");
    });

    it("applies ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", "ghost");
    });

    it("applies link variant", () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", "link");
    });

    it("applies glow variant", () => {
      render(<Button variant="glow">Glow</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", "glow");
    });
  });

  describe("sizes", () => {
    it("applies default size", () => {
      render(<Button>Default Size</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-size", "default");
    });

    it("applies sm size", () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-size", "sm");
    });

    it("applies lg size", () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-size", "lg");
    });

    it("applies xl size", () => {
      render(<Button size="xl">Extra Large</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-size", "xl");
    });

    it("applies icon size", () => {
      render(<Button size="icon">+</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-size", "icon");
    });
  });

  describe("loading state", () => {
    it("shows loading spinner when loading", () => {
      render(<Button loading>Submit</Button>);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
      // Original children should not be visible
      expect(screen.queryByText("Submit")).not.toBeInTheDocument();
    });

    it("disables button when loading", () => {
      render(<Button loading>Submit</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("renders spinner SVG when loading", () => {
      render(<Button loading>Submit</Button>);
      const button = screen.getByRole("button");
      const svg = button.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass("animate-spin");
    });
  });

  describe("disabled state", () => {
    it("is disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("is disabled when loading prop is true", () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("interactions", () => {
    it("calls onClick when clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      await user.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );

      await user.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("does not call onClick when loading", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Loading
        </Button>
      );

      await user.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("asChild", () => {
    it("renders as slot when asChild is true", () => {
      render(
        <Button asChild>
          <Link href="/test">Link Button</Link>
        </Button>
      );
      expect(screen.getByRole("link", { name: "Link Button" })).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has button slot attribute", () => {
      render(<Button>Accessible Button</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("data-slot", "button");
    });

    it("supports aria-label", () => {
      render(<Button aria-label="Close dialog">×</Button>);
      expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
    });

    it("supports type attribute", () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });
  });
});
