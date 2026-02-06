"use client";

import { useMemo } from "react";
import Link from "next/link";
import { prompts, getPrompt } from "@jeffreysprompts/core/prompts/registry";
import { searchPrompts } from "@jeffreysprompts/core/search/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RelatedPromptsProps {
  promptId: string;
  limit?: number;
}

interface ScoredPrompt {
  id: string;
  score: number;
}

function scoreRelatedPrompts(promptId: string, limit: number): ScoredPrompt[] {
  const current = getPrompt(promptId);
  if (!current) return [];

  const query = `${current.title} ${current.description}`.trim();
  const bm25Results = searchPrompts(query, { limit: prompts.length, expandSynonyms: false });
  const bm25ScoreById = new Map(bm25Results.map((result) => [result.prompt.id, result.score]));
  // Filter out undefined/NaN scores to prevent NaN propagation
  const validScores = bm25Results.map((result) => result.score).filter((s) => Number.isFinite(s));
  const maxBm25 = validScores.length > 0 ? Math.max(1, ...validScores) : 1;

  const scored = prompts
    .filter((prompt) => prompt.id !== promptId)
    .map((prompt) => {
      const tagOverlap = prompt.tags.filter((tag) => current.tags.includes(tag)).length;
      const bm25Score = (bm25ScoreById.get(prompt.id) ?? 0) / maxBm25;
      const score = tagOverlap * 0.6 + bm25Score * 0.4;
      return { id: prompt.id, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

export function RelatedPrompts({ promptId, limit = 5 }: RelatedPromptsProps) {
  const related = useMemo(() => {
    const scored = scoreRelatedPrompts(promptId, limit);
    return scored
      .map((item) => getPrompt(item.id))
      .filter((prompt): prompt is NonNullable<typeof prompt> => Boolean(prompt));
  }, [promptId, limit]);

  if (related.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Related Prompts</h2>
        <span className="text-sm text-muted-foreground">{related.length} suggestions</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {related.map((prompt) => (
          <Link key={prompt.id} href={`/prompts/${prompt.id}`} className="group">
            <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {prompt.category}
                  </Badge>
                  {prompt.featured && (
                    <Badge className="text-xs bg-amber-500/20 text-amber-600">Featured</Badge>
                  )}
                </div>
                <CardTitle className="text-base line-clamp-2 group-hover:text-primary">
                  {prompt.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {prompt.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {prompt.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default RelatedPrompts;
