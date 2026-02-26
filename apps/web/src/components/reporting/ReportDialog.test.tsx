import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent} from "@testing-library/react";
import { ReportDialog } from "./ReportDialog";

vi.mock("@/hooks/useIsMobile", () => ({
  useIsSmallScreen: vi.fn(() => false),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/components/ui/bottom-sheet", () => ({
  BottomSheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="bottom-sheet">{children}</div> : null,
}));

describe("ReportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the trigger button", () => {
    render(
      <ReportDialog contentType="prompt" contentId="test-1" />
    );
    expect(screen.getByLabelText("Report this content")).toBeInTheDocument();
  });

  it("opens the dialog on trigger click", () => {
    render(
      <ReportDialog contentType="prompt" contentId="test-1" />
    );
    fireEvent.click(screen.getByLabelText("Report this content"));
    expect(screen.getByText("Report this content")).toBeInTheDocument();
    expect(screen.getByText(/Tell me what's wrong/)).toBeInTheDocument();
  });

  it("shows trigger label when showLabel is true", () => {
    render(
      <ReportDialog
        contentType="prompt"
        contentId="test-1"
        showLabel
        triggerLabel="Flag"
      />
    );
    expect(screen.getByText("Flag")).toBeInTheDocument();
  });

  it("shows reason selector and details textarea", () => {
    render(
      <ReportDialog contentType="prompt" contentId="test-1" />
    );
    fireEvent.click(screen.getByLabelText("Report this content"));
    expect(screen.getByText("Reason")).toBeInTheDocument();
    expect(screen.getByText("Details (optional)")).toBeInTheDocument();
    expect(screen.getByText("500 characters left")).toBeInTheDocument();
  });

  it("shows moderation notice", () => {
    render(
      <ReportDialog contentType="prompt" contentId="test-1" />
    );
    fireEvent.click(screen.getByLabelText("Report this content"));
    expect(
      screen.getByText(/Reports are reviewed by a human moderator/)
    ).toBeInTheDocument();
  });

  it("shows Cancel and Submit buttons", () => {
    render(
      <ReportDialog contentType="prompt" contentId="test-1" />
    );
    fireEvent.click(screen.getByLabelText("Report this content"));
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Submit Report")).toBeInTheDocument();
  });
});
