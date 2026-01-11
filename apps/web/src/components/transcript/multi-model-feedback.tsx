"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  Zap,
  GitBranch,
  Layers,
  Shield,
  Search,
  Smartphone,
  Activity,
  FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { workflowPosts } from "@/data/annotations";

interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  source: "gpt" | "gemini";
  implemented: boolean;
  icon: typeof CheckCircle2;
  category: "architecture" | "feature" | "reliability" | "performance";
}

const feedbackItems: FeedbackItem[] = [
  {
    id: "packages-core",
    title: "Shared packages/core Package",
    description:
      "Decouple CLI from web app with shared core package for types, registry, and search",
    source: "gpt",
    implemented: true,
    icon: Layers,
    category: "architecture",
  },
  {
    id: "bm25-search",
    title: "BM25 Search Engine",
    description:
      "Replace hash embeddings with proper BM25 ranking algorithm for better relevance",
    source: "gpt",
    implemented: true,
    icon: Search,
    category: "performance",
  },
  {
    id: "cac-parser",
    title: "CAC CLI Parser",
    description:
      "Replace ad-hoc flag parsing with cac for robust parsing, help generation, and completions",
    source: "gpt",
    implemented: true,
    icon: FileJson,
    category: "reliability",
  },
  {
    id: "skill-manifest",
    title: "Skill Manifest System",
    description:
      "Track installed skills with SHA256 hashes to detect user modifications before updates",
    source: "gpt",
    implemented: true,
    icon: Shield,
    category: "reliability",
  },
  {
    id: "yaml-safe",
    title: "YAML-Safe Frontmatter",
    description:
      "Use JSON.stringify for YAML values and add x_jfp_generated marker for safe updates",
    source: "gpt",
    implemented: true,
    icon: GitBranch,
    category: "reliability",
  },
  {
    id: "health-endpoints",
    title: "Health Check Endpoints",
    description:
      "Add /api/health for monitoring, load balancers, and CI/CD health gates",
    source: "gpt",
    implemented: true,
    icon: Activity,
    category: "reliability",
  },
  {
    id: "prompt-variables",
    title: "Prompt Templating System",
    description:
      "Support {{VARIABLE}} placeholders with --fill flag for CLI variable substitution",
    source: "gpt",
    implemented: true,
    icon: Sparkles,
    category: "feature",
  },
  {
    id: "changelog",
    title: "Prompt Changelog/Versioning",
    description:
      "Track changes to prompts with version history and change types",
    source: "gpt",
    implemented: true,
    icon: GitBranch,
    category: "feature",
  },
  {
    id: "live-registry",
    title: "Stale-While-Revalidate Registry",
    description:
      "CLI phones home for updated prompts without blocking startup",
    source: "gemini",
    implemented: true,
    icon: Zap,
    category: "architecture",
  },
  {
    id: "pwa",
    title: "Progressive Web App",
    description: "Service worker for offline access and installability",
    source: "gpt",
    implemented: false,
    icon: Smartphone,
    category: "feature",
  },
  {
    id: "workflow-builder",
    title: "Workflow Builder UI",
    description: "Drag-and-drop interface for chaining prompts into workflows",
    source: "gpt",
    implemented: false,
    icon: Layers,
    category: "feature",
  },
];

interface PlanningRevisionItem {
  id: string;
  label: string;
  implemented: boolean;
  category: "architecture" | "quality" | "feature";
  stepId: string;
}

interface GptProSessionItem {
  id: string;
  label: string;
  implemented: boolean;
  stepId: string;
}

const planningChanges: PlanningRevisionItem[] = [
  {
    id: "packages-core",
    label: "Introduce shared core package for registry + search",
    implemented: true,
    category: "architecture",
    stepId: "section-1",
  },
  {
    id: "bm25-search",
    label: "Replace embeddings with BM25 relevance scoring",
    implemented: true,
    category: "architecture",
    stepId: "section-2",
  },
  {
    id: "cac-parser",
    label: "Adopt CAC for CLI parsing + help output",
    implemented: true,
    category: "architecture",
    stepId: "section-4",
  },
  {
    id: "prompt-variables",
    label: "Ship prompt templating + variable fill flow",
    implemented: true,
    category: "feature",
    stepId: "section-4",
  },
];

