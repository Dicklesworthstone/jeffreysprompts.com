"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { PromptCardPure } from "@/components/PromptCard";
import type { RatingSummary } from "@/lib/ratings/rating-store";
import {
  getForYouRecommendations,
  type RecommendationResult,
  type RecommendationPreferences,
  type RecommendationSignal,
} from "@jeffreysprompts/core/search/recommendations";
import { getOrCreateLocalUserId, listHistory } from "@/lib/history/client";
import { useBasket } from "@/hooks/use-basket";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { localizeHref } from "@/i18n/config";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

interface ForYouPromptsSectionProps {
  prompts: Prompt[];
  onPromptClick: (prompt: Prompt) => void;
  onPromptCopy?: (prompt: Prompt) => void;
  ratingSummaries?: Record<string, RatingSummary>;
}

const HISTORY_LIMIT = 20;
const RECOMMENDATION_LIMIT = 6;
const PREFERENCES_STORAGE_KEY = "jfp_recommendation_preferences_v1";
const DEFAULT_PREFERENCES: RecommendationPreferences = {
  tags: [],
  categories: [],
  excludeTags: [],
  excludeCategories: [],
};

export function ForYouPromptsSection({
  prompts,
  onPromptClick,
  onPromptCopy,
  ratingSummaries,
}: ForYouPromptsSectionProps) {
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [preferences] = useLocalStorage<RecommendationPreferences>(
    PREFERENCES_STORAGE_KEY,
    DEFAULT_PREFERENCES
  );
  const { items: basketItems, addItem } = useBasket();
  const basketSet = useMemo(() => new Set(basketItems), [basketItems]);
  const handleAddToBasket = useCallback(
    (prompt: Prompt) => {
      addItem(prompt.id);
    },
    [addItem]
  );

  const promptMap = useMemo(() => {
    return new Map(prompts.map((prompt) => [prompt.id, prompt]));
  }, [prompts]);

  const hasPreferenceInput = useMemo(() => {
    const pref = preferences;
    return Boolean(
      pref.tags?.length ||
        pref.categories?.length ||
        pref.excludeTags?.length ||
        pref.excludeCategories?.length
    );
  }, [preferences]);

  const loadRecommendations = useCallback(async () => {
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

      const viewedPrompts: Prompt[] = [];
      const viewedIds: string[] = [];
      const viewedSignals: RecommendationSignal[] = [];

      for (const entry of entries) {
        if (!entry.resourceId) continue;
        const prompt = promptMap.get(entry.resourceId);
        if (prompt) {
          viewedPrompts.push(prompt);
          viewedIds.push(prompt.id);
          viewedSignals.push({
            prompt,
            kind: "view",
            occurredAt: entry.viewedAt,
          });
        }
      }

      setHistoryIds(viewedIds);

      const savedPrompts: Prompt[] = [];
      const savedPromptIds: string[] = [];
      const savedSignals: RecommendationSignal[] = [];

      for (const id of basketItems) {
        const prompt = promptMap.get(id);
        if (prompt) {
          savedPrompts.push(prompt);
          savedPromptIds.push(prompt.id);
          savedSignals.push({
            prompt,
            kind: "save",
          });
        }
      }

      setSavedIds(savedPromptIds);

      if (viewedPrompts.length === 0 && savedPrompts.length === 0 && !hasPreferenceInput) {
        setRecommendations([]);
      } else {
        const results = getForYouRecommendations(
          { viewed: viewedSignals, saved: savedSignals, preferences },
          prompts,
          { limit: RECOMMENDATION_LIMIT }
        );
        setRecommendations(results);
      }
    } catch {
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [promptMap, prompts, basketItems, preferences, hasPreferenceInput]);

  useEffect(() => {
    loadRecommendations();

    const handleUpdate = () => loadRecommendations();
    window.addEventListener("jfp:history-update", handleUpdate);
    return () => window.removeEventListener("jfp:history-update", handleUpdate);
  }, [loadRecommendations]);

  if (loading || recommendations.length === 0) {
    return null;
  }

  let subtitle = "Personalized based on your activity";
  if (hasPreferenceInput && historyIds.length === 0 && savedIds.length === 0) {
    subtitle = "Tuned to your preferences";
  } else if (hasPreferenceInput && (historyIds.length > 0 || savedIds.length > 0)) {
    subtitle = "Personalized based on your activity and preferences";
  } else if (historyIds.length > 0 && savedIds.length > 0) {
    subtitle = "Personalized based on your basket and recent views";
  } else if (savedIds.length > 0) {
    subtitle = "Personalized based on your basket";
  } else if (historyIds.length > 0) {
    subtitle = "Personalized based on your recent views";
  }

  return (
    <section className="py-8 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 overflow-x-hidden">
      <div className="container-wide px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                For You
              </h2>
            </div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400 hidden sm:inline">
              {subtitle}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href={localizeHref(locale, "/for-you")}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Open feed
            </Link>
            <Link
              href={localizeHref(locale, "/settings/recommendations")}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Tune feed
            </Link>
            <Link
              href={localizeHref(locale, "/history")}
              className="hidden sm:inline text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              View history
            </Link>
          </div>
        </motion.div>

        <div className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto lg:overflow-visible scrollbar-hide">
          <div className="flex lg:grid lg:grid-cols-3 gap-4 lg:gap-6 pb-4 lg:pb-0 w-max lg:w-auto">
            {recommendations.map((result, index) => (
              <div
                key={result.prompt.id}
                className="w-[300px] lg:w-auto flex-shrink-0 lg:flex-shrink"
              >
                <div className="space-y-2">
                  <PromptCardPure
                    prompt={result.prompt}
                    ratingSummary={ratingSummaries?.[result.prompt.id] ?? null}
                    inBasket={basketSet.has(result.prompt.id)}
                    onAddToBasket={handleAddToBasket}
                    index={index}
                    onClick={onPromptClick}
                    onCopy={onPromptCopy}
                  />
                  {result.reasons.length > 0 ? (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {result.reasons.slice(0, 2).join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
