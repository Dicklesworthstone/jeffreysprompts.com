"use client";

import { useState, useCallback, type MouseEvent } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ShoppingBag,
  GraduationCap,
  BookOpen,
  Rocket,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBasket } from "@/hooks/use-basket";
import type { Prompt, PromptDifficulty } from "@jeffreysprompts/core/prompts/types";

interface PromptCardProps {
  prompt: Prompt;
  index?: number; // for staggered animation
  onCopy?: (prompt: Prompt) => void;
  onClick?: (prompt: Prompt) => void;
}

const difficultyConfig: Record<
  PromptDifficulty,
  { label: string; icon: typeof GraduationCap; color: string }
> = {
  beginner: {
    label: "Beginner",
    icon: BookOpen,
    color: "text-green-600 dark:text-green-400",
  },
  intermediate: {
    label: "Intermediate",
    icon: GraduationCap,
    color: "text-amber-600 dark:text-amber-400",
  },
  advanced: {
    label: "Advanced",
    icon: Rocket,
    color: "text-red-600 dark:text-red-400",
  },
};

export function PromptCard({ prompt, index = 0, onCopy, onClick }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const { isInBasket, addItem, removeItem } = useBasket();
  const inBasket = isInBasket(prompt.id);

  const handleCopy = useCallback(
    async (e: MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(prompt.content);
        setCopied(true);
        onCopy?.(prompt);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard API not available
      }
    },
    [prompt, onCopy]
  );

  const handleBasketToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (inBasket) {
        removeItem(prompt.id);
      } else {
        addItem(prompt.id);
      }
    },
    [prompt.id, inBasket, addItem, removeItem]
  );

  const handleClick = useCallback(() => {
    onClick?.(prompt);
  }, [prompt, onClick]);

  const difficulty = prompt.difficulty && difficultyConfig[prompt.difficulty];
  const DifficultyIcon = difficulty?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card
        className={cn(
          "group relative flex flex-col h-full cursor-pointer",
          "hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-700",
          "transition-all duration-200 ease-out",
          "bg-white dark:bg-zinc-900/50",
          inBasket && "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-900"
        )}
        onClick={handleClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize text-xs">
                {prompt.category}
              </Badge>
              {difficulty && DifficultyIcon && (
                <span className={cn("flex items-center gap-1 text-xs", difficulty.color)}>
                  <DifficultyIcon className="w-3 h-3" />
                  {difficulty.label}
                </span>
              )}
            </div>
            {prompt.featured && (
              <Badge className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                <Sparkles className="w-3 h-3" />
                Featured
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
            {prompt.title}
          </h3>
        </CardHeader>

        <CardContent className="flex-1 pb-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3">
            {prompt.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {prompt.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {prompt.tags.length > 4 && (
              <span className="text-xs text-zinc-400 px-1">
                +{prompt.tags.length - 4}
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-3 border-t dark:border-zinc-800">
          {/* Content preview */}
          <div className="w-full">
            <div className="text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg overflow-hidden h-20 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-50 dark:to-zinc-800/50 pointer-events-none" />
              <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                {prompt.content.slice(0, 200)}...
              </p>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {prompt.estimatedTokens && (
                  <span>~{prompt.estimatedTokens} tokens</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant={inBasket ? "default" : "ghost"}
                  className={cn(
                    "h-8 px-3 text-xs",
                    inBasket && "bg-indigo-600 hover:bg-indigo-700 text-white"
                  )}
                  onClick={handleBasketToggle}
                >
                  <ShoppingBag className="w-3 h-3 mr-1" />
                  {inBasket ? "Added" : "Add"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                >
                  View
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default PromptCard;
