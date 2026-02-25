/**
 * Tests for useKeyboardShortcuts hook and formatShortcut utility
 */
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi} from "vitest";
import { useKeyboardShortcuts, formatShortcut, type KeyboardShortcut } from "./useKeyboardShortcuts";

function fireKeyDown(key: string, opts: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    ...opts,
  });
  window.dispatchEvent(event);
  return event;
}

describe("useKeyboardShortcuts", () => {
  it("fires handler on matching key", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { id: "test", keys: "k", description: "Test", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      fireKeyDown("k");
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { id: "test", keys: "k", description: "Test", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts, { enabled: false }));

    act(() => {
      fireKeyDown("k");
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("matches modifier keys (ctrl)", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { id: "test", keys: "ctrl+k", description: "Test", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Without ctrl — should not fire
    act(() => { fireKeyDown("k"); });
    expect(handler).not.toHaveBeenCalled();

    // With ctrl — should fire
    act(() => { fireKeyDown("k", { ctrlKey: true }); });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("matches shift modifier", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { id: "help", keys: "shift+?", description: "Help", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      fireKeyDown("?", { shiftKey: true });
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it("handles key sequences (e.g. 'g h')", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { id: "go-home", keys: "g h", description: "Go home", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => { fireKeyDown("g"); });
    expect(handler).not.toHaveBeenCalled();

    act(() => { fireKeyDown("h"); });
    expect(handler).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("resets sequence after timeout", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { id: "go-home", keys: "g h", description: "Go home", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => { fireKeyDown("g"); });

    // Wait for timeout
    act(() => { vi.advanceTimersByTime(1100); });

    act(() => { fireKeyDown("h"); });
    expect(handler).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("skips non-global shortcuts when input is focused", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { id: "test", keys: "k", description: "Test", handler },
    ];

    // Create and focus an input
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => { fireKeyDown("k"); });
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("fires global shortcuts even when input is focused", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { id: "escape", keys: "escape", description: "Close", handler, global: true },
    ];

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => { fireKeyDown("Escape"); });
    expect(handler).toHaveBeenCalledOnce();

    document.body.removeChild(input);
  });

  it("prevents default when preventDefault is not false", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { id: "test", keys: "k", description: "Test", handler },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const preventSpy = vi.fn();
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "k", bubbles: true });
      Object.defineProperty(event, "preventDefault", { value: preventSpy });
      window.dispatchEvent(event);
    });

    expect(preventSpy).toHaveBeenCalled();
  });

  it("does not prevent default when preventDefault is false", () => {
    const handler = vi.fn();
    const shortcuts: KeyboardShortcut[] = [
      { id: "test", keys: "k", description: "Test", handler, preventDefault: false },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const preventSpy = vi.fn();
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "k", bubbles: true });
      Object.defineProperty(event, "preventDefault", { value: preventSpy });
      window.dispatchEvent(event);
    });

    expect(preventSpy).not.toHaveBeenCalled();
  });

  it("cleans up event listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([{ id: "t", keys: "t", description: "T", handler: vi.fn() }])
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeSpy.mockRestore();
  });
});

describe("formatShortcut", () => {
  it("formats single key", () => {
    expect(formatShortcut("k")).toBe("K");
  });

  it("formats special keys", () => {
    expect(formatShortcut("enter")).toBe("\u21B5");
    expect(formatShortcut("escape")).toBe("Esc");
    expect(formatShortcut("tab")).toBe("\u21E5");
    expect(formatShortcut("space")).toBe("Space");
    expect(formatShortcut("backspace")).toBe("\u232B");
    expect(formatShortcut("delete")).toBe("\u2326");
  });

  it("formats ctrl modifier (non-Mac)", () => {
    // In test env, navigator.platform is unlikely "MacIntel"
    const result = formatShortcut("ctrl+k");
    expect(result).toContain("Ctrl");
    expect(result).toContain("K");
  });

  it("formats shift modifier (non-Mac)", () => {
    const result = formatShortcut("shift+?");
    expect(result).toContain("Shift");
  });

  it("formats alt modifier (non-Mac)", () => {
    const result = formatShortcut("alt+k");
    expect(result).toContain("Alt");
  });
});
