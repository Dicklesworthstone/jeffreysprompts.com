"use client";

import { Trophy, ThumbsUp, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

interface LeaderboardProps {
  limit?: number;
  minVotes?: number;
  onPromptClick?: (prompt: Prompt) => void;
  className?: string;
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-500" />;
    case 2:
      return <Medal className="w-5 h-5 text-neutral-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return (
        <span className="w-5 h-5 flex items-center justify-center text-sm font-semibold text-neutral-500">
          {rank}
        </span>
      );
  }
}

function getRankBgColor(rank: number) {
  switch (rank) {
    case 1:
      return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    case 2:
      return "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700";
    case 3:
      return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
    default:
      return "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800";
  }
}

function LeaderboardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border bg-white dark:bg-neutral-900"
        >
          <Skeleton className="w-5 h-5 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}

export function Leaderboard({
  limit = 10,
  minVotes = 1,
  onPromptClick,
  className,
}: LeaderboardProps) {
  const { entries, loading, error } = useLeaderboard({ limit, minVotes });

  if (loading) {
    return (
      <div className={className}>
        <LeaderboardSkeleton count={Math.min(limit, 5)} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-sm text-neutral-500 dark:text-neutral-400 py-4", className)}>
        Failed to load leaderboard
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn("text-sm text-neutral-500 dark:text-neutral-400 py-4", className)}>
        No rated prompts yet. Be the first to rate!
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {entries.map((entry, index) => {
        const rank = index + 1;
        return (
          <motion.button
            key={entry.prompt.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            onClick={() => onPromptClick?.(entry.prompt)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
              "hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]",
              "text-left",
              getRankBgColor(rank)
            )}
          >
            <div className="flex-shrink-0">{getRankIcon(rank)}</div>

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-neutral-900 dark:text-white truncate text-sm">
                {entry.prompt.title}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                {entry.prompt.category}
              </p>
            </div>

            <div className="flex-shrink-0 flex items-center gap-1.5">
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {entry.rating.approvalRate}%
              </span>
              <span className="text-xs text-neutral-400">
                ({entry.rating.total})
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export default Leaderboard;
