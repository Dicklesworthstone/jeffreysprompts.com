/**
 * Unit tests for SkipLink component
 * Tests WCAG 2.4.1 bypass block accessibility link.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SkipLink } from "./skip-link";

describe("SkipLink", () => {
  it("renders an anchor element", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link.tagName).toBe("A");
  });

  it("uses default text 'Skip to main content'", () => {
    render(<SkipLink />);
    expect(screen.getByText("Skip to main content")).toBeDefined();
  });

  it("uses default targetId 'main-content'", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link.getAttribute("href")).toBe("#main-content");
  });

  it("accepts custom targetId", () => {
    render(<SkipLink targetId="custom-target" />);
    const link = screen.getByText("Skip to main content");
    expect(link.getAttribute("href")).toBe("#custom-target");
  });

  it("accepts custom children text", () => {
    render(<SkipLink>Skip navigation</SkipLink>);
    expect(screen.getByText("Skip navigation")).toBeDefined();
  });

  it("applies custom className", () => {
    render(<SkipLink className="custom-class" />);
    const link = screen.getByText("Skip to main content");
    expect(link.className).toContain("custom-class");
  });

  it("has sr-only class for screen-reader-only by default", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link.className).toContain("sr-only");
  });

  it("focuses target element on click", () => {
    const target = document.createElement("main");
    target.id = "main-content";
    document.body.appendChild(target);
    const focusSpy = vi.spyOn(target, "focus");

    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    fireEvent.click(link);

    expect(focusSpy).toHaveBeenCalled();
    document.body.removeChild(target);
  });

  it("sets tabindex on target if not present", () => {
    const target = document.createElement("main");
    target.id = "main-content";
    document.body.appendChild(target);

    render(<SkipLink />);
    fireEvent.click(screen.getByText("Skip to main content"));

    expect(target.getAttribute("tabindex")).toBe("-1");
    document.body.removeChild(target);
  });

  it("does not override existing tabindex", () => {
    const target = document.createElement("main");
    target.id = "main-content";
    target.setAttribute("tabindex", "0");
    document.body.appendChild(target);

    render(<SkipLink />);
    fireEvent.click(screen.getByText("Skip to main content"));

    expect(target.getAttribute("tabindex")).toBe("0");
    document.body.removeChild(target);
  });

  it("handles missing target gracefully", () => {
    render(<SkipLink targetId="nonexistent" />);
    // Should not throw
    fireEvent.click(screen.getByText("Skip to main content"));
  });
});
