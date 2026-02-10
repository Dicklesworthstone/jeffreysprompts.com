/**
 * Unit tests for Label, LabelSimple, and FormField components
 * Tests form label rendering, variants, and accessibility features.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Label, LabelSimple, FormField } from "./label";

describe("Label", () => {
  it("renders label text", () => {
    render(<Label>Username</Label>);
    expect(screen.getByText("Username")).toBeDefined();
  });

  it("renders within a wrapper div", () => {
    const { container } = render(<Label>Email</Label>);
    const wrapper = container.querySelector("[data-slot='label-wrapper']");
    expect(wrapper).toBeDefined();
  });

  it("renders label element with data-slot='label'", () => {
    const { container } = render(<Label>Name</Label>);
    const label = container.querySelector("[data-slot='label']");
    expect(label).toBeDefined();
  });

  it("shows required indicator when required prop is true", () => {
    const { container } = render(<Label required>Name</Label>);
    const indicator = container.querySelector("[data-slot='label-required']");
    expect(indicator).toBeDefined();
    expect(indicator?.textContent).toBe("*");
  });

  it("hides required indicator from screen readers", () => {
    const { container } = render(<Label required>Name</Label>);
    const indicator = container.querySelector("[data-slot='label-required']");
    expect(indicator?.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows optional indicator when optional prop is true", () => {
    const { container } = render(<Label optional>Name</Label>);
    const indicator = container.querySelector("[data-slot='label-optional']");
    expect(indicator).toBeDefined();
    expect(indicator?.textContent).toBe("(optional)");
  });

  it("required overrides optional", () => {
    const { container } = render(<Label required optional>Name</Label>);
    expect(container.querySelector("[data-slot='label-required']")).toBeDefined();
    expect(container.querySelector("[data-slot='label-optional']")).toBeNull();
  });

  it("renders description text when provided", () => {
    const { container } = render(
      <Label description="Enter your full name">Name</Label>
    );
    const desc = container.querySelector("[data-slot='label-description']");
    expect(desc).toBeDefined();
    expect(desc?.textContent).toBe("Enter your full name");
  });

  it("does not render description when not provided", () => {
    const { container } = render(<Label>Name</Label>);
    expect(container.querySelector("[data-slot='label-description']")).toBeNull();
  });

  it("sets data-error attribute when error is true", () => {
    const { container } = render(<Label error>Name</Label>);
    const label = container.querySelector("[data-slot='label']");
    expect(label?.getAttribute("data-error")).toBe("true");
  });

  it("applies custom className", () => {
    const { container } = render(<Label className="my-label">Name</Label>);
    const label = container.querySelector("[data-slot='label']");
    expect(label?.className).toContain("my-label");
  });

  it("connects to input via htmlFor", () => {
    const { container } = render(<Label htmlFor="email-input">Email</Label>);
    const label = container.querySelector("[data-slot='label']");
    expect(label?.getAttribute("for")).toBe("email-input");
  });
});

describe("LabelSimple", () => {
  it("renders label text without wrapper", () => {
    const { container } = render(<LabelSimple>Name</LabelSimple>);
    expect(screen.getByText("Name")).toBeDefined();
    // Should NOT have a wrapper div
    expect(container.querySelector("[data-slot='label-wrapper']")).toBeNull();
  });

  it("renders with data-slot='label'", () => {
    const { container } = render(<LabelSimple>Name</LabelSimple>);
    expect(container.querySelector("[data-slot='label']")).toBeDefined();
  });

  it("shows required indicator", () => {
    const { container } = render(<LabelSimple required>Name</LabelSimple>);
    expect(container.querySelector("[data-slot='label-required']")).toBeDefined();
  });

  it("shows optional indicator", () => {
    const { container } = render(<LabelSimple optional>Name</LabelSimple>);
    expect(container.querySelector("[data-slot='label-optional']")).toBeDefined();
  });
});

describe("FormField", () => {
  it("renders with data-slot='form-field'", () => {
    const { container } = render(
      <FormField label="Email">
        <input type="email" />
      </FormField>
    );
    expect(container.querySelector("[data-slot='form-field']")).toBeDefined();
  });

  it("renders label text", () => {
    render(
      <FormField label="Password">
        <input type="password" />
      </FormField>
    );
    expect(screen.getByText("Password")).toBeDefined();
  });

  it("renders children (input)", () => {
    render(
      <FormField label="Email">
        <input type="email" data-testid="email-input" />
      </FormField>
    );
    expect(screen.getByTestId("email-input")).toBeDefined();
  });

  it("renders error message with role='alert'", () => {
    render(
      <FormField label="Email" error="Invalid email address">
        <input type="email" />
      </FormField>
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Invalid email address");
  });

  it("sets data-error on wrapper when error is present", () => {
    const { container } = render(
      <FormField label="Email" error="Required">
        <input type="email" />
      </FormField>
    );
    const field = container.querySelector("[data-slot='form-field']");
    expect(field?.getAttribute("data-error")).toBe("true");
  });

  it("does not render error slot when no error", () => {
    const { container } = render(
      <FormField label="Email">
        <input type="email" />
      </FormField>
    );
    expect(container.querySelector("[data-slot='form-field-error']")).toBeNull();
  });

  it("passes required to label", () => {
    const { container } = render(
      <FormField label="Email" required>
        <input type="email" />
      </FormField>
    );
    expect(container.querySelector("[data-slot='label-required']")).toBeDefined();
  });

  it("passes optional to label", () => {
    const { container } = render(
      <FormField label="Notes" optional>
        <textarea />
      </FormField>
    );
    expect(container.querySelector("[data-slot='label-optional']")).toBeDefined();
  });

  it("passes description to label", () => {
    const { container } = render(
      <FormField label="Bio" description="Tell us about yourself">
        <textarea />
      </FormField>
    );
    expect(container.querySelector("[data-slot='label-description']")?.textContent).toBe(
      "Tell us about yourself"
    );
  });

  it("applies custom className", () => {
    const { container } = render(
      <FormField label="Test" className="my-field">
        <input />
      </FormField>
    );
    const field = container.querySelector("[data-slot='form-field']");
    expect(field?.className).toContain("my-field");
  });
});
