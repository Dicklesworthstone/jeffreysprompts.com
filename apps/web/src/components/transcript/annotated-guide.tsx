"use client";

import { motion } from "framer-motion";
import { CheckCircle2, FileText, Flag, MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TranscriptSection } from "@/lib/transcript/types";
import { workflowPosts, type GuideStep } from "@/data/annotations";

interface AnnotatedGuideProps {
  sections: TranscriptSection[];
  steps: GuideStep[];
  totalMessages: number;
  duration: string;
}

const headerBadges = [
  { label: "Step-by-step build", icon: Flag },
  { label: "Annotated with outcomes", icon: Sparkles },
];

export function AnnotatedGuide({
  sections,
  steps,
  totalMessages,
  duration,
}: AnnotatedGuideProps) {
  const stepsBySection = new Map(steps.map((step) => [step.sectionId, step]));
  const workflowPostMap = new Map(workflowPosts.map((post) => [post.id, post]));

  return (
    <section id="guide" className="relative overflow-hidden py-20 sm:py-28">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/60 via-transparent to-transparent dark:from-zinc-950/30" />

      <div className="relative mx-auto max-w-6xl px-4">
        <div className="text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-violet-200/60 bg-white/80 px-4 py-2 text-xs font-semibold text-violet-600 shadow-sm backdrop-blur dark:border-violet-500/20 dark:bg-zinc-900/60 dark:text-violet-300">
            {headerBadges.map((badge) => (
              <span key={badge.label} className="inline-flex items-center gap-1.5">
                <badge.icon className="h-3.5 w-3.5" />
                {badge.label}
              </span>
            ))}
          </div>

          <h2 className="mt-5 text-3xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-4xl">
            The annotated build guide
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Each phase of the original session distilled into practical steps, outcomes, and the
            exact artifacts that landed the feature.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 shadow-sm dark:bg-zinc-900/60">
              <Flag className="h-4 w-4 text-violet-500" />
              {sections.length} phases
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 shadow-sm dark:bg-zinc-900/60">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {totalMessages} messages
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 shadow-sm dark:bg-zinc-900/60">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              {duration} total build time
            </span>
          </div>
        </div>

        <div className="mt-12 grid gap-6">
          {sections.map((section, index) => {
            const step = stepsBySection.get(section.id);
            if (!step) return null;

            return (
              <motion.div
                key={section.id}
                id={`guide-${section.id}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card className="border-violet-200/40 bg-white/90 shadow-lg shadow-violet-500/5 backdrop-blur dark:border-violet-500/15 dark:bg-zinc-900/70">
                  <CardHeader className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-lg font-semibold text-white shadow-lg shadow-violet-500/30">
                          {index + 1}
                        </div>
                        <div>
                          <CardTitle className="text-xl text-zinc-900 dark:text-zinc-100">
                            {section.title}
                          </CardTitle>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {section.summary}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="bg-zinc-100/80 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300">
                          Messages {section.startIndex + 1}–{section.endIndex + 1}
                        </Badge>
                        {section.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="border-violet-200/70 text-violet-600 dark:border-violet-500/30 dark:text-violet-300"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="grid gap-6 sm:grid-cols-[1.2fr_1fr]">
                    <div>
                      <div className="rounded-2xl border border-violet-200/40 bg-violet-50/60 p-4 text-sm text-zinc-700 shadow-sm dark:border-violet-500/20 dark:bg-zinc-950/40 dark:text-zinc-200">
                        <p className="leading-relaxed">{step.narrative}</p>
                      </div>

                      {step.excerpts && step.excerpts.length > 0 && (
                        <div className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/70 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Session snapshot (paraphrased)
                          </div>
                          <ul className="mt-3 space-y-2 text-sm text-amber-900/90 dark:text-amber-100/90">
                            {step.excerpts.map((excerpt) => (
                              <li key={excerpt} className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-amber-400/80" />
                                <span>{excerpt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {step.xRefs && step.xRefs.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-semibold uppercase tracking-wide text-zinc-400">
                            Workflow posts
                          </span>
                          {step.xRefs.map((postId) => {
                            const post = workflowPostMap.get(postId);
                            if (!post) return null;
                            return (
                              <a
                                key={postId}
                                href={`#xpost-${postId}`}
                                className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700 transition hover:border-sky-300 hover:text-sky-800 dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-200"
                              >
                                {post.title}
                              </a>
                            );
                          })}
                        </div>
                      )}

                      {((step.planPanels && step.planPanels.length > 0) || step.revisions?.length) && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="font-semibold uppercase tracking-wide text-zinc-400">
                            Planning passes
                          </span>
                          {step.planPanels?.map((panel) => (
                            <a
                              key={panel.id}
                              href={`#${panel.id}`}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200"
                            >
                              <Sparkles className="h-3 w-3" />
                              {panel.label}
                            </a>
                          ))}
                          {step.revisions?.map((revision) => (
                            <a
                              key={revision.id}
                              href={`#feedback-${revision.id}`}
                              className="rounded-full border border-violet-200 px-2.5 py-1 text-violet-600 transition hover:border-violet-300 hover:text-violet-700 dark:border-violet-500/30 dark:text-violet-300"
                            >
                              {revision.label}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Outcomes
                      </div>
                      <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {step.outcomes.map((outcome) => (
                          <li key={outcome} className="flex items-start gap-2">
                            <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400/80" />
                            <span>{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-dashed border-violet-200/60 bg-violet-50/50 p-4 dark:border-violet-500/20 dark:bg-zinc-950/30">
                      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        <FileText className="h-4 w-4 text-violet-500" />
                        Key artifacts
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {step.artifacts.map((artifact) => (
                          <span
                            key={artifact}
                            className={cn(
                              "rounded-lg bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm",
                              "dark:bg-zinc-900 dark:text-zinc-200",
                              "border border-violet-200/60 dark:border-violet-500/20",
                              "font-mono"
                            )}
                          >
                            {artifact}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
