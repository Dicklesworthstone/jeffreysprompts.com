import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { HistoryTracker } from "./HistoryTracker";

vi.mock("@/lib/history/client", () => ({
  trackHistoryView: vi.fn(),
}));

import { trackHistoryView } from "@/lib/history/client";

describe("HistoryTracker", () => {
  it("calls trackHistoryView on mount with resourceType and resourceId", () => {
    render(
      <HistoryTracker resourceType="prompt" resourceId="test-prompt-1" />
    );
    expect(trackHistoryView).toHaveBeenCalledWith({
      resourceType: "prompt",
      resourceId: "test-prompt-1",
      searchQuery: undefined,
      source: undefined,
    });
  });

  it("passes searchQuery and source", () => {
    render(
      <HistoryTracker
        resourceType="search"
        searchQuery="hello"
        source="navbar"
      />
    );
    expect(trackHistoryView).toHaveBeenCalledWith({
      resourceType: "search",
      resourceId: undefined,
      searchQuery: "hello",
      source: "navbar",
    });
  });

  it("renders nothing", () => {
    const { container } = render(
      <HistoryTracker resourceType="prompt" resourceId="x" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("re-calls trackHistoryView when props change", () => {
    const { rerender } = render(
      <HistoryTracker resourceType="prompt" resourceId="a" />
    );
    vi.mocked(trackHistoryView).mockClear();
    rerender(<HistoryTracker resourceType="prompt" resourceId="b" />);
    expect(trackHistoryView).toHaveBeenCalledWith(
      expect.objectContaining({ resourceId: "b" })
    );
  });
});
