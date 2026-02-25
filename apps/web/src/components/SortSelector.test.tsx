/**
 * Tests for SortSelector component
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SortSelector } from "./SortSelector";

describe("SortSelector", () => {
  it("renders with aria-label", () => {
    render(<SortSelector value="default" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Sort prompts by")).toBeDefined();
  });

  it("renders the trigger button", () => {
    render(<SortSelector value="default" onChange={vi.fn()} />);
    // The trigger should exist
    expect(screen.getByRole("combobox")).toBeDefined();
  });

  it("applies custom className", () => {
    const { container } = render(
      <SortSelector value="default" onChange={vi.fn()} className="custom-class" />
    );
    expect(container.querySelector(".custom-class")).not.toBeNull();
  });
});
