"use client";

import { ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS, type SortOption } from "@/hooks/useFilterState";

interface SortSelectorProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  disabled?: boolean;
  className?: string;
}

export function SortSelector({
  value,
  onChange,
  disabled = false,
  className,
}: SortSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(val) => onChange(val as SortOption)}
      disabled={disabled}
    >
      <SelectTrigger
        className={className}
        aria-label="Sort prompts by"
      >
        <ArrowUpDown className="w-4 h-4 mr-2 text-neutral-500" aria-hidden="true" />
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default SortSelector;
