"use client";

import { useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { prompts, getPrompt } from "@jeffreysprompts/core/prompts/registry";
import { searchPrompts } from "@jeffreysprompts/core/search/engine";
import { PromptCard } from "./PromptCard";
import type { Prompt } from "@jeffreysprompts/core/prompts/types";

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
  const validScores = bm25Results.map((result) => result.score).filter((s) => Number.isFinite(s));
  const maxBm25 = validScores.length > 0 ? Math.max(1, ...validScores) : 1;

  const currentTagSet = new Set(current.tags);

  const scored = prompts
    .filter((prompt) => prompt.id !== promptId)
    .map((prompt) => {
      const tagOverlap = prompt.tags.filter((tag) => currentTagSet.has(tag)).length;
      const bm25Score = (bm25ScoreById.get(prompt.id) ?? 0) / maxBm25;
      const score = tagOverlap * 0.6 + bm25Score * 0.4;
      return { id: prompt.id, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

export function RelatedPrompts({ promptId, limit = 4 }: RelatedPromptsProps) {
  const prefersReducedMotion = useReducedMotion();
  
  const related = useMemo(() => {
    const scored = scoreRelatedPrompts(promptId, limit);
    return scored
      .map((item) => getPrompt(item.id))
      .filter((prompt): prompt is Prompt => Boolean(prompt));
  }, [promptId, limit]);

  if (related.length === 0) return null;

  return (
    <section className="mt-16 lg:mt-24">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Related Prompts</h2>
          <p className="text-sm font-medium text-neutral-500">You might also find these useful</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          {related.length} Recommendations
        </span>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {related.map((prompt, index) => (
            <motion.div
              key={prompt.id}
              layout={!prefersReducedMotion}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.5,
                delay: prefersReducedMotion ? 0 : index * 0.1,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <PromptCard 
                prompt={prompt} 
                index={index}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

export default RelatedPrompts;
