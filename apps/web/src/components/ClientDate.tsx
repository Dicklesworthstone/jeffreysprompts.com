"use client";

import { useEffect, useState } from "react";

interface ClientDateProps {
  date: string | Date | number;
  format?: "date" | "datetime" | "time";
  className?: string;
  fallback?: string;
}

export function ClientDate({ date, format = "datetime", className = "", fallback = "" }: ClientDateProps) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    try {
      const d = new Date(date);
      if (format === "date") {
        setFormatted(d.toLocaleDateString());
      } else if (format === "time") {
        setFormatted(d.toLocaleTimeString());
      } else {
        setFormatted(d.toLocaleString());
      }
    } catch {
      setFormatted(fallback);
    }
  }, [date, format, fallback]);

  if (formatted === null) {
    // Return empty string or fallback during SSR to avoid hydration mismatch
    return <span className={className}>{fallback || "\u00A0"}</span>;
  }

  return <span className={className}>{formatted}</span>;
}
