/**
 * Unit tests for Select component
 * Tests Radix Select wrapper rendering and structure.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectGroup,
} from "./select";

function renderSelect(props: { defaultValue?: string; onValueChange?: (v: string) => void } = {}) {
  return render(
    <Select defaultValue={props.defaultValue} onValueChange={props.onValueChange}>
      <SelectTrigger data-testid="trigger">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="cherry">Cherry</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("renders the trigger button", () => {
    renderSelect();
    expect(screen.getByTestId("trigger")).toBeDefined();
  });

  it("shows placeholder text", () => {
    renderSelect();
    expect(screen.getByText("Pick one")).toBeDefined();
  });

  it("trigger has data-slot attribute", () => {
    renderSelect();
    const trigger = screen.getByTestId("trigger");
    expect(trigger.getAttribute("data-slot")).toBe("select-trigger");
  });

  it("trigger has combobox role", () => {
    renderSelect();
    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDefined();
  });

  it("applies custom className to trigger", () => {
    render(
      <Select>
        <SelectTrigger className="my-trigger" data-testid="t">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByTestId("t").className).toContain("my-trigger");
  });

  it("shows selected value when defaultValue is set", () => {
    renderSelect({ defaultValue: "banana" });
    expect(screen.getByText("Banana")).toBeDefined();
  });
});
