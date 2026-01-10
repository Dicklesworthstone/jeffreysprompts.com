"use client";

import { useCallback } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tags
        </span>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            onClick={handleClear}
          >
            <X className="w-3 h-3 mr-1" />
            Clear ({selected.length})
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTags.map((tag) => {
          const isSelected = selected.includes(tag);
          return (
            <Badge
              key={tag}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all hover:scale-105",
                isSelected
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
              )}
              onClick={() => handleToggle(tag)}
            >
              {isSelected && <Check className="w-3 h-3 mr-1" />}
              #{tag}
              {counts?.[tag] !== undefined && (
                <span className="ml-1 text-xs opacity-70">({counts[tag]})</span>
              )}
            </Badge>
          );
        })}

        {hiddenCount > 0 && (
          <Badge variant="outline" className="text-zinc-400 cursor-default">
            +{hiddenCount} more
          </Badge>
        )}
      </div>
    </div>
  );
}

export default TagFilter;
