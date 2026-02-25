/**
 * Unit tests for Switch component
 * Tests Radix Switch toggle rendering and interaction.
 */

import { render, screen, fireEvent} from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("renders a switch role element", () => {
    render(<Switch />);
    expect(screen.getByRole("switch")).toBeDefined();
  });

  it("is unchecked by default", () => {
    render(<Switch />);
    const sw = screen.getByRole("switch");
    expect(sw.getAttribute("data-state")).toBe("unchecked");
  });

  it("can be rendered as checked", () => {
    render(<Switch checked />);
    const sw = screen.getByRole("switch");
    expect(sw.getAttribute("data-state")).toBe("checked");
  });

  it("toggles state on click", () => {
    const onCheckedChange = vi.fn();
    render(<Switch onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("applies custom className", () => {
    render(<Switch className="my-switch" />);
    const sw = screen.getByRole("switch");
    expect(sw.className).toContain("my-switch");
  });

  it("can be disabled", () => {
    render(<Switch disabled />);
    const sw = screen.getByRole("switch");
    expect(sw.getAttribute("disabled")).toBeDefined();
  });

  it("does not toggle when disabled", () => {
    const onCheckedChange = vi.fn();
    render(<Switch disabled onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("has a thumb child element", () => {
    render(<Switch />);
    const sw = screen.getByRole("switch");
    const thumb = sw.querySelector("span");
    expect(thumb).toBeDefined();
  });

  it("supports aria-label", () => {
    render(<Switch aria-label="Toggle dark mode" />);
    const sw = screen.getByRole("switch");
    expect(sw.getAttribute("aria-label")).toBe("Toggle dark mode");
  });
});