const planningRevisions: PlanningRevisionItem[] = [
  {
    id: "skill-manifest",
    label: "Hash-based skill manifest to prevent overwrites",
    implemented: true,
    category: "quality",
    stepId: "section-4",
  },
  {
    id: "yaml-safe",
    label: "YAML-safe frontmatter + generator markers",
    implemented: true,
    category: "quality",
    stepId: "section-6",
  },
  {
    id: "health-endpoints",
    label: "Health endpoints for monitoring and CI checks",
    implemented: true,
    category: "quality",
    stepId: "section-6",
  },
  {
    id: "pwa",
    label: "PWA + offline mode as future work",
    implemented: false,
    category: "feature",
    stepId: "section-5",
  },
];

const gptProSessionInputs: GptProSessionItem[] = [
  {
    id: "gpt-pro-plan-pass",
    label: "Paste the full markdown plan into GPT Pro for critique",
    implemented: true,
    stepId: "section-0",
  },
  {
    id: "gpt-pro-merge",
    label: "Merge competing model plans into a single revision pass",
    implemented: true,
    stepId: "section-0",
  },
  {
    id: "gpt-pro-constraints",
    label: "Codify execution constraints in AGENTS.md",
    implemented: true,
    stepId: "section-0",
  },
  {
    id: "gpt-pro-coordination",
    label: "Lock in beads + bv + Agent Mail as the coordination stack",
    implemented: true,
    stepId: "section-4",
  },
];

const gptProSessionOutputs: GptProSessionItem[] = [
  {
    id: "gpt-pro-core",
    label: "Split shared logic into packages/core for registry + search",
    implemented: true,
    stepId: "section-1",
  },
  {
    id: "gpt-pro-bm25",
    label: "Deterministic BM25 ranking with weighted fields",
    implemented: true,
    stepId: "section-2",
  },
  {
    id: "gpt-pro-cli",
    label: "Agent-first CLI defaults (JSON when piped, quick-start UX)",
    implemented: true,
    stepId: "section-4",
  },
  {
    id: "gpt-pro-quality",
    label: "Quality gates + doc revision pass before shipping",
    implemented: true,
    stepId: "section-6",
  },
];

const categoryColors = {
  architecture: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  feature: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  reliability: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  performance: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
};

const workflowToneStyles = {
  planning:
    "border-amber-200/70 bg-amber-50/70 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100",
  coordination:
    "border-cyan-200/70 bg-cyan-50/70 text-cyan-900 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100",
  prompting:
    "border-violet-200/70 bg-violet-50/70 text-violet-900 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-100",
  ux: "border-rose-200/70 bg-rose-50/70 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-100",
};

