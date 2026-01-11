"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServiceWorker } from "@/hooks/useServiceWorker";

interface OfflineBannerProps {
  className?: string;
}

/**
 * OfflineBanner - Shows a subtle banner when using cached data offline.
 *
 * Displays when:
 * - navigator.onLine is false
 *
 * Features:
 * - Dismissible with X button
 * - Re-appears if user goes online and then offline again
 * - Non-intrusive fixed positioning at bottom
 */
export function OfflineBanner({ className }: OfflineBannerProps) {
  const { isOffline, isRegistered } = useServiceWorker();
  const [dismissed, setDismissed] = useState(false);

  if (!isOffline || !isRegistered) {
    return null;
  }

  // Don't show if dismissed while offline
  const shouldShow = !dismissed;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={cn(
            "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50",
            className
          )}
        >
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl",
              "bg-amber-50 dark:bg-amber-950/80",
              "border border-amber-200 dark:border-amber-800",
              "shadow-lg backdrop-blur-sm"
            )}
            role="alert"
            aria-live="polite"
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>

            {/* Message */}
            <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
              Showing cached prompts. Some features may be limited offline.
            </p>

            {/* Dismiss button */}
            <button
              onClick={() => setDismissed(true)}
              className={cn(
                "flex-shrink-0 p-1.5 rounded-lg",
                "text-amber-600 dark:text-amber-400",
                "hover:bg-amber-100 dark:hover:bg-amber-900/50",
                "transition-colors duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              )}
              aria-label="Dismiss offline notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
