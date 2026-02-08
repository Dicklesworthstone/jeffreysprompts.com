"use client";

import { ThumbsUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MIN_RATING_OPTIONS, type MinRatingOption } from "@/hooks/useFilterState";

interface RatingFilterProps {
  value: MinRatingOption;
  onChange: (value: MinRatingOption) => void;
  disabled?: boolean;
  className?: string;
}

export function RatingFilter({
  value,
  onChange,
  disabled = false,
  className,
}: RatingFilterProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(val) => {
        const numVal = Number(val);
        // Validate that the value is a valid MinRatingOption, default to 0 if invalid
        const validOptionValues = MIN_RATING_OPTIONS.map(o => o.value);
        onChange(validOptionValues.includes(numVal as MinRatingOption) ? (numVal as MinRatingOption) : 0);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={className}
        aria-label="Filter by minimum rating"
      >
        <ThumbsUp className="w-4 h-4 mr-2 text-neutral-500" aria-hidden="true" />
        <SelectValue placeholder="Min rating" />
      </SelectTrigger>
      <SelectContent>
        {MIN_RATING_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default RatingFilter;
