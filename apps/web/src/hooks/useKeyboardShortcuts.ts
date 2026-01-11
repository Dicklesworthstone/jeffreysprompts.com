"use client";

import { useEffect, useCallback, useRef } from "react";

export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Description shown in help modal */
  description: string;
  /** Key combination (e.g., "cmd+k", "shift+?", "g h") */
  keys: string;
  /** Handler function */
  handler: () => void;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
  /** Whether shortcut is global (works even when input focused) */
  global?: boolean;
  /** Category for grouping in help modal */
  category?: string;
}

interface KeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

/**
 * Parse a key combination string into normalized parts.
 *
 * @example
 * parseKeys("cmd+k") => { ctrl: false, meta: true, shift: false, alt: false, key: "k" }
 * parseKeys("g h") => { sequence: ["g", "h"] }
 */
function parseKeys(keys: string): {
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
  sequence?: string[];
} {
  const normalized = keys.toLowerCase().trim();

  // Check for sequence (e.g., "g h")
  if (normalized.includes(" ") && !normalized.includes("+")) {
    return {
      ctrl: false,
      meta: false,
      shift: false,
      alt: false,
      key: "",
      sequence: normalized.split(/\s+/),
    };
  }

  const parts = normalized.split("+");
  let ctrl = false;
  let meta = false;
  let shift = false;
  let alt = false;
  let key = "";

  for (const part of parts) {
    switch (part) {
      case "ctrl":
      case "control":
        ctrl = true;
        break;
      case "cmd":
      case "meta":
      case "command":
        meta = true;
        break;
      case "shift":
        shift = true;
        break;
      case "alt":
      case "option":
        alt = true;
        break;
      default:
        key = part;
    }
  }

  return { ctrl, meta, shift, alt, key };
}

/**
 * Check if an event matches a key combination.
 */
function matchesKeys(
  e: KeyboardEvent,
  parsed: ReturnType<typeof parseKeys>
): boolean {
  if (parsed.sequence) return false; // Sequences handled separately

  const { ctrl, meta, shift, alt, key } = parsed;
  const eventKey = e.key.toLowerCase();

  // Handle special keys
  const keyMatches =
    key === "?" ? e.key === "?" || (e.shiftKey && e.key === "/") :
    key === "/" ? e.key === "/" :
    key === "escape" || key === "esc" ? e.key === "Escape" :
    key === "enter" ? e.key === "Enter" :
    key === "space" ? e.key === " " :
    key === "tab" ? e.key === "Tab" :
    key === "backspace" ? e.key === "Backspace" :
    key === "delete" ? e.key === "Delete" :
    key === "arrowup" ? e.key === "ArrowUp" :
    key === "arrowdown" ? e.key === "ArrowDown" :
    key === "arrowleft" ? e.key === "ArrowLeft" :
    key === "arrowright" ? e.key === "ArrowRight" :
    eventKey === key;

  const ctrlMatches = ctrl ? e.ctrlKey : !e.ctrlKey;
  const metaMatches = meta ? e.metaKey : !e.metaKey;
  const shiftMatches = shift ? e.shiftKey : (key === "?" ? true : !e.shiftKey);
  const altMatches = alt ? e.altKey : !e.altKey;

  return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
}

/**
 * useKeyboardShortcuts - Hook for registering global keyboard shortcuts.
 *
 * Features:
 * - Modifier key support (cmd, ctrl, shift, alt)
 * - Sequence support (e.g., "g h" for go home)
 * - Automatic input element detection
 * - Platform-aware display (shows Cmd on Mac, Ctrl elsewhere)
 *
 * Limitations:
 * - Multiple sequence shortcuts sharing a prefix (e.g., "g h" and "g b")
 *   may not work correctly. The first matching prefix takes precedence.
 *
 * @example
 * ```tsx
 * function App() {
 *   useKeyboardShortcuts([
 *     {
 *       id: "search",
 *       keys: "cmd+k",
 *       description: "Open search",
 *       handler: () => setSearchOpen(true),
 *       category: "Navigation",
 *     },
 *     {
 *       id: "go-home",
 *       keys: "g h",
 *       description: "Go to home",
 *       handler: () => router.push("/"),
 *       category: "Navigation",
 *     },
 *   ]);
 * }
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: KeyboardShortcutsOptions = {}
) {
  const { enabled = true } = options;
  const sequenceBuffer = useRef<string[]>([]);
  const sequenceTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Check if focus is in an input element
      const isInputFocused =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement ||
        document.activeElement?.getAttribute("contenteditable") === "true";

      for (const shortcut of shortcuts) {
        // Skip non-global shortcuts when input is focused
        if (isInputFocused && !shortcut.global) continue;

        const parsed = parseKeys(shortcut.keys);

        // Handle sequences
        if (parsed.sequence) {
          // Clear sequence buffer on timeout
          if (sequenceTimeout.current) {
            clearTimeout(sequenceTimeout.current);
          }
          sequenceTimeout.current = setTimeout(() => {
            sequenceBuffer.current = [];
          }, 1000);

          // Add current key to buffer
          sequenceBuffer.current.push(e.key.toLowerCase());

          // Check if sequence matches
          const bufferStr = sequenceBuffer.current.join(" ");
          const sequenceStr = parsed.sequence.join(" ");

          if (bufferStr === sequenceStr) {
            if (shortcut.preventDefault !== false) {
              e.preventDefault();
            }
            shortcut.handler();
            sequenceBuffer.current = [];
            return;
          }

          // Partial match - keep buffer
          if (sequenceStr.startsWith(bufferStr)) {
            return;
          }

          // No match - reset if this is the first key of a sequence
          if (parsed.sequence[0] === e.key.toLowerCase()) {
            sequenceBuffer.current = [e.key.toLowerCase()];
          } else {
            sequenceBuffer.current = [];
          }
          continue;
        }

        // Handle single key combinations
        if (matchesKeys(e, parsed)) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimeout.current) {
        clearTimeout(sequenceTimeout.current);
      }
    };
  }, [handleKeyDown]);
}

/**
 * Format a key combination for display.
 * Shows platform-appropriate modifier keys.
 */
export function formatShortcut(keys: string): string {
  const isMac = typeof navigator !== "undefined" && navigator.platform?.includes("Mac");

  return keys
    .split("+")
    .map((part) => {
      const p = part.toLowerCase().trim();
      switch (p) {
        case "cmd":
        case "meta":
        case "command":
          return isMac ? "\u2318" : "Ctrl";
        case "ctrl":
        case "control":
          return isMac ? "\u2303" : "Ctrl";
        case "shift":
          return isMac ? "\u21E7" : "Shift";
        case "alt":
        case "option":
          return isMac ? "\u2325" : "Alt";
        case "enter":
          return "\u21B5";
        case "escape":
        case "esc":
          return "Esc";
        case "backspace":
          return "\u232B";
        case "delete":
          return "\u2326";
        case "tab":
          return "\u21E5";
        case "space":
          return "Space";
        default:
          return p.toUpperCase();
      }
    })
    .join(isMac ? "" : "+");
}

export default useKeyboardShortcuts;
