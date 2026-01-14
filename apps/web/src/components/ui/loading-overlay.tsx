"use client";

/**
 * LoadingOverlay Component
 *
 * Covers the current view with a loading state and optional progress.
 *
 * @see brenner_bot-ik2s (bead)
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  detail?: string;
  progress?: number;
  cancellable?: boolean;
  onCancel?: () => void;
  className?: string;
}

function ProgressBar({ progress }: { progress: number }) {
  const percent = progress <= 1 ? progress * 100 : progress;
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div className="h-2 rounded-full bg-primary" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function LoadingOverlay({
  visible,
  message = "Working...",
  detail,
  progress,
  cancellable,
  onCancel,
  className,
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center", className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="loading-message"
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Loader2 className="size-5 animate-spin" />
          </div>
          <div className="space-y-1">
            <div id="loading-message" className="text-sm font-semibold text-foreground">
              {message}
            </div>
            {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
          </div>
        </div>

        {typeof progress === "number" && (
          <div className="mt-4 space-y-2">
            <ProgressBar progress={progress} />
            <div className="text-xs text-muted-foreground">
              {Math.round((progress <= 1 ? progress : progress / 100) * 100)}% complete
            </div>
          </div>
        )}

        {cancellable && onCancel && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadingOverlay;
