"use client";

/**
 * For You Feed
 *
 * A dedicated recommendations page for bd-2vsu (web slice).
 * Signals are device-local (history + basket) and preferences live in localStorage.
 * (Pro sync/persistence lives in the premium repo.)
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PromptCard } from "@/components/PromptCard";
import { PromptDetailModal } from "@/components/PromptDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBasket } from "@/hooks/use-basket";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { formatCategoryLabel } from "@/lib/discovery/recommendation-helpers";
import { getOrCreateLocalUserId, listHistory } from "@/lib/history/client";
import type { ViewHistoryEntry } from "@/lib/history/types";
import { categories, prompts } from "@jeffreysprompts/core/prompts/registry";
import {
  getForYouRecommendations,
  type RecommendationPreferences,
  type RecommendationSignal,
  type RecommendationResult,
} from "@jeffreysprompts/core/search/recommendations";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

type Timeframe = "7d" | "30d" | "all";

const TIMEFRAME_OPTIONS: Array<{ value: Timeframe; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const HISTORY_LIMIT = 200;
const RECOMMENDATION_LIMIT = 24;

const PREFERENCES_STORAGE_KEY = "jfp_recommendation_preferences_v1";
const DEFAULT_PREFERENCES: RecommendationPreferences = {
  tags: [],
  categories: [],
  excludeTags: [],
  excludeCategories: [],
};

function getCutoffMs(timeframe: Timeframe): number | null {
  if (timeframe === "all") return null;
  const days = timeframe === "7d" ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function filterHistoryByTimeframe(entries: ViewHistoryEntry[], timeframe: Timeframe) {
  const cutoff = getCutoffMs(timeframe);
  if (!cutoff) return entries;
  return entries.filter((entry) => {
    const ts = new Date(entry.viewedAt).getTime();
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

export default function ForYouPage() {
  const { items: basketItems } = useBasket();
  const [preferences] = useLocalStorage<RecommendationPreferences>(
    PREFERENCES_STORAGE_KEY,
    DEFAULT_PREFERENCES
  );

  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<ViewHistoryEntry[]>([]);

  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const modalCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const promptMap = useMemo(() => new Map(prompts.map((prompt) => [prompt.id, prompt])), []);

  const loadHistory = useCallback(async () => {
    const userId = getOrCreateLocalUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const entries = await listHistory(userId, {
        resourceType: "prompt",
        limit: HISTORY_LIMIT,
      });
      setHistoryItems(entries);
    } catch {
      setHistoryItems([]);
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

  const filteredHistory = useMemo(
    () => filterHistoryByTimeframe(historyItems, timeframe),
    [historyItems, timeframe]
  );

  const viewedSignals = useMemo(() => {
    const signals: RecommendationSignal[] = [];
    for (const entry of filteredHistory) {
      if (!entry.resourceId) continue;
      const prompt = promptMap.get(entry.resourceId);
      if (!prompt) continue;
      signals.push({ prompt, kind: "view", occurredAt: entry.viewedAt });
    }
    return signals;
  }, [filteredHistory, promptMap]);

  const savedSignals = useMemo(() => {
    const signals: RecommendationSignal[] = [];
    for (const id of basketItems) {
      const prompt = promptMap.get(id);
      if (!prompt) continue;
      signals.push({ prompt, kind: "save" });
    }
    return signals;
  }, [basketItems, promptMap]);

  const candidatePrompts = useMemo(() => {
    if (category === "all") return prompts;
    return prompts.filter((prompt) => prompt.category === category);
  }, [category]);

  const recommendations = useMemo((): RecommendationResult[] => {
    if (loading) return [];
    return getForYouRecommendations(
      { viewed: viewedSignals, saved: savedSignals, preferences },
      candidatePrompts,
      { limit: RECOMMENDATION_LIMIT }
    );
  }, [candidatePrompts, loading, preferences, savedSignals, viewedSignals]);

  const hasPreferenceInput = useMemo(() => {
    const pref = preferences;
    return Boolean(
      pref.tags?.length ||
        pref.categories?.length ||
        pref.excludeTags?.length ||
        pref.excludeCategories?.length
    );
  }, [preferences]);

  const handlePromptClick = useCallback((prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    // Delay clearing selected prompt for exit animation
    if (modalCloseTimerRef.current) {
      clearTimeout(modalCloseTimerRef.current);
    }
    modalCloseTimerRef.current = setTimeout(() => {
      setSelectedPrompt(null);
      modalCloseTimerRef.current = null;
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (modalCloseTimerRef.current) {
        clearTimeout(modalCloseTimerRef.current);
      }
    };
  }, []);

  const subtitle = useMemo(() => {
    const hasViews = viewedSignals.length > 0;
    const hasSaves = savedSignals.length > 0;

    if (hasPreferenceInput && !hasViews && !hasSaves) return "Tuned to your preferences";
    if (hasPreferenceInput && (hasViews || hasSaves)) {
      return "Personalized based on your activity and preferences";
    }
    if (hasViews && hasSaves) return "Personalized based on your basket and recent views";
    if (hasSaves) return "Personalized based on your basket";
    if (hasViews) return "Personalized based on your recent views";
    return "Popular prompts in the library";
  }, [hasPreferenceInput, savedSignals.length, viewedSignals.length]);

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
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
                  For You
                </h1>
              </div>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400 max-w-2xl">
                {subtitle}. Timeframe filters your view-history signals; category filters which prompts
                are shown. Preferences always apply.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/settings/recommendations"
                className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                Tune feed
              </Link>
              <Link
                href="/history"
                className="hidden sm:inline text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                View history
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-wide py-10 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Timeframe</div>
              <Select value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Category</div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatCategoryLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Signals</div>
              <div className="text-sm text-foreground">
                {viewedSignals.length} view{viewedSignals.length === 1 ? "" : "s"} ·{" "}
                {savedSignals.length} saved
              </div>
              <div className="text-xs text-muted-foreground">
                Stored locally in this browser.
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading recommendations...</div>
        ) : recommendations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No recommendations match your current filters and preferences. Try widening your
              preferences or changing the category.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recommendations.map((result, index) => (
              <div key={result.prompt.id} className="space-y-2">
                <PromptCard
                  prompt={result.prompt}
                  index={index}
                  onClick={handlePromptClick}
                />
                {result.reasons.length > 0 ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {result.reasons.slice(0, 2).join(" · ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <PromptDetailModal prompt={selectedPrompt} open={modalOpen} onClose={handleModalClose} />
    </div>
  );
}
