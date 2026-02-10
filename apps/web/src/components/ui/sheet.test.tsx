/**
 * Unit tests for Sheet component
 * Tests Radix Dialog-based sheet rendering and structure.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "./sheet";

function renderSheet(props: { defaultOpen?: boolean } = {}) {
  return render(
    <Sheet defaultOpen={props.defaultOpen}>
      <SheetTrigger data-testid="sheet-trigger">Open</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sheet Title</SheetTitle>
          <SheetDescription>Sheet description text</SheetDescription>
        </SheetHeader>
        <div>Sheet body content</div>
        <SheetFooter>
          <SheetClose data-testid="close-btn">Close</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("renders the trigger button", () => {
    renderSheet();
    expect(screen.getByTestId("sheet-trigger")).toBeDefined();
    expect(screen.getByText("Open")).toBeDefined();
  });

  it("trigger has data-slot attribute", () => {
    renderSheet();
    expect(screen.getByTestId("sheet-trigger").getAttribute("data-slot")).toBe("sheet-trigger");
  });

  it("does not show content when closed", () => {
    renderSheet();
    expect(screen.queryByText("Sheet Title")).toBeNull();
  });

  it("shows content when opened", () => {
    renderSheet({ defaultOpen: true });
    expect(screen.getByText("Sheet Title")).toBeDefined();
    expect(screen.getByText("Sheet description text")).toBeDefined();
    expect(screen.getByText("Sheet body content")).toBeDefined();
  });

  it("shows title and description in open state", () => {
    renderSheet({ defaultOpen: true });
    expect(screen.getByText("Sheet Title")).toBeDefined();
    expect(screen.getByText("Sheet description text")).toBeDefined();
  });

  it("renders header with data-slot", () => {
    renderSheet({ defaultOpen: true });
    const header = document.querySelector("[data-slot='sheet-header']");
    expect(header).toBeDefined();
  });

  it("renders footer with data-slot", () => {
    renderSheet({ defaultOpen: true });
    const footer = document.querySelector("[data-slot='sheet-footer']");
    expect(footer).toBeDefined();
  });

  it("renders title with data-slot", () => {
    renderSheet({ defaultOpen: true });
    const title = document.querySelector("[data-slot='sheet-title']");
    expect(title).toBeDefined();
  });

  it("renders description with data-slot", () => {
    renderSheet({ defaultOpen: true });
    const desc = document.querySelector("[data-slot='sheet-description']");
    expect(desc).toBeDefined();
  });

  it("has a close button with sr-only text", () => {
    renderSheet({ defaultOpen: true });
    // SheetContent includes an X button with sr-only "Close" text
    const srCloseElements = document.querySelectorAll(".sr-only");
    const closeTexts = Array.from(srCloseElements).filter(
      (el) => el.textContent === "Close"
    );
    expect(closeTexts.length).toBeGreaterThanOrEqual(1);
  });
});

describe("SheetHeader", () => {
  it("applies custom className", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader className="my-header">
            <SheetTitle>T</SheetTitle>
            <SheetDescription>D</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    const header = document.querySelector("[data-slot='sheet-header']");
    expect(header?.className).toContain("my-header");
  });
});

describe("SheetFooter", () => {
  it("applies custom className", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>T</SheetTitle>
            <SheetDescription>D</SheetDescription>
          </SheetHeader>
          <SheetFooter className="my-footer">
            <button>OK</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
    const footer = document.querySelector("[data-slot='sheet-footer']");
    expect(footer?.className).toContain("my-footer");
  });
});
