import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommunityPromptCard } from "./CommunityPromptCard";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, whileHover, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
  useReducedMotion: () => false,
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt as string} {...props} />
  ),
}));

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

import { copyToClipboard } from "@/lib/clipboard";

const mockPrompt = {
  id: "cp-1",
  title: "Amazing AI Prompt",
  description: "A great prompt for coding tasks",
  content: "You are an expert developer...",
  category: "automation",
  tags: ["coding", "agent", "extra-tag"],
  author: {
    id: "u1",
    username: "johndoe",
    displayName: "John Doe",
    avatarUrl: null,
  },
  stats: {
    rating: 4.5,
    ratingCount: 120,
    views: 2500,
    copies: 340,
  },
  createdAt: new Date().toISOString(),
};

describe("CommunityPromptCard", () => {
  beforeEach(() => {
    vi.mocked(copyToClipboard).mockResolvedValue({ success: true });
    Object.defineProperty(navigator, "vibrate", {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
  });

  it("renders prompt title", () => {
    render(<CommunityPromptCard prompt={mockPrompt as never} />);
    expect(screen.getByText("Amazing AI Prompt")).toBeInTheDocument();
  });

  it("renders author info", () => {
    render(<CommunityPromptCard prompt={mockPrompt as never} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("@johndoe")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<CommunityPromptCard prompt={mockPrompt as never} />);
    expect(
      screen.getByText("A great prompt for coding tasks")
    ).toBeInTheDocument();
  });

  it("renders category badge", () => {
    render(<CommunityPromptCard prompt={mockPrompt as never} />);
    expect(screen.getByText("automation")).toBeInTheDocument();
  });

  it("renders up to 2 tags with overflow", () => {
    render(<CommunityPromptCard prompt={mockPrompt as never} />);
    expect(screen.getByText("coding")).toBeInTheDocument();
    expect(screen.getByText("agent")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("renders stats (rating, views, copies)", () => {
    render(<CommunityPromptCard prompt={mockPrompt as never} />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("(120)")).toBeInTheDocument();
    expect(screen.getByText("2.5K")).toBeInTheDocument();
  });

  it("shows Featured badge when featured", () => {
    render(<CommunityPromptCard prompt={mockPrompt as never} featured />);
    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("calls onClick when card is clicked", () => {
    const onClick = vi.fn();
    render(
      <CommunityPromptCard prompt={mockPrompt as never} onClick={onClick} />
    );
    fireEvent.click(screen.getByTestId("community-prompt-card"));
    expect(onClick).toHaveBeenCalledWith(mockPrompt);
  });

  it("copies content on copy button click", () => {
    render(<CommunityPromptCard prompt={mockPrompt as never} />);
    const copyBtn = screen.getByLabelText("Copy prompt");
    fireEvent.click(copyBtn);
    expect(copyToClipboard).toHaveBeenCalledWith(
      "You are an expert developer..."
    );
  });

  it("renders content preview", () => {
    render(<CommunityPromptCard prompt={mockPrompt as never} />);
    expect(
      screen.getByText("You are an expert developer...")
    ).toBeInTheDocument();
  });
});
