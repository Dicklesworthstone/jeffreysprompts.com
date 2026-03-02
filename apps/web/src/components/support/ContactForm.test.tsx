/**
 * Tests for ContactForm component.
 *
 * Covers: form field rendering, validation, API submit,
 * success state, error handling, honeypot field.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "./ContactForm";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Jane Doe");
  await user.type(screen.getByLabelText("Email"), "jane@example.com");
  await user.type(screen.getByLabelText("Subject"), "Help needed");
  await user.type(screen.getByLabelText("Message"), "I need help with my account.");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    // Clear localStorage
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("jfpSupportTickets");
    }
  });

  // --- Rendering ---

  it("renders all required form fields", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("renders category and priority selectors", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Priority")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<ContactForm />);

    expect(screen.getByText("Submit request")).toBeInTheDocument();
  });

  it("shows support email link", () => {
    render(<ContactForm />);

    expect(screen.getByText("support@jeffreysprompts.com")).toBeInTheDocument();
  });

  it("shows response time info", () => {
    render(<ContactForm />);

    expect(screen.getByText(/1 business day/)).toBeInTheDocument();
  });

  it("has attachments field disabled with Coming soon badge", () => {
    render(<ContactForm />);

    expect(screen.getByText("Coming soon")).toBeInTheDocument();
    const fileInput = screen.getByLabelText("Attachments (optional)");
    expect(fileInput).toBeDisabled();
  });

  // --- Honeypot ---

  it("renders honeypot company field hidden", () => {
    render(<ContactForm />);

    const companyInput = screen.getByLabelText("Company");
    const hiddenContainer = companyInput.closest("[aria-hidden='true']");
    expect(hiddenContainer).not.toBeNull();
  });

  // --- Validation ---

  it("submit button is disabled when form is empty", () => {
    render(<ContactForm />);

    const submitBtn = screen.getByText("Submit request");
    expect(submitBtn).toBeDisabled();
  });

  it("submit button becomes enabled when all fields filled", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    await fillForm(user);

    const submitBtn = screen.getByText("Submit request");
    expect(submitBtn).not.toBeDisabled();
  });

  // --- Submit ---

  it("calls fetch POST on submit", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ticket: {
            ticketNumber: "TK-001",
            accessToken: "abc123",
            status: "open",
            createdAt: "2026-01-01T00:00:00Z",
          },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<ContactForm />);

    await fillForm(user);
    fireEvent.click(screen.getByText("Submit request"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/support/tickets",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("shows success state after successful submit", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ticket: {
            ticketNumber: "TK-002",
            accessToken: "token456",
            status: "open",
            createdAt: "2026-01-01T00:00:00Z",
          },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<ContactForm />);

    await fillForm(user);
    fireEvent.click(screen.getByText("Submit request"));

    await waitFor(() => {
      expect(screen.getByText("We received your request.")).toBeInTheDocument();
    });

    expect(screen.getByText("TK-002")).toBeInTheDocument();
    expect(screen.getByText("Submit another request")).toBeInTheDocument();
  });

  it("shows error toast on API failure", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Server error" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<ContactForm />);

    await fillForm(user);
    fireEvent.click(screen.getByText("Submit request"));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith("Server error");
    });
  });

  it("shows error toast on network failure", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    render(<ContactForm />);

    await fillForm(user);
    fireEvent.click(screen.getByText("Submit request"));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith("Unable to submit your request.");
    });
  });

  it("can submit another request after success", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ticket: {
            ticketNumber: "TK-003",
            accessToken: "t3",
            status: "open",
            createdAt: "2026-01-01T00:00:00Z",
          },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<ContactForm />);

    await fillForm(user);
    fireEvent.click(screen.getByText("Submit request"));

    await waitFor(() => {
      expect(screen.getByText("Submit another request")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Submit another request"));

    // Back to form view
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});
