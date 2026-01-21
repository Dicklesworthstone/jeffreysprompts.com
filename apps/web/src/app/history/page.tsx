"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { getPrompt } from "@jeffreysprompts/core/prompts";
import { clearHistoryForUser, getOrCreateLocalUserId } from "@/lib/history/client";
import type { ViewHistoryEntry } from "@/lib/history/types";

const LIMIT = 100;

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function HistoryPage() {
  const { success, error } = useToast();
  const [items, setItems] = useState<ViewHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [clearing, setClearing] = useState(false);

  const loadHistory = useCallback(async () => {
    const userId = getOrCreateLocalUserId();
    if (!userId) return;

    try {
      const response = await fetch(
        `/api/history?userId=${encodeURIComponent(userId)}&limit=${LIMIT}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error("Failed to load history");
      }
      const payload = await response.json();
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleClear = useCallback(async () => {
    setClearing(true);
    try {
      await clearHistoryForUser();
      setItems([]);
      success("History cleared", "Your recently viewed history has been removed");
    } catch {
      error("Unable to clear history", "Please try again later");
    } finally {
      setClearing(false);
    }
  }, [success, error]);

  const resolvedItems = useMemo(() => {
    return items.map((entry) => {
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
        const searchQuery = entry.searchQuery ?? "";
        return {
          ...entry,
          title: searchQuery ? `Search: ${searchQuery}` : "Search",
          category: null,
          href: searchQuery ? `/?q=${encodeURIComponent(searchQuery)}` : "/",
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

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return resolvedItems;
    return resolvedItems.filter((entry) => {
      const haystack = [entry.title, entry.searchQuery, entry.resourceType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [query, resolvedItems]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b border-border/60 bg-white dark:bg-neutral-900">
        <div className="container-wide py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to prompts
          </Link>
          <div className="mt-4 flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
                Recently Viewed
              </h1>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Browse prompts and searches you recently opened.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={clearing || items.length === 0}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {clearing ? "Clearing..." : "Clear history"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container-wide py-10 space-y-6">
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
            </div>
            <div className="sm:ml-auto w-full sm:w-64">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search history..."
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading history...</div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? "No history yet. Open a prompt to start building your history."
                : "No matches. Try a different search term."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredItems.map((entry) => (
              <Card key={entry.id} className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={entry.resourceType === "search" ? "outline" : "secondary"}>
                      {entry.category ?? entry.kindLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(entry.viewedAt)}
                    </span>
                  </div>
                  <CardTitle className="text-base mt-2">
                    {entry.href ? (
                      <Link
                        href={entry.href}
                        className="hover:text-violet-600 dark:hover:text-violet-400"
                      >
                        {entry.title}
                      </Link>
                    ) : (
                      entry.title
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {entry.resourceType === "search" && entry.searchQuery ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Search className="h-3.5 w-3.5" />
                      Query: {entry.searchQuery}
                    </div>
                  ) : null}
                  {entry.resourceType !== "search" && entry.resourceId ? (
                    <div className="text-xs text-muted-foreground">ID: {entry.resourceId}</div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
