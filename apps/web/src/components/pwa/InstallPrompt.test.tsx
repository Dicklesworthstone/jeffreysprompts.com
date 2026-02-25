import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act , fireEvent} from "@testing-library/react";
import { InstallPrompt } from "./InstallPrompt";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
       
      const { ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock("@/hooks/usePWAInstall", () => ({
  usePWAInstall: vi.fn(() => ({
    isInstallable: true,
    isInstalled: false,
    isIOS: false,
    promptInstall: vi.fn(),
  })),
}));

import { usePWAInstall } from "@/hooks/usePWAInstall";

describe("InstallPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.mocked(usePWAInstall).mockReturnValue({
      isInstallable: true,
      isInstalled: false,
      isIOS: false,
      promptInstall: vi.fn().mockResolvedValue({ outcome: "accepted" }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows banner after delay", () => {
    render(<InstallPrompt delay={100} />);
    expect(screen.queryByText("Install JeffreysPrompts")).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.getByText("Install JeffreysPrompts")).toBeInTheDocument();
  });

  it("does not show if already dismissed", () => {
    localStorage.setItem("jfp-pwa-prompt-dismissed", "true");
    render(<InstallPrompt delay={0} />);
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.queryByText("Install JeffreysPrompts")).not.toBeInTheDocument();
  });

  it("does not show if already installed", () => {
    vi.mocked(usePWAInstall).mockReturnValue({
      isInstallable: false,
      isInstalled: true,
      isIOS: false,
      promptInstall: vi.fn(),
    });
    render(<InstallPrompt delay={0} />);
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.queryByText("Install JeffreysPrompts")).not.toBeInTheDocument();
  });

  it("dismisses on X button click", () => {
    render(<InstallPrompt delay={0} />);
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(screen.getByLabelText("Dismiss install prompt"));
    expect(screen.queryByText("Install JeffreysPrompts")).not.toBeInTheDocument();
    expect(localStorage.getItem("jfp-pwa-prompt-dismissed")).toBe("true");
  });

  it("does not show when not installable and not iOS", () => {
    vi.mocked(usePWAInstall).mockReturnValue({
      isInstallable: false,
      isInstalled: false,
      isIOS: false,
      promptInstall: vi.fn(),
    });
    render(<InstallPrompt delay={0} />);
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.queryByText("Install JeffreysPrompts")).not.toBeInTheDocument();
  });

  it("shows iOS instructions when iOS and Install clicked", () => {
    vi.mocked(usePWAInstall).mockReturnValue({
      isInstallable: false,
      isInstalled: false,
      isIOS: true,
      promptInstall: vi.fn(),
    });
    render(<InstallPrompt delay={0} />);
    act(() => { vi.advanceTimersByTime(100); });
    fireEvent.click(screen.getByText("Install"));
    expect(screen.getByText("Install on iOS")).toBeInTheDocument();
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });
});
