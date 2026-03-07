import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ReferralQueryProcessor } from "./ReferralQueryProcessor";

const mockReplace = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();

let mockSearch = "ref=testcode&q=robot";
let mockPathname = "/es";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockError,
  }),
}));

describe("ReferralQueryProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = "ref=testcode&q=robot";
    mockPathname = "/es";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("applies a referral code from the query string and removes it from the URL", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            rewards: {
              message: "Referral code applied! You'll get a 30-day trial or 20% off your first month.",
            },
          },
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<ReferralQueryProcessor />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/referral/apply",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ code: "TESTCODE" }),
        })
      );
    });

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith(
        "Referral code applied",
        "Referral code applied! You'll get a 30-day trial or 20% off your first month."
      );
      expect(mockReplace).toHaveBeenCalledWith("/es?q=robot", { scroll: false });
    });
  });

  it("shows a validation error and still clears the referral query param", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: "You have already used a referral code.",
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<ReferralQueryProcessor />);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Unable to apply referral code",
        "You have already used a referral code."
      );
      expect(mockReplace).toHaveBeenCalledWith("/es?q=robot", { scroll: false });
    });
  });

  it("keeps the referral query param in place after a server failure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () =>
        Promise.resolve({
          success: false,
          error: "Server error.",
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    render(<ReferralQueryProcessor />);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "Unable to apply referral code",
        "Server error."
      );
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

