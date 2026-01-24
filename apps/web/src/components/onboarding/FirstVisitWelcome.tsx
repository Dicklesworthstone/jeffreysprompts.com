"use client";

/**
 * FirstVisitWelcome - Welcome overlay for first-time visitors.
 *
 * Features:
 * - Animated welcome message
 * - Brief feature highlights
 * - Smooth dismissal animation
 * - Mobile-optimized layout
 */

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Keyboard, Hand, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FirstVisitWelcomeProps {
  /** Whether to show the welcome overlay */
  show: boolean;
  /** Callback when user dismisses */
  onDismiss: () => void;
  /** Optional className */
  className?: string;
}

interface FeatureHighlight {
  icon: typeof Sparkles;
  title: string;
  description: string;
  color: string;
}

const features: FeatureHighlight[] = [
  {
    icon: Search,
    title: "Quick Search",
    description: "Press Cmd+K to search prompts instantly",
    color: "text-sky-400",
  },
  {
    icon: Hand,
    title: "Gestures",
    description: "Swipe cards to copy or save to basket",
    color: "text-indigo-400",
  },
  {
    icon: Keyboard,
    title: "Keyboard Shortcuts",
    description: "Press ? to see all shortcuts",
    color: "text-amber-400",
  },
];

/**
 * FirstVisitWelcome - Shows a welcome overlay for first-time visitors.
 *
 * @example
 * ```tsx
 * const { isFirstVisit, completeFirstVisit } = useOnboarding();
 *
 * <AnimatePresence>
 *   {isFirstVisit && (
 *     <FirstVisitWelcome
 *       show={isFirstVisit}
 *       onDismiss={completeFirstVisit}
 *     />
 *   )}
 * </AnimatePresence>
 * ```
 */
export function FirstVisitWelcome({
  show,
  onDismiss,
  className,
}: FirstVisitWelcomeProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4",
            "bg-black/80 backdrop-blur-sm",
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className={cn(
              "w-full max-w-md rounded-2xl",
              "bg-neutral-900 dark:bg-neutral-100",
              "text-white dark:text-neutral-900",
              "p-6 shadow-2xl"
            )}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 mb-4"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 id="welcome-title" className="text-xl font-bold mb-2">
                Welcome to Jeffrey&apos;s Prompts
              </h2>
              <p className="text-sm text-neutral-400 dark:text-neutral-500">
                Discover powerful prompts for your AI tools
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 mb-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 p-2 rounded-lg",
                        "bg-white/10 dark:bg-black/10",
                        feature.color
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{feature.title}</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={onDismiss}
                className={cn(
                  "w-full",
                  "bg-gradient-to-r from-indigo-500 to-pink-500",
                  "hover:from-indigo-600 hover:to-pink-600",
                  "text-white font-medium",
                  "min-h-[48px] touch-manipulation"
                )}
              >
                Get Started
              </Button>
              <p className="text-center text-[10px] text-neutral-500 dark:text-neutral-400 mt-3">
                You can revisit these tips anytime from settings
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FirstVisitWelcome;
