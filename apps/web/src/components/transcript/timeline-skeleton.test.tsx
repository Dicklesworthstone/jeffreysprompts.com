import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TimelineSkeleton, TimelineSkeletonCompact, StatsDashboardSkeleton } from "./timeline-skeleton";

vi.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="skeleton" className={className} {...props} />
  ),
}));

describe("TimelineSkeleton", () => {
  it("renders default number of section skeletons", () => {
    const { container } = render(<TimelineSkeleton />);
    // Default is 3 sections
    const sectionHeaders = container.querySelectorAll(".flex.items-center.gap-3.p-3");
    expect(sectionHeaders.length).toBe(3);
  });

  it("renders custom number of sections", () => {
    const { container } = render(<TimelineSkeleton sections={5} />);
    const sectionHeaders = container.querySelectorAll(".flex.items-center.gap-3.p-3");
    expect(sectionHeaders.length).toBe(5);
  });

  it("expands first section with message skeletons", () => {
    const { container } = render(<TimelineSkeleton sections={2} messagesPerSection={4} />);
    // Only first section shows message skeletons
    const messagePreviews = container.querySelectorAll(".border-l-2");
    expect(messagePreviews.length).toBe(4);
  });

  it("renders skeleton elements", () => {
    const { getAllByTestId } = render(<TimelineSkeleton />);
    expect(getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});

describe("TimelineSkeletonCompact", () => {
  it("renders 4 compact skeleton rows", () => {
    const { getAllByTestId } = render(<TimelineSkeletonCompact />);
    // Each row has 3 skeletons (circle + 2 lines)
    expect(getAllByTestId("skeleton").length).toBe(12);
  });
});

describe("StatsDashboardSkeleton", () => {
  it("renders 6 stat card skeletons", () => {
    const { container } = render(<StatsDashboardSkeleton />);
    const cards = container.querySelectorAll(".rounded-xl.p-4.border");
    expect(cards.length).toBe(6);
  });

  it("renders skeleton elements inside each card", () => {
    const { getAllByTestId } = render(<StatsDashboardSkeleton />);
    // Each card has 3 skeletons (icon + value + label)
    expect(getAllByTestId("skeleton").length).toBe(18);
  });
});
