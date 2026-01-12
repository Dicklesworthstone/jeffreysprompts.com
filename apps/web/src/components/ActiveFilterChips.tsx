"use client";

import type { ReactNode } from "react";
import { Search, Folder, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PromptCategory } from "@jeffreysprompts/core/prompts/types";

interface ActiveFilterChipsProps {
  query: string;
  category: PromptCategory | null;
  tags: string[];
  onRemoveQuery: () => void;
  onRemoveCategory: () => void;
  onRemoveTag: (tag: string) => void;
  onClearAll: () => void;
}

interface FilterChipProps {
  label: string;
  ariaLabel: string;
  icon?: ReactNode;
  onRemove: () => void;
  className?: string;
}

function FilterChip({ label, ariaLabel, icon, onRemove, className }: FilterChipProps) {
  return (
    <span
      data-testid="filter-chip"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-300",
        "group transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700",
        className
      )}
    >
      {icon && (
        <span className="text-neutral-400 dark:text-neutral-500">{icon}</span>
      )}
      <span className="max-w-[150px] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500"
        aria-label={ariaLabel}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export function ActiveFilterChips({
  query,
  category,
  tags,
  onRemoveQuery,
  onRemoveCategory,
  onRemoveTag,
  onClearAll,
}: ActiveFilterChipsProps) {
  const hasFilters = query || category || tags.length > 0;

  if (!hasFilters) return null;

  return (
    <div
      role="region"
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-2 py-4 border-b border-neutral-200 dark:border-neutral-800"
    >
      <span className="text-sm text-neutral-500 dark:text-neutral-400 mr-1">
        Active filters:
      </span>

      {/* Search query chip */}
      {query && (
        <FilterChip
          label={`"${query}"`}
          ariaLabel={`Remove search filter: ${query}`}
          icon={<Search className="w-3 h-3" />}
          onRemove={onRemoveQuery}
        />
      )}

      {/* Category chip */}
      {category && (
        <FilterChip
          label={category}
          ariaLabel={`Remove category filter: ${category}`}
          icon={<Folder className="w-3 h-3" />}
          onRemove={onRemoveCategory}
          className="capitalize"
        />
      )}

      {/* Tag chips */}
      {tags.map((tag) => (
        <FilterChip
          key={tag}
          label={tag}
          ariaLabel={`Remove tag filter: ${tag}`}
          icon={<Tag className="w-3 h-3" />}
          onRemove={() => onRemoveTag(tag)}
        />
      ))}

      {/* Clear all */}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-2 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500 rounded px-1"
        aria-label="Clear all active filters"
      >
        Clear all
      </button>
    </div>
  );
}
