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
          "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium",
          "min-h-[44px] sm:min-h-0 touch-manipulation",
          "transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
          selected === null
            ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
        )}
      >
        All
        {counts && (
          <span className={cn("ml-1.5 text-xs", selected === null ? "opacity-70" : "text-neutral-400 dark:text-neutral-500")}>
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
            "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium capitalize",
            "min-h-[44px] sm:min-h-0 touch-manipulation",
            "transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
            selected === category
              ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          )}
        >
          {category}
          {counts?.[category] !== undefined && (
            <span className={cn("ml-1.5 text-xs", selected === category ? "opacity-70" : "text-neutral-400 dark:text-neutral-500")}>
              {counts[category]}
            </span>
          )}
        </button>
      ))}

      {selected && (
        <Button
          variant="ghost"
          size="sm"
          className="h-11 sm:h-6 px-2 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white touch-manipulation"
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
