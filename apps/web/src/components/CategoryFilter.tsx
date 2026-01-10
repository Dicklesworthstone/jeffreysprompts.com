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
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge
        variant={selected === null ? "default" : "outline"}
        className={cn(
          "cursor-pointer transition-all hover:scale-105",
          selected === null
            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
            : "hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
        )}
        onClick={() => handleSelect(null)}
      >
        All
        {counts && (
          <span className="ml-1 text-xs opacity-70">
            ({Object.values(counts).reduce((a, b) => a + b, 0)})
          </span>
        )}
      </Badge>

      {categories.map((category) => (
        <Badge
          key={category}
          variant={selected === category ? "default" : "outline"}
          className={cn(
            "cursor-pointer transition-all hover:scale-105 capitalize",
            selected === category
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
          )}
          onClick={() => handleSelect(category)}
        >
          {category}
          {counts?.[category] !== undefined && (
            <span className="ml-1 text-xs opacity-70">({counts[category]})</span>
          )}
        </Badge>
      ))}

      {selected && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          onClick={() => handleSelect(null)}
        >
          <X className="w-3 h-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

export default CategoryFilter;
