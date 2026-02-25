/**
 * Tests for useServiceWorker hook — service worker registration and state
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useServiceWorker, checkForUpdates, skipWaitingAndReload } from "./useServiceWorker";

describe("useServiceWorker", () => {
  const originalSW = navigator.serviceWorker;

  afterEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: originalSW,
      configurable: true,
    });
  });

  it("returns initial state before registration completes", () => {
    // Mock a register that never resolves so we can check initial state
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: vi.fn().mockImplementation(() => new Promise(() => {})) },
      configurable: true,
    });
    const { result } = renderHook(() => useServiceWorker());
    expect(result.current.isRegistered).toBe(false);
    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.registration).toBeNull();
  });

  it("registers service worker when supported", async () => {
    const mockRegistration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const mockRegister = vi.fn().mockResolvedValue(mockRegistration);

    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: mockRegister, controller: null },
      configurable: true,
    });

    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(result.current.isRegistered).toBe(true);
    });
    expect(result.current.isSupported).toBe(true);
    expect(mockRegister).toHaveBeenCalledWith("/service-worker.js", { scope: "/" });
  });

  it("detects waiting worker as update", async () => {
    const mockRegistration = {
      waiting: { postMessage: vi.fn() },
      installing: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const mockRegister = vi.fn().mockResolvedValue(mockRegistration);

    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: mockRegister, controller: null },
      configurable: true,
    });

    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(result.current.hasUpdate).toBe(true);
    });
  });

  it("handles registration error", async () => {
    const mockRegister = vi.fn().mockRejectedValue(new Error("Registration failed"));

    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: mockRegister },
      configurable: true,
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.error!.message).toBe("Registration failed");
    consoleSpy.mockRestore();
  });

  it("tracks online/offline state", async () => {
    const mockRegistration = {
      waiting: null,
      installing: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: vi.fn().mockResolvedValue(mockRegistration) },
      configurable: true,
    });

    const { result } = renderHook(() => useServiceWorker());

    await waitFor(() => expect(result.current.isRegistered).toBe(true));

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.isOffline).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.isOffline).toBe(false);
  });
});

describe("checkForUpdates", () => {
  it("calls registration.update() when available", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn().mockResolvedValue({ update: mockUpdate }),
      },
      configurable: true,
    });

    await checkForUpdates();
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe("skipWaitingAndReload", () => {
  it("posts skipWaiting message to waiting worker", async () => {
    const mockPostMessage = vi.fn();
    const mockReload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: mockReload },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          waiting: { postMessage: mockPostMessage },
        }),
      },
      configurable: true,
    });

    await skipWaitingAndReload();
    expect(mockPostMessage).toHaveBeenCalledWith("skipWaiting");
  });
});
