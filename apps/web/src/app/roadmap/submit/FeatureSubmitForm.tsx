"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";

interface FormState {
  title: string;
  description: string;
  useCase: string;
}

export function FeatureSubmitForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    useCase: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          useCase: form.useCase || undefined,
          // In a real app, we'd get userId from auth
          userId: `anon-${Date.now()}`,
          userName: "Anonymous",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit feature request");
      }

      setIsSuccess(true);

      // Redirect to the new feature page after a short delay
      setTimeout(() => {
        router.push(`/roadmap/${data.feature.id}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (isSuccess) {
    return (
      <Card className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-4">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Feature Submitted!</h2>
        <p className="text-muted-foreground">
          Thanks for your suggestion. Redirecting to your feature request...
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Feature Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g., Add prompt version history"
            value={form.title}
            onChange={(e) => updateField("title", e.target.value)}
            maxLength={100}
            required
          />
          <p className="text-xs text-muted-foreground">
            {form.title.length}/100 characters
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">
            Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder="Describe the feature in detail. What problem does it solve? How should it work?"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={5}
            maxLength={2000}
            required
          />
          <p className="text-xs text-muted-foreground">
            {form.description.length}/2000 characters (minimum 20)
          </p>
        </div>

        {/* Use Case */}
        <div className="space-y-2">
          <Label htmlFor="useCase">Use Case (Optional)</Label>
          <Textarea
            id="useCase"
            placeholder="Who would use this feature? What's a typical scenario where this would be helpful?"
            value={form.useCase}
            onChange={(e) => updateField("useCase", e.target.value)}
            rows={3}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground">
            Explain who benefits and how they&apos;d use this feature
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              form.title.length < 5 ||
              form.description.length < 20
            }
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feature Request"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
