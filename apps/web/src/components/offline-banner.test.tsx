/**
 * Tests for OfflineBanner component.
 *
 * Covers: update banner, offline banner, dismiss behavior,
 * conditional rendering based on props.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OfflineBanner } from "./offline-banner";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockSkipWaiting = vi.fn();
vi.mock("@/hooks/useServiceWorker", () => ({
  skipWaitingAndReload: () => mockSkipWaiting(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("OfflineBanner", () => {
  // --- Update banner ---

  it("shows update banner when hasUpdate is true", () => {
    render(
      <OfflineBanner isOffline={false} isRegistered={true} hasUpdate={true} />
    );
    expect(screen.getByText("New version available")).toBeInTheDocument();
    expect(screen.getByText("Reload")).toBeInTheDocument();
  });

  it("calls skipWaitingAndReload when Reload clicked", () => {
    render(
      <OfflineBanner isOffline={false} isRegistered={true} hasUpdate={true} />
    );

    fireEvent.click(screen.getByText("Reload"));

    expect(mockSkipWaiting).toHaveBeenCalledTimes(1);
  });

  it("prioritizes update banner over offline banner", () => {
    render(
      <OfflineBanner isOffline={true} isRegistered={true} hasUpdate={true} />
    );

    expect(screen.getByText("New version available")).toBeInTheDocument();
    expect(screen.queryByText(/cached prompts/)).not.toBeInTheDocument();
  });

  // --- Offline banner ---

  it("shows offline banner when offline and registered", () => {
    render(
      <OfflineBanner isOffline={true} isRegistered={true} />
    );
    expect(screen.getByText(/cached prompts/)).toBeInTheDocument();
  });

  it("does not show offline banner when online", () => {
    const { container } = render(
      <OfflineBanner isOffline={false} isRegistered={true} />
    );
    expect(container.querySelector("[data-testid='offline-indicator']")).toBeNull();
  });

  it("does not show offline banner when not registered", () => {
    const { container } = render(
      <OfflineBanner isOffline={true} isRegistered={false} />
    );
    expect(container.querySelector("[data-testid='offline-indicator']")).toBeNull();
  });

  it("dismisses offline banner when X clicked", () => {
    render(
      <OfflineBanner isOffline={true} isRegistered={true} />
    );

    expect(screen.getByText(/cached prompts/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Dismiss offline notification"));

    expect(screen.queryByText(/cached prompts/)).not.toBeInTheDocument();
  });

  it("has correct ARIA attributes on offline banner", () => {
    render(
      <OfflineBanner isOffline={true} isRegistered={true} />
    );

    const alerts = screen.getAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
  });

  // --- Empty state ---

  it("renders nothing when all conditions false", () => {
    const { container } = render(
      <OfflineBanner isOffline={false} isRegistered={false} />
    );
    expect(container.querySelector("[role='alert']")).toBeNull();
  });
});
