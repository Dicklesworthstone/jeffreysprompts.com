import type { Metadata } from "next";
import Link from "next/link";
import { FeatureSubmitForm } from "./FeatureSubmitForm";
import { ArrowLeft, Lightbulb, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Submit Feature Request",
  description:
    "Have an idea? Submit a feature request and let the community vote on it.",
};

export default function SubmitFeaturePage() {
  return (
    <div className="container max-w-2xl py-8 px-4">
      {/* Back link */}
      <Link
        href="/roadmap"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Roadmap
      </Link>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Lightbulb className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Submit a Feature Request</h1>
        <p className="text-muted-foreground">
          Have an idea for Jeffrey&apos;s Prompts? We&apos;d love to hear it! Share your
          suggestion and let the community vote.
        </p>
      </div>

      {/* Guidelines */}
      <Card className="p-4 mb-6 bg-muted/50">
        <h2 className="font-medium text-sm mb-2">Submission Guidelines</h2>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            Be specific and clear about what you want
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            Explain the use case - who needs this and why?
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            Check existing requests first to avoid duplicates
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            One feature per request - break down complex ideas
          </li>
        </ul>
      </Card>

      {/* Form */}
      <FeatureSubmitForm />
    </div>
  );
}
