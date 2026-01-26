/**
 * Unit tests for Card components
 *
 * Tests the Card, CardHeader, CardTitle, CardDescription, CardContent,
 * CardFooter, CardAction, and FeatureCard components.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see @/components/ui/card.tsx
 */

import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
  FeatureCard,
} from "./card";

describe("Card", () => {
  describe("Card (root)", () => {
    it("renders children", () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText("Card content")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<Card className="custom-card">Content</Card>);
      const card = screen.getByText("Content");
      expect(card).toHaveClass("custom-card");
    });

    it("has card slot attribute", () => {
      render(<Card>Content</Card>);
      expect(screen.getByText("Content")).toHaveAttribute("data-slot", "card");
    });

    it("forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("applies hover styles when hover prop is true", () => {
      render(<Card hover="lift">Content</Card>);
      const card = screen.getByText("Content");
      // The lift hover variant applies translate and enhanced shadows
      expect(card).toHaveClass("hover:-translate-y-1.5");
    });
  });

  describe("CardHeader", () => {
    it("renders children", () => {
      render(<CardHeader>Header content</CardHeader>);
      expect(screen.getByText("Header content")).toBeInTheDocument();
    });

    it("has card-header slot attribute", () => {
      render(<CardHeader>Header</CardHeader>);
      expect(screen.getByText("Header")).toHaveAttribute("data-slot", "card-header");
    });

    it("applies custom className", () => {
      render(<CardHeader className="custom-header">Header</CardHeader>);
      expect(screen.getByText("Header")).toHaveClass("custom-header");
    });
  });

  describe("CardTitle", () => {
    it("renders as h3 element", () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByRole("heading", { level: 3, name: "Title" })).toBeInTheDocument();
    });

    it("has card-title slot attribute", () => {
      render(<CardTitle>Title</CardTitle>);
      expect(screen.getByRole("heading")).toHaveAttribute("data-slot", "card-title");
    });

    it("applies custom className", () => {
      render(<CardTitle className="custom-title">Title</CardTitle>);
      expect(screen.getByRole("heading")).toHaveClass("custom-title");
    });
  });

  describe("CardDescription", () => {
    it("renders as p element", () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText("Description text")).toBeInTheDocument();
    });

    it("has card-description slot attribute", () => {
      render(<CardDescription>Description</CardDescription>);
      expect(screen.getByText("Description")).toHaveAttribute("data-slot", "card-description");
    });

    it("applies custom className", () => {
      render(<CardDescription className="custom-desc">Description</CardDescription>);
      expect(screen.getByText("Description")).toHaveClass("custom-desc");
    });
  });

  describe("CardContent", () => {
    it("renders children", () => {
      render(<CardContent>Main content here</CardContent>);
      expect(screen.getByText("Main content here")).toBeInTheDocument();
    });

    it("has card-content slot attribute", () => {
      render(<CardContent>Content</CardContent>);
      expect(screen.getByText("Content")).toHaveAttribute("data-slot", "card-content");
    });

    it("applies custom className", () => {
      render(<CardContent className="custom-content">Content</CardContent>);
      expect(screen.getByText("Content")).toHaveClass("custom-content");
    });
  });

  describe("CardFooter", () => {
    it("renders children", () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText("Footer content")).toBeInTheDocument();
    });

    it("has card-footer slot attribute", () => {
      render(<CardFooter>Footer</CardFooter>);
      expect(screen.getByText("Footer")).toHaveAttribute("data-slot", "card-footer");
    });

    it("applies custom className", () => {
      render(<CardFooter className="custom-footer">Footer</CardFooter>);
      expect(screen.getByText("Footer")).toHaveClass("custom-footer");
    });
  });

  describe("CardAction", () => {
    it("renders children", () => {
      render(<CardAction>Action buttons</CardAction>);
      expect(screen.getByText("Action buttons")).toBeInTheDocument();
    });

    it("has card-action slot attribute", () => {
      render(<CardAction>Actions</CardAction>);
      expect(screen.getByText("Actions")).toHaveAttribute("data-slot", "card-action");
    });

    it("applies custom className", () => {
      render(<CardAction className="custom-action">Actions</CardAction>);
      expect(screen.getByText("Actions")).toHaveClass("custom-action");
    });
  });

  describe("FeatureCard", () => {
    it("renders children", () => {
      render(<FeatureCard>Feature content</FeatureCard>);
      expect(screen.getByText("Feature content")).toBeInTheDocument();
    });

    it("has feature-card slot attribute", () => {
      render(<FeatureCard>Feature</FeatureCard>);
      expect(screen.getByText("Feature")).toHaveAttribute("data-slot", "feature-card");
    });

    it("has feature-card and group classes", () => {
      render(<FeatureCard>Feature</FeatureCard>);
      const card = screen.getByText("Feature");
      expect(card).toHaveClass("feature-card", "group");
    });

    it("applies custom className", () => {
      render(<FeatureCard className="custom-feature">Feature</FeatureCard>);
      expect(screen.getByText("Feature")).toHaveClass("custom-feature");
    });
  });

  describe("composition", () => {
    it("renders a complete card structure", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card</CardTitle>
            <CardDescription>A test description</CardDescription>
          </CardHeader>
          <CardContent>Main content goes here</CardContent>
          <CardFooter>
            <CardAction>Actions</CardAction>
          </CardFooter>
        </Card>
      );

      expect(screen.getByRole("heading", { name: "Test Card" })).toBeInTheDocument();
      expect(screen.getByText("A test description")).toBeInTheDocument();
      expect(screen.getByText("Main content goes here")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });
});
