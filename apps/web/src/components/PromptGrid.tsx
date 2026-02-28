"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PromptCard } from "./PromptCard";
import { SwipeablePromptCard } from "@/components/mobile/SwipeablePromptCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsSmallScreen } from "@/hooks/useIsMobile";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

interface PromptGridProps {
  prompts: Prompt[];
  loading?: boolean;
  onPromptCopy?: (prompt: Prompt) => void;
  onPromptClick?: (prompt: Prompt) => void;
}

export function PromptGrid({
  prompts,
  loading = false,
  onPromptCopy,
  onPromptClick,
}: PromptGridProps) {
  const isMobile = useIsSmallScreen();

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <PromptCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <div className="text-neutral-400 dark:text-neutral-500 mb-2">No prompts found</div>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          Try adjusting your search or filters
        </p>
      </motion.div>
    );
  }

  return (
    <div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <AnimatePresence mode="sync" initial={false}>
        {prompts.map((prompt, index) => (
          <motion.div
            key={prompt.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {isMobile ? (
              <div>
                <SwipeablePromptCard
                  prompt={prompt}
                  index={index}
                  onCopy={onPromptCopy}
                  onClick={onPromptClick}
                  isMobile={isMobile}
                />
              </div>
            ) : (
              <PromptCard
                prompt={prompt}
                index={index}
                onCopy={onPromptCopy}
                onClick={onPromptClick}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function PromptCardSkeleton() {
  return (
    <div className="flex flex-col h-full border-2 rounded-xl p-0 bg-white dark:bg-neutral-900/80 overflow-hidden border-neutral-200/50 dark:border-neutral-800/50">
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-7 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
      </div>
      <div className="mt-auto p-5 space-y-4 border-t border-neutral-100 dark:border-neutral-800">
        <Skeleton className="h-[84px] w-full rounded-xl" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-9 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PromptGrid;