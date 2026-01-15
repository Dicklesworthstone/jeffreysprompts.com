/**
 * Unit tests for BasketSidebar component
 *
 * Tests rendering states (open/closed, empty/populated), user interactions
 * (close, remove item, clear basket), and export functionality.
 * Philosophy: Minimal mocks - only URL object methods for download tests.
 *
 * @see @/components/BasketSidebar.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BasketProvider } from "@/contexts/basket-context";
import { ToastProvider } from "@/components/ui/toast";
import { BasketSidebar } from "./BasketSidebar";

// Real prompt IDs from the registry
const REAL_PROMPT_IDS = ["idea-wizard", "readme-reviser", "robot-mode-maker"];

// Mock URL.createObjectURL and URL.revokeObjectURL for download tests
const mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url");
const mockRevokeObjectURL = vi.fn();
Object.defineProperty(URL, "createObjectURL", { value: mockCreateObjectURL });
Object.defineProperty(URL, "revokeObjectURL", { value: mockRevokeObjectURL });

// Wrapper with all providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BasketProvider>
      <ToastProvider>{children}</ToastProvider>
    </BasketProvider>
  );
}

// Helper to seed localStorage with basket items before render
function seedBasket(promptIds: string[]) {
  localStorage.setItem("jfp-basket", JSON.stringify(promptIds));
}

describe("BasketSidebar", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockOnClose.mockClear();
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("visibility states", () => {
    it("renders as closed when isOpen is false", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={false} onClose={mockOnClose} />
        </TestWrapper>
      );

      const sidebar = document.querySelector("aside");
      expect(sidebar).toHaveClass("translate-x-full");
    });

    it("renders as open when isOpen is true", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const sidebar = document.querySelector("aside");
      expect(sidebar).toHaveClass("translate-x-0");
    });

    it("shows backdrop when open", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toHaveClass("opacity-100");
    });

    it("hides backdrop when closed", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={false} onClose={mockOnClose} />
        </TestWrapper>
      );

      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toHaveClass("opacity-0", "pointer-events-none");
    });
  });

  describe("empty basket state", () => {
    it("shows empty message when basket is empty", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(screen.getByText("Your basket is empty")).toBeInTheDocument();
      expect(
        screen.getByText("Save prompts here to download or install them all at once.")
      ).toBeInTheDocument();
    });

    it("shows count of zero", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(screen.getByText("(0)")).toBeInTheDocument();
    });

    it("does not show export actions when empty", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(
        screen.queryByRole("button", { name: /download as markdown/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /download as skills/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("populated basket state", () => {
    it("shows items in basket", () => {
      seedBasket([REAL_PROMPT_IDS[0]]);
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(screen.getByText("The Idea Wizard")).toBeInTheDocument();
    });

    it("shows correct count for multiple items", () => {
      seedBasket(REAL_PROMPT_IDS.slice(0, 2));
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(screen.getByText("(2)")).toBeInTheDocument();
    });

    it("shows export action buttons when items present", () => {
      seedBasket([REAL_PROMPT_IDS[0]]);
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(
        screen.getByRole("button", { name: /download as markdown/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /download as skills/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /copy install command/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /clear basket/i })
      ).toBeInTheDocument();
    });

    it("displays category for each item", () => {
      seedBasket([REAL_PROMPT_IDS[0]]);
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(screen.getByText("ideation")).toBeInTheDocument();
    });
  });

  describe("close interactions", () => {
    it("calls onClose when close button clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      // Find the close button (the X icon button in the header)
      const closeButtons = screen.getAllByRole("button");
      const closeButton = closeButtons[0]; // First button is the header close

      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("remove item interaction", () => {
    it("has remove button for each item", () => {
      seedBasket(REAL_PROMPT_IDS.slice(0, 2));
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      // Should have 2 items initially
      expect(screen.getByText("(2)")).toBeInTheDocument();

      // Find remove buttons in the list items
      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(2);

      // Each item should have a remove button (X icon button)
      const removeButtons = document.querySelectorAll(
        'li button[data-variant="ghost"]'
      );
      expect(removeButtons).toHaveLength(2);
    });

    it("remove button is clickable", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      seedBasket(REAL_PROMPT_IDS.slice(0, 2));
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const removeButtons = document.querySelectorAll(
        'li button[data-variant="ghost"]'
      );

      // Click should not throw
      await user.click(removeButtons[0]);
    });
  });

  describe("clear basket interaction", () => {
    it("clears all items when clear button clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      seedBasket(REAL_PROMPT_IDS.slice(0, 2));
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(screen.getByText("(2)")).toBeInTheDocument();

      const clearButton = screen.getByRole("button", { name: /clear basket/i });
      await user.click(clearButton);

      // Should show empty state now
      expect(screen.getByText("Your basket is empty")).toBeInTheDocument();
      expect(screen.getByText("(0)")).toBeInTheDocument();
    });
  });

  describe("copy install command", () => {
    // Note: Clipboard API testing in happy-dom is limited - we verify button exists and is clickable
    it("has copy install command button that can be clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      seedBasket([REAL_PROMPT_IDS[0]]);
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const copyButton = screen.getByRole("button", {
        name: /copy install command/i,
      });
      expect(copyButton).toBeInTheDocument();

      // Click should not throw
      await user.click(copyButton);
    });

    it("has copy button when multiple items in basket", () => {
      seedBasket(REAL_PROMPT_IDS.slice(0, 2));
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const copyButton = screen.getByRole("button", {
        name: /copy install command/i,
      });
      expect(copyButton).toBeInTheDocument();
    });
  });

  describe("header content", () => {
    it("shows basket title and icon", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(screen.getByText("Basket")).toBeInTheDocument();
    });
  });

  describe("download buttons", () => {
    it("has markdown download button", () => {
      seedBasket([REAL_PROMPT_IDS[0]]);
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const mdButton = screen.getByRole("button", {
        name: /download as markdown/i,
      });
      expect(mdButton).toBeInTheDocument();
      expect(mdButton).not.toBeDisabled();
    });

    it("has skills download button", () => {
      seedBasket([REAL_PROMPT_IDS[0]]);
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const skillsButton = screen.getByRole("button", {
        name: /download as skills/i,
      });
      expect(skillsButton).toBeInTheDocument();
      expect(skillsButton).not.toBeDisabled();
    });
  });

  describe("layout structure", () => {
    it("renders sidebar with fixed positioning", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const sidebar = document.querySelector("aside");
      expect(sidebar).toHaveClass("fixed", "right-0", "top-0");
    });

    it("renders with correct width", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const sidebar = document.querySelector("aside");
      expect(sidebar).toHaveClass("w-80", "max-w-full");
    });
  });

  describe("accessibility", () => {
    it("has accessible close button", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      // The close button should exist and be clickable
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it("backdrop is marked as aria-hidden", () => {
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      const backdrop = document.querySelector('[aria-hidden="true"]');
      expect(backdrop).toBeInTheDocument();
    });
  });

  describe("multiple items display", () => {
    it("renders all items in list", () => {
      seedBasket(REAL_PROMPT_IDS);
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(screen.getByText("The Idea Wizard")).toBeInTheDocument();
      expect(screen.getByText("The README Reviser")).toBeInTheDocument();
      expect(screen.getByText("The Robot-Mode Maker")).toBeInTheDocument();
    });

    it("shows correct count for all items", () => {
      seedBasket(REAL_PROMPT_IDS);
      render(
        <TestWrapper>
          <BasketSidebar isOpen={true} onClose={mockOnClose} />
        </TestWrapper>
      );

      expect(screen.getByText("(3)")).toBeInTheDocument();
    });
  });
});
