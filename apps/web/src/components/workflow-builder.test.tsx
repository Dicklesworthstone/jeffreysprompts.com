/**
 * Tests for WorkflowBuilder component.
 *
 * Covers: empty state, title/description inputs, add step search,
 * step rendering, remove step, export/copy, clear all.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkflowBuilder } from "./workflow-builder";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, layout, ...rest } = props;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  Reorder: {
    Group: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => {
      const { values, onReorder, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    Item: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => {
      const { value, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

const mockCopy = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: (...args: unknown[]) => mockCopy(...args),
}));

const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}));

// Provide a stable localStorage mock
let storedDraft: string | null = null;
vi.mock("@/hooks/useLocalStorage", () => ({
  useLocalStorage: (_key: string, defaultValue: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useState, useCallback } = require("react");
    const [value, setValue] = useState(() => {
      if (storedDraft) {
        try {
          return JSON.parse(storedDraft);
        } catch {
          return defaultValue;
        }
      }
      return defaultValue;
    });

    const set = useCallback(
      (updater: unknown) => {
        setValue((prev: unknown) => {
          const next = typeof updater === "function" ? updater(prev) : updater;
          storedDraft = JSON.stringify(next);
          return next;
        });
      },
      [setValue]
    );

    const clear = useCallback(() => {
      storedDraft = null;
      setValue(defaultValue);
    }, [setValue, defaultValue]);

    return [value, set, clear];
  },
}));

vi.mock("@jeffreysprompts/core/prompts/registry", () => ({
  prompts: [
    {
      id: "prompt-alpha",
      title: "Alpha Prompt",
      description: "An alpha prompt for testing",
      category: "coding",
      tags: [],
      content: "test",
    },
    {
      id: "prompt-beta",
      title: "Beta Prompt",
      description: "A beta prompt for testing",
      category: "writing",
      tags: [],
      content: "test",
    },
  ],
  getPrompt: (id: string) => {
    const map: Record<string, unknown> = {
      "prompt-alpha": {
        id: "prompt-alpha",
        title: "Alpha Prompt",
        description: "An alpha prompt for testing",
        category: "coding",
      },
      "prompt-beta": {
        id: "prompt-beta",
        title: "Beta Prompt",
        description: "A beta prompt for testing",
        category: "writing",
      },
    };
    return map[id] ?? null;
  },
}));

vi.mock("@jeffreysprompts/core/export/markdown", () => ({
  generateWorkflowMarkdown: () => "# Workflow Markdown",
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WorkflowBuilder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storedDraft = null;
    mockCopy.mockResolvedValue({ success: true });
  });

  it("renders empty state", () => {
    render(<WorkflowBuilder />);
    expect(screen.getByText("No steps yet. Add prompts to build your workflow.")).toBeInTheDocument();
  });

  it("has title input", () => {
    render(<WorkflowBuilder />);
    expect(screen.getByPlaceholderText("Workflow title...")).toBeInTheDocument();
  });

  it("has description textarea", () => {
    render(<WorkflowBuilder />);
    expect(
      screen.getByPlaceholderText("Describe what this workflow accomplishes...")
    ).toBeInTheDocument();
  });

  it("shows step count", () => {
    render(<WorkflowBuilder />);
    expect(screen.getByText("Steps (0)")).toBeInTheDocument();
  });

  it("has Add Step button", () => {
    render(<WorkflowBuilder />);
    expect(screen.getByText("Add Step")).toBeInTheDocument();
  });

  it("shows search input when Add Step clicked", () => {
    render(<WorkflowBuilder />);
    fireEvent.click(screen.getByText("Add Step"));
    expect(screen.getByPlaceholderText("Search prompts...")).toBeInTheDocument();
  });

  it("shows search results when typing", () => {
    render(<WorkflowBuilder />);
    fireEvent.click(screen.getByText("Add Step"));
    fireEvent.change(screen.getByPlaceholderText("Search prompts..."), {
      target: { value: "alpha" },
    });
    expect(screen.getByText("Alpha Prompt")).toBeInTheDocument();
  });

  it("adds step when search result clicked", () => {
    render(<WorkflowBuilder />);
    fireEvent.click(screen.getByText("Add Step"));
    fireEvent.change(screen.getByPlaceholderText("Search prompts..."), {
      target: { value: "alpha" },
    });
    // Click the search result (it shows prompt title)
    fireEvent.click(screen.getByText("Alpha Prompt"));
    // Step should now appear and count updates
    expect(screen.getByText("Steps (1)")).toBeInTheDocument();
  });

  it("shows Copy as Markdown button when steps exist", () => {
    render(<WorkflowBuilder />);
    // Add a step
    fireEvent.click(screen.getByText("Add Step"));
    fireEvent.change(screen.getByPlaceholderText("Search prompts..."), {
      target: { value: "alpha" },
    });
    fireEvent.click(screen.getByText("Alpha Prompt"));
    expect(screen.getByText("Copy as Markdown")).toBeInTheDocument();
  });

  it("shows Clear all button when steps exist", () => {
    render(<WorkflowBuilder />);
    fireEvent.click(screen.getByText("Add Step"));
    fireEvent.change(screen.getByPlaceholderText("Search prompts..."), {
      target: { value: "beta" },
    });
    fireEvent.click(screen.getByText("Beta Prompt"));
    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("clears steps on Clear all click", () => {
    render(<WorkflowBuilder />);
    fireEvent.click(screen.getByText("Add Step"));
    fireEvent.change(screen.getByPlaceholderText("Search prompts..."), {
      target: { value: "alpha" },
    });
    fireEvent.click(screen.getByText("Alpha Prompt"));
    expect(screen.getByText("Steps (1)")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Clear all"));
    expect(screen.getByText("Steps (0)")).toBeInTheDocument();
  });

  it("copies markdown on export", async () => {
    render(<WorkflowBuilder />);
    fireEvent.click(screen.getByText("Add Step"));
    fireEvent.change(screen.getByPlaceholderText("Search prompts..."), {
      target: { value: "alpha" },
    });
    fireEvent.click(screen.getByText("Alpha Prompt"));
    fireEvent.click(screen.getByText("Copy as Markdown"));

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledWith("# Workflow Markdown");
      expect(mockSuccess).toHaveBeenCalledWith(
        "Copied workflow",
        expect.stringContaining("1 steps")
      );
    });
  });

  it("shows error toast on copy failure", async () => {
    mockCopy.mockResolvedValue({ success: false });
    render(<WorkflowBuilder />);
    fireEvent.click(screen.getByText("Add Step"));
    fireEvent.change(screen.getByPlaceholderText("Search prompts..."), {
      target: { value: "alpha" },
    });
    fireEvent.click(screen.getByText("Alpha Prompt"));
    fireEvent.click(screen.getByText("Copy as Markdown"));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Failed to copy",
        "Please try copying manually"
      );
    });
  });

  it("updates title when typing", () => {
    render(<WorkflowBuilder />);
    const titleInput = screen.getByPlaceholderText("Workflow title...");
    fireEvent.change(titleInput, { target: { value: "My Workflow" } });
    expect(titleInput).toHaveValue("My Workflow");
  });
});
