"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, FileText } from "lucide-react";
import { WorkflowBuilder } from "@/components/workflow-builder";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import { trackHistoryView } from "@/lib/history/client";
import { workflows, type Workflow } from "@jeffreysprompts/core/prompts/workflows";
import { getPrompt } from "@jeffreysprompts/core/prompts/registry";
import { generateWorkflowMarkdown } from "@jeffreysprompts/core/export/markdown";

export default function WorkflowsPage() {
  const [activeTab, setActiveTab] = useState<"builder" | "library">("builder");

  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            Multi-Step Workflows
          </div>
          <h1 className="text-4xl font-bold mb-4">Workflow Builder</h1>
          <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Chain prompts together into powerful workflows. Add steps, customize handoff notes,
            and export as markdown for use with any AI assistant.
          </p>
        </motion.div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-1">
            <button
              onClick={() => setActiveTab("builder")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "builder"
                  ? "bg-violet-500 text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              )}
            >
              Build New
            </button>
            <button
              onClick={() => setActiveTab("library")}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "library"
                  ? "bg-violet-500 text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              )}
            >
              Curated ({workflows.length})
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "builder" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <WorkflowBuilder />
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            {workflows.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                No curated workflows yet. Check back soon!
              </div>
            ) : (
              workflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}

interface WorkflowCardProps {
  workflow: Workflow;
}

function WorkflowCard({ workflow }: WorkflowCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (!expanded) return;
    trackHistoryView({ resourceType: "workflow", resourceId: workflow.id, source: "workflow_expand" });
  }, [expanded, workflow.id]);

  const handleCopy = async () => {
    const markdown = generateWorkflowMarkdown(workflow);
    const result = await copyToClipboard(markdown);
    if (result.success) {
      success("Copied workflow", `${workflow.steps.length} steps copied`);
      trackHistoryView({ resourceType: "workflow", resourceId: workflow.id, source: "workflow_copy" });
      return;
    }
    error("Failed to copy", "Please try again");
  };

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{workflow.title}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {workflow.description}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary">{workflow.steps.length} steps</Badge>
              {workflow.whenToUse.length > 0 && (
                <span className="text-xs text-neutral-500">
                  {workflow.whenToUse[0]}
                </span>
              )}
            </div>
          </div>
            <ArrowRight
              className={cn(
                "w-5 h-5 text-neutral-400 transition-transform",
                expanded && "rotate-90"
              )}
            />
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t dark:border-neutral-700"
        >
          <div className="p-6 space-y-4">
            {workflow.steps.map((step, index) => {
              const prompt = getPrompt(step.promptId);
              return (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {prompt?.title ?? step.promptId}
                    </div>
                    <div className="text-sm text-neutral-500 mt-0.5">
                      {step.note}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCopy} size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Copy as Markdown
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </Card>
  );
}
