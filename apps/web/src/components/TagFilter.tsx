"use client";

import { useCallback } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TagFilterProps {
  tags: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  counts?: Record<string, number>;
  maxVisible?: number;
  className?: string;
}

export function TagFilter({
  tags,
  selected,
  onChange,
  counts,
  maxVisible = 15,
  className,
}: TagFilterProps) {
  const handleToggle = useCallback(
    (tag: string) => {
      if (selected.includes(tag)) {
        onChange(selected.filter((t) => t !== tag));
      } else {
        onChange([...selected, tag]);
      }
    },
    [selected, onChange]
  );

  const handleClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Sort tags by count if available, otherwise alphabetically
  const sortedTags = counts
    ? [...tags].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    : [...tags].sort();

  const visibleTags = sortedTags.slice(0, maxVisible);
  const hiddenCount = sortedTags.length - maxVisible;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span id="tag-filter-label" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tags
        </span>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 sm:h-6 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white touch-manipulation"
            onClick={handleClear}
            aria-label={`Clear ${selected.length} selected tag${selected.length === 1 ? "" : "s"}`}
          >
            <X className="w-3 h-3 mr-1" aria-hidden="true" />
            Clear ({selected.length})
          </Button>
        )}
      </div>

      <div
        role="group"
        aria-labelledby="tag-filter-label"
        className="flex flex-wrap gap-2"
      >
        {visibleTags.map((tag) => {
          const isSelected = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleToggle(tag)}
              className={cn(
                "inline-flex items-center rounded-full px-3 py-2 min-h-[44px] text-xs font-medium",
                "transition-colors duration-150 ease-out",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation",
                isSelected
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/25"
                  : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              {isSelected && <Check className="w-3 h-3 mr-1.5" aria-hidden="true" />}
              {tag}
              {counts?.[tag] !== undefined && (
                <span className={cn("ml-1.5 text-[11px]", isSelected ? "text-indigo-200" : "text-zinc-400")}>
                  {counts[tag]}
                </span>
              )}
            </button>
          );
        })}

        {hiddenCount > 0 && (
          <span className="inline-flex items-center rounded-full px-3 py-2 text-xs font-medium text-zinc-400 dark:text-zinc-600 border border-dashed border-zinc-200 dark:border-zinc-800">
            +{hiddenCount} more
          </span>
        )}
      </div>
    </div>
  );
}

export default TagFilter;
