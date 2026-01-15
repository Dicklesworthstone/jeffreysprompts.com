/**
 * Unit tests for SpotlightSearch component
 *
 * Focuses on keyboard opening and basic functionality.
 * Note: Tests involving search results are challenging due to framer-motion
 * and fake timer interactions. Complex search flows are covered by E2E tests.
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpotlightSearch } from "./SpotlightSearch";

const mockWriteText = vi.fn().mockResolvedValue(undefined);

Object.defineProperty(navigator, "clipboard", {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
});

describe("SpotlightSearch", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockWriteText.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("opens with Cmd+K and shows the dialog", async () => {
    render(<SpotlightSearch />);

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(60);
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /search prompts/i })).toBeInTheDocument();
    });
  });

  it("shows search input with combobox role", async () => {
    render(<SpotlightSearch />);

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(60);
    });

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
  });

  it("shows category filter pills", async () => {
    render(<SpotlightSearch />);

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(60);
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Check for category pills
    expect(screen.getByRole("button", { name: /show all categories/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filter by ideation/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filter by documentation/i })).toBeInTheDocument();
  });

  it("closes with Escape key", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<SpotlightSearch />);

    // Open dialog
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(60);
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Press Escape
    const input = screen.getByRole("combobox");
    await user.type(input, "{Escape}");

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("has semantic mode toggle button", async () => {
    render(<SpotlightSearch />);

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(60);
    });

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Check for semantic toggle
    expect(screen.getByRole("button", { name: /toggle semantic search/i })).toBeInTheDocument();
  });
});
