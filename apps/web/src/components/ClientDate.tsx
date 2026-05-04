"use client";

import { useSyncExternalStore } from "react";

interface ClientDateProps {
  date: string | Date | number;
  format?: "date" | "datetime" | "time";
  className?: string;
  fallback?: string;
}

const subscribe = () => () => {};

function formatClientDate(date: string | Date | number, format: ClientDateProps["format"], fallback: string): string {
  try {
    const d = new Date(date);
    if (format === "date") {
      return d.toLocaleDateString();
    }
    if (format === "time") {
      return d.toLocaleTimeString();
    }
    return d.toLocaleString();
  } catch {
    return fallback;
  }
}

export function ClientDate({ date, format = "datetime", className = "", fallback = "" }: ClientDateProps) {
  const formatted = useSyncExternalStore(
    subscribe,
    () => formatClientDate(date, format, fallback),
    () => null
  );

  if (formatted === null) {
    // Return empty string or fallback during SSR to avoid hydration mismatch
    return <span className={className}>{fallback || "\u00A0"}</span>;
  }

  return <span className={className}>{formatted}</span>;
}
