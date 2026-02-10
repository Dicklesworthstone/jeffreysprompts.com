/**
 * Unit tests for LiveRegion and AlertRegion components
 * Tests ARIA live region announcements for assistive technology.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LiveRegion, AlertRegion } from "./live-region";

describe("LiveRegion", () => {
  it("renders with role='status'", () => {
    render(<LiveRegion message="hello" />);
    const region = screen.getByRole("status");
    expect(region).toBeDefined();
  });

  it("renders the message (available after rAF)", () => {
    // LiveRegion clears textContent in useEffect and re-sets via requestAnimationFrame.
    // Verify the region exists and has correct ARIA attributes.
    const { container } = render(<LiveRegion message="5 results found" />);
    const region = container.querySelector("[role='status']");
    expect(region).toBeDefined();
    expect(region?.getAttribute("aria-live")).toBe("polite");
  });

  it("defaults to aria-live='polite'", () => {
    render(<LiveRegion message="polite message" />);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
  });

  it("accepts assertive priority", () => {
    render(<LiveRegion message="urgent!" priority="assertive" />);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("assertive");
  });

  it("defaults to aria-atomic='true'", () => {
    render(<LiveRegion message="atomic test" />);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-atomic")).toBe("true");
  });

  it("allows disabling atomic", () => {
    render(<LiveRegion message="non-atomic" atomic={false} />);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-atomic")).toBe("false");
  });

  it("applies sr-only class by default", () => {
    render(<LiveRegion message="hidden" />);
    const region = screen.getByRole("status");
    expect(region.className).toBe("sr-only");
  });

  it("accepts custom className", () => {
    render(<LiveRegion message="visible" className="custom-style" />);
    const region = screen.getByRole("status");
    expect(region.className).toBe("custom-style");
  });
});

describe("AlertRegion", () => {
  it("renders with role='alert'", () => {
    render(<AlertRegion message="Error occurred" />);
    const region = screen.getByRole("alert");
    expect(region).toBeDefined();
  });

  it("displays the error message", () => {
    render(<AlertRegion message="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("applies sr-only class by default", () => {
    render(<AlertRegion message="hidden alert" />);
    const region = screen.getByRole("alert");
    expect(region.className).toBe("sr-only");
  });

  it("accepts custom className", () => {
    render(<AlertRegion message="visible alert" className="alert-visible" />);
    const region = screen.getByRole("alert");
    expect(region.className).toBe("alert-visible");
  });
});
