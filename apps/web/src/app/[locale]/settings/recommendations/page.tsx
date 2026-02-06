"use client";

/**
 * Recommendations Settings
 *
 * Device-local preferences used to tune the "For You" feed.
 * (Pro sync/persistence lives in the premium repo.)
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, EyeOff, Sparkles, Target, RotateCcw, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { categories as allCategories } from "@jeffreysprompts/core/prompts";
import type { RecommendationPreferences } from "@jeffreysprompts/core/search";
import { formatCategoryLabel, sortUnique, parseTagCsv, formatCsv } from "@/lib/discovery/recommendation-helpers";

const STORAGE_KEY = "jfp_recommendation_preferences_v1";

const DEFAULT_PREFERENCES: RecommendationPreferences = {
  tags: [],
  categories: [],
  excludeTags: [],
  excludeCategories: [],
};

export default function RecommendationsSettingsPage() {
  const [preferences, setPreferences, removePreferences] = useLocalStorage<RecommendationPreferences>(
    STORAGE_KEY,
    DEFAULT_PREFERENCES
  );

  const [boostTagsDraft, setBoostTagsDraft] = useState("");
  const [hideTagsDraft, setHideTagsDraft] = useState("");

  const preferredCategories = useMemo(
    () => new Set(preferences.categories ?? []),
    [preferences.categories]
  );

  const excludedCategories = useMemo(
    () => new Set(preferences.excludeCategories ?? []),
    [preferences.excludeCategories]
  );

  const hasAnyPreferences = useMemo(() => {
    return Boolean(
      preferences.tags?.length ||
        preferences.categories?.length ||
        preferences.excludeTags?.length ||
        preferences.excludeCategories?.length
    );
  }, [preferences]);

  // Sync draft inputs from persisted preferences (e.g. after Reset).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setBoostTagsDraft(formatCsv(preferences.tags));
  }, [preferences.tags]);

  useEffect(() => {
    setHideTagsDraft(formatCsv(preferences.excludeTags));
  }, [preferences.excludeTags]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const togglePreferredCategory = useCallback(
    (category: string) => {
      setPreferences((prev) => {
        const nextPreferred = new Set(prev.categories ?? []);
        const nextExcluded = new Set(prev.excludeCategories ?? []);

        if (nextPreferred.has(category)) {
          nextPreferred.delete(category);
        } else {
          nextPreferred.add(category);
          // Can't both prefer and exclude the same category.
          nextExcluded.delete(category);
        }

        return {
          ...prev,
          categories: sortUnique([...nextPreferred]),
          excludeCategories: sortUnique([...nextExcluded]),
        };
      });
    },
    [setPreferences]
  );

  const toggleExcludedCategory = useCallback(
    (category: string) => {
      setPreferences((prev) => {
        const nextPreferred = new Set(prev.categories ?? []);
        const nextExcluded = new Set(prev.excludeCategories ?? []);

        if (nextExcluded.has(category)) {
          nextExcluded.delete(category);
        } else {
          nextExcluded.add(category);
          // Can't both prefer and exclude the same category.
          nextPreferred.delete(category);
        }

        return {
          ...prev,
          categories: sortUnique([...nextPreferred]),
          excludeCategories: sortUnique([...nextExcluded]),
        };
      });
    },
    [setPreferences]
  );

  const applyBoostTags = useCallback(() => {
    const nextTags = parseTagCsv(boostTagsDraft);
    setPreferences((prev) => {
      const nextExcluded = new Set(prev.excludeTags ?? []);
      for (const tag of nextTags) {
        nextExcluded.delete(tag);
      }
      return {
        ...prev,
        tags: nextTags,
        excludeTags: sortUnique([...nextExcluded]),
      };
    });
  }, [boostTagsDraft, setPreferences]);

  const applyHideTags = useCallback(() => {
    const nextExcluded = parseTagCsv(hideTagsDraft);
    setPreferences((prev) => {
      const nextPreferred = new Set(prev.tags ?? []);
      for (const tag of nextExcluded) {
        nextPreferred.delete(tag);
      }
      return {
        ...prev,
        tags: sortUnique([...nextPreferred]),
        excludeTags: nextExcluded,
      };
    });
  }, [hideTagsDraft, setPreferences]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-border/60 bg-white dark:bg-neutral-900">
        <div className="container-wide py-10">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">
              Recommendations
            </h1>
            <Badge variant="secondary" className="text-xs">
              Device-local
            </Badge>
          </div>

          <p className="mt-2 text-neutral-600 dark:text-neutral-400 max-w-2xl">
            Tune your &quot;For You&quot; feed. These preferences are stored in this browser and
            used alongside your recent views and basket activity.
          </p>
        </div>
      </div>

      <div className="container-wide py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              Boost Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Prefer prompts from these categories when generating recommendations.
            </p>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((category) => {
                const selected = preferredCategories.has(category);
                return (
                  <Button
                    key={category}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    aria-pressed={selected}
                    onClick={() => togglePreferredCategory(category)}
                  >
                    {formatCategoryLabel(category)}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Boost tags</p>
              <p className="text-sm text-muted-foreground">
                Comma-separated. Example: <code className="text-xs">ultrathink, docs, refactor</code>
                . Changes apply when the field loses focus.
              </p>
              <Textarea
                value={boostTagsDraft}
                onChange={(event) => setBoostTagsDraft(event.target.value)}
                onBlur={applyBoostTags}
                placeholder="ultrathink, docs"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Hide tags</p>
              <p className="text-sm text-muted-foreground">
                Comma-separated. Prompts with any hidden tag will be excluded from recommendations.
              </p>
              <Textarea
                value={hideTagsDraft}
                onChange={(event) => setHideTagsDraft(event.target.value)}
                onBlur={applyHideTags}
                placeholder="spam, low-quality"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <EyeOff className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              Hide Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Exclude prompts from these categories entirely.
            </p>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((category) => {
                const selected = excludedCategories.has(category);
                return (
                  <Button
                    key={category}
                    type="button"
                    size="sm"
                    variant={selected ? "destructive" : "outline"}
                    aria-pressed={selected}
                    onClick={() => toggleExcludedCategory(category)}
                  >
                    {formatCategoryLabel(category)}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removePreferences}
            disabled={!hasAnyPreferences}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
