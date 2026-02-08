"use client";

import { motion } from "framer-motion";

/**
 * AgenticScan - Hyper-optimized scanning animation for search.
 * Mimics a real AI agent "looking" through results.
 */
export function AgenticScan() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-10">
      {/* Horizontal scan lines */}
      <motion.div
        animate={{
          y: ["0%", "100%", "0%"],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-0 left-0 w-full h-px bg-indigo-500 shadow-[0_0_10px_2px_rgba(99,102,241,0.5)]"
      />
      
      {/* Grid flicker effect */}
      <motion.div
        animate={{
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 0.1,
          repeat: Infinity,
        }}
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
    </div>
  );
}
