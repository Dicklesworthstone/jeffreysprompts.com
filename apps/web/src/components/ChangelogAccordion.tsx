"use client";

import type { PromptChange } from "@jeffreysprompts/core/prompts/types";
import { ChevronDown, Sparkles, Wrench, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChangelogAccordionProps {
  changelog?: PromptChange[];
}

const typeConfig = {
  improvement: {
    label: "Improvement",
    icon: Sparkles,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  fix: {
    label: "Fix",
    icon: Wrench,
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  breaking: {
    label: "Breaking",
    icon: AlertTriangle,
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
} as const;

export function ChangelogAccordion({ changelog }: ChangelogAccordionProps) {
  if (!changelog || changelog.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Changelog</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {changelog.map((entry, index) => {
          const config = typeConfig[entry.type];
          const Icon = config.icon;
          return (
            <details
              key={`${entry.version}-${entry.date}-${index}`}
              className="group rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      config.className
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </span>
                  <span className="font-medium">v{entry.version}</span>
                  <span className="text-muted-foreground">{entry.date}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{entry.summary}</p>
            </details>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default ChangelogAccordion;
