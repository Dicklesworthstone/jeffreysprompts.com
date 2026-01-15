"use client";

/**
 * CommunityPromptCard - Card component for community-contributed prompts
 *
 * Shows author info, ratings, and community stats in addition to prompt details.
 */

import { useState, useCallback, useRef, useEffect, type MouseEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Copy,
  Check,
  ChevronRight,
  Star,
  Eye,
  Sparkles,
  BookmarkPlus,
  User,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { copyToClipboard } from "@/lib/clipboard";
import type { CommunityPrompt } from "@/lib/swap-meet/types";

interface CommunityPromptCardProps {
  prompt: CommunityPrompt;
  index?: number;
  featured?: boolean;
  onCopy?: (prompt: CommunityPrompt) => void;
  onClick?: (prompt: CommunityPrompt) => void;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;

  const months = Math.floor(diffDays / 30);
  if (diffDays < 365) return `${months} ${months === 1 ? "month" : "months"} ago`;

  const years = Math.floor(diffDays / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

export function CommunityPromptCard({
  prompt,
  index = 0,
  featured = false,
  onCopy,
  onClick,
}: CommunityPromptCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyFlash, setCopyFlash] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const copiedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { success, error } = useToast();

  useEffect(() => {
    return () => {
      if (copiedResetTimer.current) clearTimeout(copiedResetTimer.current);
      if (copyFlashTimer.current) clearTimeout(copyFlashTimer.current);
    };
  }, []);

  const handleCopy = useCallback(
    async (e: MouseEvent) => {
      e.stopPropagation();
      const result = await copyToClipboard(prompt.content);
      if (result.success) {
        setCopied(true);
        setCopyFlash(true);

        if ("vibrate" in navigator) {
          navigator.vibrate(50);
        }

        success("Copied prompt", prompt.title, { duration: 3000 });
        trackEvent("prompt_copy", { id: prompt.id, source: "swap-meet-card" });
        onCopy?.(prompt);

        if (copyFlashTimer.current) clearTimeout(copyFlashTimer.current);
        copyFlashTimer.current = setTimeout(() => setCopyFlash(false), 300);

        if (copiedResetTimer.current) clearTimeout(copiedResetTimer.current);
        copiedResetTimer.current = setTimeout(() => {
          setCopied(false);
          copiedResetTimer.current = null;
        }, 2000);
      } else {
        error("Failed to copy", "Please try again");
      }
    },
    [prompt, onCopy, success, error]
  );

  const handleClick = useCallback(() => {
    onClick?.(prompt);
  }, [prompt, onClick]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: prefersReducedMotion ? 0 : Math.min(index * 0.03, 0.15),
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="h-full"
    >
      <Card
        data-testid="community-prompt-card"
        data-featured={featured ? "true" : undefined}
        className={cn(
          "group relative flex flex-col h-full cursor-pointer overflow-hidden",
          "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-1",
          "hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)]",
          "dark:hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.4)]",
          "hover:border-neutral-300 dark:hover:border-neutral-700",
          featured && "ring-2 ring-violet-500/20 border-violet-300 dark:border-violet-700"
        )}
        onClick={handleClick}
      >
        {/* Featured indicator */}
        {featured && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
        )}

        <CardHeader className="pb-3 pt-4">
          {/* Author & Stats Row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                {prompt.author.avatarUrl ? (
                  <img
                    src={prompt.author.avatarUrl}
                    alt={prompt.author.displayName}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <User className="h-4 w-4 text-neutral-500" />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  {prompt.author.displayName}
                </span>
                <span className="text-xs text-neutral-500">
                  @{prompt.author.username}
                </span>
              </div>
            </div>
            {featured && (
              <Badge className="gap-1 text-xs bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800">
                <Sparkles className="w-3 h-3" />
                Featured
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold leading-snug text-neutral-900 dark:text-neutral-100 line-clamp-2">
            {prompt.title}
          </h3>
        </CardHeader>

        <CardContent className="flex-1 pb-4">
          {/* Description */}
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2 mb-4">
            {prompt.description}
          </p>

          {/* Category & Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <Badge
              variant="outline"
              className="capitalize text-xs font-medium px-2 py-0.5 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
            >
              {prompt.category}
            </Badge>
            {prompt.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium text-neutral-500 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/70 px-2 py-0.5 rounded-md"
              >
                {tag}
              </span>
            ))}
            {prompt.tags.length > 2 && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 px-1.5 py-0.5">
                +{prompt.tags.length - 2}
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {prompt.stats.rating.toFixed(1)}
              </span>
              <span>({formatNumber(prompt.stats.ratingCount)})</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{formatNumber(prompt.stats.views)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Copy className="h-3.5 w-3.5" />
              <span>{formatNumber(prompt.stats.copies)}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0 pb-4 px-4 mt-auto">
          <div className="w-full space-y-3">
            {/* Content Preview */}
            <div className="relative rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
              <div className="p-3 h-[60px] overflow-hidden">
                <p className="font-mono text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                  {prompt.content.length > 150
                    ? `${prompt.content.slice(0, 150)}...`
                    : prompt.content}
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-neutral-50 dark:from-neutral-800/40 to-transparent pointer-events-none" />
            </div>

            {/* Actions Row */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                {formatDate(prompt.createdAt)}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Save/bookmark functionality
                    success("Saved to library", prompt.title, { duration: 3000 });
                  }}
                  aria-label="Save to library"
                >
                  <BookmarkPlus className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 p-0 relative overflow-hidden",
                    "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                    copied && "text-emerald-600 dark:text-emerald-400",
                    copyFlash && "bg-emerald-100 dark:bg-emerald-900/30"
                  )}
                  onClick={handleCopy}
                  aria-label={copied ? "Copied to clipboard" : "Copy prompt"}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={prefersReducedMotion ? {} : { scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={prefersReducedMotion ? {} : { scale: 0, rotate: 180 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <Check className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={prefersReducedMotion ? {} : { scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={prefersReducedMotion ? {} : { scale: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Copy className="w-4 h-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>

                <Button
                  size="sm"
                  className="h-8 px-3 text-sm font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                >
                  View
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default CommunityPromptCard;
