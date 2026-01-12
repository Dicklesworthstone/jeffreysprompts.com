"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface InstallPromptProps {
  className?: string;
  delay?: number;
}

/**
 * InstallPrompt - Shows a banner to install the PWA.
 *
 * Features:
 * - Automatically detects if app is installable
 * - Shows iOS-specific instructions (Add to Home Screen)
 * - Dismissible with localStorage persistence
 * - Only shows after a delay for better UX
 */
export function InstallPrompt({ className, delay = 30000 }: InstallPromptProps) {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if previously dismissed
    const wasDismissed = localStorage.getItem("jfp-pwa-prompt-dismissed");
    if (wasDismissed) {
      return;
    }

    // Show prompt after delay
    const timer = setTimeout(() => {
      setDismissed(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("jfp-pwa-prompt-dismissed", "true");
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    const result = await promptInstall();
    if (result.outcome === "accepted") {
      handleDismiss();
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) {
    return null;
  }

  // Don't show if not installable and not iOS
  if (!isInstallable && !isIOS) {
    return null;
  }

  // iOS instructions modal
  if (showIOSInstructions) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowIOSInstructions(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">Install on iOS</h3>
            <div className="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30">
                  1
                </div>
                <p className="flex-1">
                  Tap the <Share className="inline h-4 w-4" /> Share button in your browser
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30">
                  2
                </div>
                <p className="flex-1">
                  Scroll down and tap <Plus className="inline h-4 w-4" /> &quot;Add to Home
                  Screen&quot;
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30">
                  3
                </div>
                <p className="flex-1">Tap &quot;Add&quot; to confirm</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowIOSInstructions(false);
                handleDismiss();
              }}
              className="mt-6 w-full rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={cn(
          "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50",
          className
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            "bg-violet-50 dark:bg-violet-950/80",
            "border border-violet-200 dark:border-violet-800",
            "shadow-lg backdrop-blur-sm"
          )}
        >
          <div className="flex-shrink-0">
            <Download className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-violet-900 dark:text-violet-100">
              Install JeffreysPrompts
            </p>
            <p className="text-xs text-violet-600 dark:text-violet-400 truncate">
              Add to home screen for quick access
            </p>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleInstall}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium",
                "bg-violet-600 text-white",
                "hover:bg-violet-700",
                "transition-colors duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              )}
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className={cn(
                "p-1.5 rounded-lg",
                "text-violet-600 dark:text-violet-400",
                "hover:bg-violet-100 dark:hover:bg-violet-900/50",
                "transition-colors duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              )}
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
