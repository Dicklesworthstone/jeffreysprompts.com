"use client";

/**
 * SwipeHint - One-time hint overlay for mobile swipe gestures.
 *
 * Teaches users about swipe actions (left = copy, right = basket)
 * on their first visit. Persisted to localStorage so it only shows once.
 */

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Copy, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwipeHintProps {
  onDismiss: () => void;
}

export function SwipeHint({ onDismiss }: SwipeHintProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 rounded-xl backdrop-blur-sm"
    >
      <div className="text-center text-white px-6 py-4">
        <div className="flex items-center justify-center gap-8 mb-4">
          {/* Left swipe indicator */}
          <motion.div
            className="flex items-center gap-2"
            animate={{ x: [-5, 0, -5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowLeft className="w-5 h-5 text-sky-400" />
            <div className="flex flex-col items-center">
              <Copy className="w-4 h-4 text-sky-400 mb-0.5" />
              <span className="text-xs font-medium">Copy</span>
            </div>
          </motion.div>

          {/* Divider */}
          <div className="w-px h-10 bg-white/30" />

          {/* Right swipe indicator */}
          <motion.div
            className="flex items-center gap-2"
            animate={{ x: [5, 0, 5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex flex-col items-center">
              <ShoppingBag className="w-4 h-4 text-indigo-400 mb-0.5" />
              <span className="text-xs font-medium">Basket</span>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-400" />
          </motion.div>
        </div>

        <p className="text-xs text-white/80 mb-4">
          Swipe cards for quick actions
        </p>

        <Button
          size="sm"
          variant="secondary"
          onClick={onDismiss}
          className="text-xs px-4 py-2 min-h-[44px] touch-manipulation"
        >
          Got it
        </Button>
      </div>
    </motion.div>
  );
}