const workflowToneBadges = {
  planning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  coordination:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200",
  prompting:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
  ux: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

function FeedbackCard({
  item,
  index,
}: {
  item: FeedbackItem;
  index: number;
}) {
  const Icon = item.icon;

  return (
    <motion.div
      id={`feedback-${item.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className={cn(
        "relative p-4 rounded-xl border transition-all",
        "bg-white dark:bg-zinc-900",
        item.implemented
          ? "border-emerald-200 dark:border-emerald-800/50"
          : "border-zinc-200 dark:border-zinc-800"
      )}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        {item.implemented ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
        )}
      </div>

      {/* Icon and title */}
      <div className="flex items-start gap-3 mb-2 pr-8">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            categoryColors[item.category]
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
            {item.title}
          </h4>
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              item.source === "gpt"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
            )}
          >
            {item.source === "gpt" ? "GPT Pro" : "Gemini"}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-600 dark:text-zinc-400 ml-11">
        {item.description}
      </p>
    </motion.div>
  );
}

export function MultiModelFeedback() {
  const implemented = feedbackItems.filter((item) => item.implemented).length;
  const total = feedbackItems.length;
  const revisionsImplemented = [...planningChanges, ...planningRevisions].filter(
    (item) => item.implemented
  ).length;
  const revisionsTotal = planningChanges.length + planningRevisions.length;
  const gptProImplemented = [...gptProSessionInputs, ...gptProSessionOutputs].filter(
    (item) => item.implemented
  ).length;
  const gptProTotal = gptProSessionInputs.length + gptProSessionOutputs.length;

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-blue-100 dark:from-emerald-900/30 dark:to-blue-900/30 text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-zinc-700 dark:text-zinc-300">
            Multi-Model Feedback Loop
          </span>
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Refined by Multiple AI Models
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          After Claude created the initial plan, it was reviewed by GPT Pro and
          Gemini for architectural improvements, bug fixes, and feature ideas.
        </p>
      </div>

      {/* Process flow */}
      <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <MessageSquare className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
            Claude Plan
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-400" />
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30">
          <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            GPT Review
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-400" />
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Gemini Review
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-zinc-400" />
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <Zap className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
            Claude Build
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {implemented}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Implemented
          </div>
        </div>
        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700" />
        <div className="text-center">
          <div className="text-3xl font-bold text-zinc-400">
            {total - implemented}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Future Work
          </div>
        </div>
        <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700" />
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {Math.round((implemented / total) * 100)}%
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Adoption Rate
          </div>
        </div>
      </div>

      {/* Feedback grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {feedbackItems.map((item, index) => (
          <FeedbackCard key={item.id} item={item} index={index} />
        ))}
      </div>

      {/* GPT Pro planning + revisions */}
      <div
        id="planning-revisions"
        className="mt-10 rounded-2xl border border-violet-200/50 bg-white/80 p-6 shadow-lg shadow-violet-500/10 backdrop-blur dark:border-violet-500/20 dark:bg-zinc-900/70"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              GPT Pro Planning + Revisions
            </div>
            <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Second-pass plan refinement (web session)
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              The initial plan was refined in GPT Pro with additional architectural safeguards
              and scope adjustments. The guide steps above link directly to the revisions below.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="text-center">
              <div className="text-2xl font-semibold text-emerald-500">
                {revisionsImplemented}
              </div>
              <div className="text-xs uppercase tracking-wide">Applied</div>
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="text-center">
              <div className="text-2xl font-semibold text-zinc-400">
                {revisionsTotal - revisionsImplemented}
              </div>
              <div className="text-xs uppercase tracking-wide">Deferred</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <GitBranch className="h-4 w-4 text-violet-500" />
              Changes captured in the plan
            </div>
            <div className="space-y-2">
              {planningChanges.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                    item.implemented
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
                  )}
                >
                  <a href={`#feedback-${item.id}`} className="flex items-center gap-2">
                    {item.implemented ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span>{item.label}</span>
                  </a>
                  <a
                    href={`#guide-${item.stepId}`}
                    className="rounded-full border border-violet-200 px-2 py-0.5 text-xs text-violet-600 dark:border-violet-500/30 dark:text-violet-300"
                  >
                    Guide step
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <Shield className="h-4 w-4 text-blue-500" />
              Revisions + quality gates
            </div>
            <div className="space-y-2">
              {planningRevisions.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                    item.implemented
                      ? "border-blue-200 bg-blue-50/70 text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-200"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
                  )}
                >
                  <a href={`#feedback-${item.id}`} className="flex items-center gap-2">
                    {item.implemented ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span>{item.label}</span>
                  </a>
                  <a
                    href={`#guide-${item.stepId}`}
                    className="rounded-full border border-violet-200 px-2 py-0.5 text-xs text-violet-600 dark:border-violet-500/30 dark:text-violet-300"
                  >
                    Guide step
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* GPT Pro planning session */}
      <div
        id="planning-revisions-gpt-pro"
        className="mt-10 rounded-2xl border border-emerald-200/50 bg-white/80 p-6 shadow-lg shadow-emerald-500/10 backdrop-blur dark:border-emerald-500/20 dark:bg-zinc-900/70"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              GPT Pro planning session
            </div>
            <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              GPT Pro plan fusion (web session)
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              This was the dedicated GPT Pro pass that merged multiple model plans,
              tightened constraints, and locked the execution rules before build-out.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="text-center">
              <div className="text-2xl font-semibold text-emerald-500">
                {gptProImplemented}
              </div>
              <div className="text-xs uppercase tracking-wide">Applied</div>
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="text-center">
              <div className="text-2xl font-semibold text-zinc-400">
                {gptProTotal - gptProImplemented}
              </div>
              <div className="text-xs uppercase tracking-wide">Deferred</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              Session inputs
            </div>
            <div className="space-y-2">
              {gptProSessionInputs.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                    item.implemented
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {item.implemented ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span>{item.label}</span>
                  </div>
                  <a
                    href={`#guide-${item.stepId}`}
                    className="rounded-full border border-emerald-200 px-2 py-0.5 text-xs text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-200"
                  >
                    Guide step
                  </a>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              <Zap className="h-4 w-4 text-violet-500" />
              Plan outputs
            </div>
            <div className="space-y-2">
              {gptProSessionOutputs.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                    item.implemented
                      ? "border-violet-200 bg-violet-50/70 text-violet-700 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-200"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {item.implemented ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span>{item.label}</span>
                  </div>
                  <a
                    href={`#guide-${item.stepId}`}
                    className="rounded-full border border-violet-200 px-2 py-0.5 text-xs text-violet-600 dark:border-violet-500/30 dark:text-violet-300"
                  >
                    Guide step
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow sources from X */}
      <div
        id="workflow-sources"
        className="mt-10 rounded-2xl border border-sky-200/50 bg-white/80 p-6 shadow-lg shadow-sky-500/10 backdrop-blur dark:border-sky-500/20 dark:bg-zinc-900/70"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
              <Sparkles className="h-3.5 w-3.5" />
              Workflow sources from X
            </div>
            <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Methodology notes tied to the guide
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              These posts capture the planning-first workflow, the coordination stack, and the
              prompting philosophy that shaped the build. Each card links back to the relevant
              guide step.
            </p>
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {workflowPosts.length} posts indexed
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflowPosts.map((post, index) => (
            <motion.a
              key={post.id}
              id={`xpost-${post.id}`}
              href={`https://x.com/doodlestein/status/${post.id}`}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: index * 0.04, duration: 0.35 }}
              className={cn(
                "group rounded-2xl border p-4 transition-shadow hover:shadow-lg",
                workflowToneStyles[post.tone]
              )}
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span
                  className={cn(
                    "rounded-full px-2 py-1 font-semibold uppercase tracking-wide",
                    workflowToneBadges[post.tone]
                  )}
                >
                  {post.tone}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {post.date}
                </span>
              </div>
              <h4 className="mt-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {post.title}
              </h4>
              <p className="mt-2 text-sm text-zinc-700/90 dark:text-zinc-300">
                {post.summary}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-200/70 bg-white/70 px-2 py-0.5 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
                {post.stepIds.map((stepId) => (
                  <a
                    key={stepId}
                    href={`#guide-${stepId}`}
                    className="rounded-full border border-sky-200 px-2 py-0.5 text-sky-700 transition hover:border-sky-300 dark:border-sky-500/30 dark:text-sky-200"
                  >
                    Guide step
                  </a>
                ))}
                <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-200">
                  View post
                  <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </motion.a>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="mt-8 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
          <strong className="text-zinc-900 dark:text-zinc-100">
            The meta-demonstration:
          </strong>{" "}
          This multi-model review process is itself a prompt engineering pattern
          — using diverse AI perspectives to catch blind spots and improve
          architectural decisions.
        </p>
      </div>
    </section>
  );
}
