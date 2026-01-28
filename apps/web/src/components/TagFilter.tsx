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
    ? [...tags].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b))
    : [...tags].sort();

  const visibleTags = sortedTags.slice(0, maxVisible);
  const hiddenCount = sortedTags.length - maxVisible;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span id="tag-filter-label" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Tags
        </span>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-11 sm:h-6 px-2 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white touch-manipulation"
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
                "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium",
                "min-h-[44px] sm:min-h-0 touch-manipulation",
                "transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white",
                isSelected
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              )}
            >
              {isSelected && <Check className="w-3 h-3 mr-1.5" aria-hidden="true" />}
              {tag}
              {counts?.[tag] !== undefined && (
                <span className={cn("ml-1.5 text-xs", isSelected ? "opacity-70" : "text-neutral-400 dark:text-neutral-500")}>
                  {counts[tag]}
                </span>
              )}
            </button>
          );
        })}

        {hiddenCount > 0 && (
          <span className="inline-flex items-center rounded-full px-3 py-2 text-xs font-medium text-neutral-400 dark:text-neutral-500 border border-dashed border-neutral-200 dark:border-neutral-700">
            +{hiddenCount} more
          </span>
        )}
      </div>
    </div>
  );
}

export default TagFilter;
