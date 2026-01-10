"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";

interface CategoryFilterProps {
  categories: PromptCategory[];
  selected: PromptCategory | null;
  onChange: (category: PromptCategory | null) => void;
  counts?: Record<PromptCategory, number>;
  className?: string;
}

export function CategoryFilter({
  categories,
  selected,
  onChange,
  counts,
  className,
}: CategoryFilterProps) {
  const handleSelect = useCallback(
    (category: PromptCategory | null) => {
      onChange(category);
    },
    [onChange]
  );

  return (
    <div
      role="group"
      aria-label="Filter by category"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <button
        type="button"
        aria-pressed={selected === null}
        onClick={() => handleSelect(null)}
        className={cn(
          "inline-flex items-center rounded-full px-4 py-2 min-h-[44px] text-xs font-medium",
          "transition-colors duration-150 ease-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation",
          selected === null
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
            : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
        )}
      >
        All
        {counts && (
          <span className={cn("ml-1.5 text-[11px]", selected === null ? "text-indigo-200" : "text-zinc-400")}>
            {Object.values(counts).reduce((a, b) => a + b, 0)}
          </span>
        )}
      </button>

      {categories.map((category) => (
        <button
          key={category}
          type="button"
          aria-pressed={selected === category}
          onClick={() => handleSelect(category)}
          className={cn(
            "inline-flex items-center rounded-full px-4 py-2 min-h-[44px] text-xs font-medium capitalize",
            "transition-colors duration-150 ease-out",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation",
            selected === category
              ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
              : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
          )}
        >
          {category}
          {counts?.[category] !== undefined && (
            <span className={cn("ml-1.5 text-[11px]", selected === category ? "text-indigo-200" : "text-zinc-400")}>
              {counts[category]}
            </span>
          )}
        </button>
      ))}

      {selected && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 sm:h-6 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white touch-manipulation"
          onClick={() => handleSelect(null)}
          aria-label="Clear category filter"
        >
          <X className="w-3 h-3 mr-1" aria-hidden="true" />
          Clear
        </Button>
      )}
    </div>
  );
}

export default CategoryFilter;
