
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "./dialog";

// Mock Radix UI's Dialog primitive since it relies on browser APIs that might be partial in HappyDOM
// However, HappyDOM usually supports it well enough. Let's try without mocking first.
// If it fails, we can mock the primitive parts.

describe("Dialog", () => {
  it("renders trigger and content when open", () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
          <DialogDescription>Test Description</DialogDescription>
          <div>Dialog Content</div>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
  });

  it("opens when trigger is clicked", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Test Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );

    expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
    
    fireEvent.click(screen.getByText("Open"));
    
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });
});
