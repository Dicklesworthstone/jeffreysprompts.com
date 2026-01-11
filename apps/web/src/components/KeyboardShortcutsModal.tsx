"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortcut, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of shortcuts to display */
  shortcuts: KeyboardShortcut[];
  /** Additional className */
  className?: string;
}

/**
 * KeyboardShortcutsModal - Help modal showing available keyboard shortcuts.
 *
 * Features:
 * - Grouped by category
 * - Platform-aware modifier key display
 * - Animated entrance/exit
 * - Closes on Escape or outside click
 *
 * @example
 * ```tsx
 * <KeyboardShortcutsModal
 *   isOpen={helpOpen}
 *   onClose={() => setHelpOpen(false)}
 *   shortcuts={shortcuts}
 * />
 * ```
 */
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
  className,
}: KeyboardShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      const category = shortcut.category || "General";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  const categories = Object.keys(groupedShortcuts);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
              "w-full max-w-lg max-h-[80vh]",
              "bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl",
              "border border-zinc-200 dark:border-zinc-800",
              "overflow-hidden",
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                  <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2
                    id="shortcuts-title"
                    className="text-lg font-semibold text-zinc-900 dark:text-white"
                  >
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Navigate faster with your keyboard
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg",
                  "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200",
                  "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  "transition-colors"
                )}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {categories.map((category) => (
                  <div key={category}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {groupedShortcuts[category].map((shortcut) => (
                        <div
                          key={shortcut.id}
                          className="flex items-center justify-between py-2"
                        >
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {shortcut.description}
                          </span>
                          <ShortcutKeys keys={shortcut.keys} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-mono text-xs">
                  ?
                </kbd>{" "}
                anytime to show this help
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * ShortcutKeys - Render formatted keyboard shortcut keys.
 */
function ShortcutKeys({ keys }: { keys: string }) {
  // Handle sequences (e.g., "g h")
  if (keys.includes(" ") && !keys.includes("+")) {
    const parts = keys.split(/\s+/);
    return (
      <div className="flex items-center gap-1">
        {parts.map((part, i) => (
          <Fragment key={i}>
            <kbd className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {part.toUpperCase()}
            </kbd>
            {i < parts.length - 1 && (
              <span className="text-zinc-400 text-xs">then</span>
            )}
          </Fragment>
        ))}
      </div>
    );
  }

  // Handle combinations (e.g., "cmd+k")
  const parts = keys.split("+");

  return (
    <div className="flex items-center gap-0.5">
      {parts.map((part, i) => {
        const display = formatShortcut(part);
        return (
          <kbd
            key={i}
            className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-xs text-zinc-700 dark:text-zinc-300"
          >
            {display}
          </kbd>
        );
      })}
    </div>
  );
}

export default KeyboardShortcutsModal;
