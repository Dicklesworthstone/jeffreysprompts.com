"use client";

import { motion } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { PromptCard } from "@/components/PromptCard";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

interface FeaturedPromptsSectionProps {
  prompts: Prompt[];
  totalCount: number;
  onPromptClick: (prompt: Prompt) => void;
  onPromptCopy?: (prompt: Prompt) => void;
}

export function FeaturedPromptsSection({
  prompts,
  totalCount,
  onPromptClick,
  onPromptCopy,
}: FeaturedPromptsSectionProps) {
  // Take first 6 prompts (featured ones should be at the front)
  const featuredPrompts = prompts.slice(0, 6);

  if (featuredPrompts.length === 0) return null;

  return (
    <section className="py-8 bg-white dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800 overflow-x-hidden">
      <div className="container-wide px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Featured Prompts
              </h2>
            </div>
            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 hidden sm:inline">
              Curated by the team
            </span>
          </div>
          <a
            href="#prompts-section"
            className="flex items-center gap-1.5 text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors group/link"
          >
            View all {totalCount} prompts
            <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" />
          </a>
        </motion.div>

        {/* Mobile: Horizontal scroll */}
        <div className="lg:hidden -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 pb-4" style={{ width: "max-content" }}>
            {featuredPrompts.map((prompt, index) => (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="w-[300px] flex-shrink-0"
              >
                <PromptCard
                  prompt={prompt}
                  index={index}
                  onClick={() => onPromptClick(prompt)}
                  onCopy={() => onPromptCopy?.(prompt)}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Desktop: 3x2 Grid */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {featuredPrompts.map((prompt, index) => (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <PromptCard
                prompt={prompt}
                index={index}
                onClick={() => onPromptClick(prompt)}
                onCopy={() => onPromptCopy?.(prompt)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
