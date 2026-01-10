"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowRight,
  Download,
  Copy,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { prompts, getPrompt } from "@jeffreysprompts/core/prompts";
import type { Prompt } from "@jeffreysprompts/core/prompts";
import type { Workflow } from "@jeffreysprompts/core/prompts";

interface WorkflowBuilderProps {
  className?: string;
  onExport?: (workflow: Workflow) => void;
}

interface DraftStep {
  id: string;
  promptId: string;
  note: string;
}

interface DraftWorkflow {
  title: string;
  description: string;
  steps: DraftStep[];
}

const STORAGE_KEY = "jfp-workflow-draft";

const emptyDraft: DraftWorkflow = {
  title: "",
  description: "",
  steps: [],
};

/**
 * WorkflowBuilder - Create multi-step prompt workflows.
 *
 * Features:
 * - Search and add prompts as steps
 * - Drag to reorder steps
 * - Add handoff notes between steps
 * - Export as markdown
 * - Auto-saves to localStorage
 */
export function WorkflowBuilder({ className, onExport }: WorkflowBuilderProps) {
  const [draft, setDraft, clearDraft] = useLocalStorage<DraftWorkflow>(
    STORAGE_KEY,
    emptyDraft,
    { debounceMs: 500 }
  );

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter prompts by search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return prompts
      .filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [searchQuery]);

  // Add a step
  const addStep = useCallback(
    (prompt: Prompt) => {
      const newStep: DraftStep = {
        id: `step-${Date.now()}`,
        promptId: prompt.id,
        note: "",
      };
      setDraft((prev) => ({
        ...prev,
        steps: [...prev.steps, newStep],
      }));
      setShowSearch(false);
      setSearchQuery("");
    },
    [setDraft]
  );

  // Remove a step
  const removeStep = useCallback(
    (stepId: string) => {
      setDraft((prev) => ({
        ...prev,
        steps: prev.steps.filter((s) => s.id !== stepId),
      }));
    },
    [setDraft]
  );

  // Update step note
  const updateStepNote = useCallback(
    (stepId: string, note: string) => {
      setDraft((prev) => ({
        ...prev,
        steps: prev.steps.map((s) => (s.id === stepId ? { ...s, note } : s)),
      }));
    },
    [setDraft]
  );

  // Reorder steps
  const reorderSteps = useCallback(
    (newOrder: DraftStep[]) => {
      setDraft((prev) => ({
        ...prev,
        steps: newOrder,
      }));
    },
    [setDraft]
  );

  // Export workflow
  const handleExport = useCallback(() => {
    if (draft.steps.length === 0) return;

    const workflow: Workflow = {
      id: `workflow-${Date.now()}`,
      title: draft.title || "Untitled Workflow",
      description: draft.description || "Custom workflow",
      steps: draft.steps.map((s) => ({
        id: s.id,
        promptId: s.promptId,
        note: s.note || "Continue with this step",
      })),
      whenToUse: [],
    };

    onExport?.(workflow);

    // Generate markdown for clipboard
    const markdown = generateWorkflowMarkdown(workflow);
    navigator.clipboard.writeText(markdown);
  }, [draft, onExport]);

  // Clear and start fresh
  const handleClear = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-4">
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Workflow title..."
          className={cn(
            "w-full text-2xl font-bold bg-transparent",
            "border-b border-transparent focus:border-zinc-300 dark:focus:border-zinc-600",
            "outline-none transition-colors pb-1",
            "placeholder:text-zinc-400"
          )}
        />
        <textarea
          value={draft.description}
          onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Describe what this workflow accomplishes..."
          rows={2}
          className={cn(
            "w-full text-sm bg-transparent resize-none",
            "border-b border-transparent focus:border-zinc-300 dark:focus:border-zinc-600",
            "outline-none transition-colors pb-1",
            "placeholder:text-zinc-400"
          )}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Steps ({draft.steps.length})
          </h3>
          {draft.steps.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {draft.steps.length === 0 ? (
          <div className="text-center py-8 text-zinc-400">
            <p>No steps yet. Add prompts to build your workflow.</p>
          </div>
        ) : (
          <Reorder.Group
            values={draft.steps}
            onReorder={reorderSteps}
            className="space-y-3"
          >
            {draft.steps.map((step, index) => (
              <StepCard
                key={step.id}
                step={step}
                index={index}
                isLast={index === draft.steps.length - 1}
                onRemove={() => removeStep(step.id)}
                onUpdateNote={(note) => updateStepNote(step.id, note)}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* Add Step Button / Search */}
      <AnimatePresence mode="wait">
        {showSearch ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                autoFocus
                className={cn(
                  "w-full pl-10 pr-10 py-3 rounded-xl",
                  "border border-zinc-200 dark:border-zinc-700",
                  "bg-white dark:bg-zinc-800",
                  "focus:outline-none focus:ring-2 focus:ring-violet-500"
                )}
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-xl overflow-hidden divide-y dark:divide-zinc-700">
                {searchResults.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => addStep(prompt)}
                    className={cn(
                      "w-full text-left p-3",
                      "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                      "transition-colors"
                    )}
                  >
                    <div className="font-medium text-sm">{prompt.title}</div>
                    <div className="text-xs text-zinc-500 line-clamp-1">
                      {prompt.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="add-button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Button
              variant="outline"
              onClick={() => setShowSearch(true)}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Actions */}
      {draft.steps.length > 0 && (
        <div className="flex gap-2">
          <Button onClick={handleExport} className="flex-1">
            <Copy className="w-4 h-4 mr-2" />
            Copy as Markdown
          </Button>
        </div>
      )}
    </div>
  );
}

interface StepCardProps {
  step: DraftStep;
  index: number;
  isLast: boolean;
  onRemove: () => void;
  onUpdateNote: (note: string) => void;
}

function StepCard({ step, index, isLast, onRemove, onUpdateNote }: StepCardProps) {
  const [noteExpanded, setNoteExpanded] = useState(false);
  const prompt = getPrompt(step.promptId);

  if (!prompt) {
    return null;
  }

  return (
    <Reorder.Item
      value={step}
      className="relative"
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "p-4 rounded-xl border",
          "bg-white dark:bg-zinc-900",
          "border-zinc-200 dark:border-zinc-700",
          "shadow-sm"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <div className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600">
            <GripVertical className="w-5 h-5" />
          </div>

          {/* Step number */}
          <div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {index + 1}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {prompt.title}
                </h4>
                <Badge variant="secondary" className="mt-1">
                  {prompt.category}
                </Badge>
              </div>
              <button
                onClick={onRemove}
                className="text-zinc-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Handoff note */}
            <button
              onClick={() => setNoteExpanded(!noteExpanded)}
              className="mt-3 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
            >
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform",
                  noteExpanded && "rotate-180"
                )}
              />
              Handoff note
            </button>

            <AnimatePresence>
              {noteExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <textarea
                    value={step.note}
                    onChange={(e) => onUpdateNote(e.target.value)}
                    placeholder="Instructions for transitioning to the next step..."
                    rows={2}
                    className={cn(
                      "w-full mt-2 p-2 text-sm rounded-lg resize-none",
                      "border border-zinc-200 dark:border-zinc-700",
                      "bg-zinc-50 dark:bg-zinc-800",
                      "focus:outline-none focus:ring-2 focus:ring-violet-500"
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Arrow to next step */}
      {!isLast && (
        <div className="flex justify-center py-2">
          <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 rotate-90" />
        </div>
      )}
    </Reorder.Item>
  );
}

/**
 * Generate markdown representation of a workflow
 */
function generateWorkflowMarkdown(workflow: Workflow): string {
  const lines: string[] = [
    `# ${workflow.title}`,
    "",
    workflow.description,
    "",
    "## Steps",
    "",
  ];

  workflow.steps.forEach((step, index) => {
    const prompt = getPrompt(step.promptId);
    const title = prompt?.title ?? step.promptId;

    lines.push(`### Step ${index + 1}: ${title}`);
    lines.push("");
    lines.push(`**Prompt ID:** \`${step.promptId}\``);
    if (step.note) {
      lines.push(`**Handoff:** ${step.note}`);
    }
    lines.push("");

    if (prompt) {
      lines.push("```");
      lines.push(prompt.content);
      lines.push("```");
      lines.push("");
    }
  });

  lines.push("---");
  lines.push("*Generated by JeffreysPrompts Workflow Builder*");

  return lines.join("\n");
}
