"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
          "inline-flex items-center rounded-full px-3 py-2 min-h-[44px] text-xs font-semibold",
          "transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation",
          selected === null
            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
            : "border border-input bg-background hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
        )}
      >
        All
        {counts && (
          <span className="ml-1 text-xs opacity-70">
            ({Object.values(counts).reduce((a, b) => a + b, 0)})
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
            "inline-flex items-center rounded-full px-3 py-2 min-h-[44px] text-xs font-semibold capitalize",
            "transition-all hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation",
            selected === category
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "border border-input bg-background hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
          )}
        >
          {category}
          {counts?.[category] !== undefined && (
            <span className="ml-1 text-xs opacity-70">({counts[category]})</span>
          )}
        </button>
      ))}

      {selected && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
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
