"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { getPrompt } from "@jeffreysprompts/core/prompts";
import { clearHistoryForUser, getOrCreateLocalUserId, listHistory } from "@/lib/history/client";
import type { ViewHistoryEntry } from "@/lib/history/types";

const LIMIT = 8;

export function RecentlyViewedSidebar() {
  const { success, error } = useToast();
  const [items, setItems] = useState<ViewHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const loadHistory = useCallback(async () => {
    const userId = getOrCreateLocalUserId();
    if (!userId) return;

    try {
      const historyItems = await listHistory(userId, { limit: LIMIT });
      setItems(historyItems);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();

    const handleUpdate = () => loadHistory();
    window.addEventListener("jfp:history-update", handleUpdate);
    return () => window.removeEventListener("jfp:history-update", handleUpdate);
  }, [loadHistory]);

  const handleClear = useCallback(async () => {
    setClearing(true);
    try {
      await clearHistoryForUser();
      setItems([]);
      success("History cleared", "Recently viewed items removed");
    } catch {
      error("Unable to clear history", "Please try again later");
    } finally {
      setClearing(false);
    }
  }, [success, error]);

  const entries = useMemo(() => {
    return items.slice(0, LIMIT).map((entry) => {
      if (entry.resourceType === "prompt" && entry.resourceId) {
        const prompt = getPrompt(entry.resourceId);
        return {
          ...entry,
          title: prompt?.title ?? entry.resourceId,
          category: prompt?.category ?? null,
          href: prompt ? `/prompts/${prompt.id}` : null,
          kindLabel: "Prompt",
        };
      }

      if (entry.resourceType === "search") {
        const query = entry.searchQuery ?? "";
        return {
          ...entry,
          title: query ? `Search: ${query}` : "Search",
          category: null,
          href: query ? `/?q=${encodeURIComponent(query)}` : "/",
          kindLabel: "Search",
        };
      }

      return {
        ...entry,
        title: entry.resourceId ?? entry.resourceType,
        category: null,
        href: null,
        kindLabel: entry.resourceType,
      };
    });
  }, [items]);

  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-500" />
            Recently Viewed
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Quick links to your latest prompts and searches
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClear}
          disabled={clearing || items.length === 0}
          aria-label="Clear history"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading history...</div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 p-4 text-center text-sm text-muted-foreground">
            No recent activity yet. Open a prompt to start building history.
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {entry.resourceType === "search" ? (
                      <Search className="h-3.5 w-3.5 text-neutral-500" />
                    ) : null}
                    {entry.category ? (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {entry.category}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {entry.kindLabel}
                      </Badge>
                    )}
                  </div>
                  {entry.href ? (
                    <Link
                      href={entry.href}
                      className="mt-1 block truncate text-sm font-medium text-neutral-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400"
                    >
                      {entry.title}
                    </Link>
                  ) : (
                    <div className="mt-1 truncate text-sm font-medium text-neutral-900 dark:text-white">
                      {entry.title}
                    </div>
                  )}
                </div>
                {entry.href ? (
                  <Link
                    href={entry.href}
                    className="mt-3 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    aria-label="Open"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <Link
          href="/history"
          className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500"
        >
          View full history
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
