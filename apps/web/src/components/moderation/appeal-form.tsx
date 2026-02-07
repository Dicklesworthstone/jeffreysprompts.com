"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { APPEAL_SUBMISSION_WINDOW_DAYS } from "@/lib/moderation/appeal-store";

interface AppealFormProps {
  actionId: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  actionType: string;
  reason: string;
  actionDate: string;
  onSuccess?: () => void;
}

const MIN_EXPLANATION_LENGTH = 50;
const MAX_EXPLANATION_LENGTH = 2000;

export function AppealForm({
  actionId,
  userId,
  userEmail,
  userName,
  actionType,
  reason,
  actionDate,
  onSuccess,
}: AppealFormProps) {
  const router = useRouter();
  const [explanation, setExplanation] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const characterCount = explanation.length;
  const isValidLength = characterCount >= MIN_EXPLANATION_LENGTH && characterCount <= MAX_EXPLANATION_LENGTH;
  const canSubmit = isValidLength && !isSubmitting;

  // Check if within appeal window
  const actionDateMs = new Date(actionDate).getTime();
  const windowMs = APPEAL_SUBMISSION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const deadlineMs = actionDateMs + windowMs;
  const now = Date.now();
  const isWithinWindow = now < deadlineMs;
  const daysRemaining = Math.max(0, Math.ceil((deadlineMs - now) / (24 * 60 * 60 * 1000)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId,
          userId,
          userEmail,
          userName,
          explanation: explanation.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit appeal");
        toast.error("Appeal Failed", data.error || "Failed to submit appeal");
        return;
      }

      toast.success("Appeal Submitted", "Your appeal has been submitted and will be reviewed.");
      onSuccess?.();
      router.push(
        `/appeals/${data.appeal.id}?appealToken=${encodeURIComponent(data.appeal.accessToken)}`
      );
    } catch {
      setError("An unexpected error occurred. Please try again.");
      toast.error("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isWithinWindow) {
    return (
      <Card className="border-amber-200 dark:border-amber-500/30">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Appeal Window Expired</h3>
          <p className="text-muted-foreground">
            The {APPEAL_SUBMISSION_WINDOW_DAYS}-day window to submit an appeal for this action has passed.
            If you have concerns, please contact our support team.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Action summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="text-sm font-medium">Appealing: {actionType}</h3>
              <p className="text-sm text-muted-foreground">
                Reason: {reason}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining to submit appeal
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explanation textarea */}
      <div className="space-y-2">
        <Textarea
          label="Your Explanation"
          placeholder="Please explain why you believe this action should be reconsidered. Be specific and provide any relevant context that may help us review your case..."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          error={error ?? undefined}
          hint={`${characterCount}/${MAX_EXPLANATION_LENGTH} characters (minimum ${MIN_EXPLANATION_LENGTH})`}
          rows={8}
          autoResize
          disabled={isSubmitting}
        />
        {characterCount > 0 && characterCount < MIN_EXPLANATION_LENGTH && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Please provide at least {MIN_EXPLANATION_LENGTH - characterCount} more character{MIN_EXPLANATION_LENGTH - characterCount !== 1 ? "s" : ""}.
          </p>
        )}
      </div>

      {/* Guidelines */}
      <div className="bg-muted/30 rounded-lg p-4 text-sm">
        <h4 className="font-medium mb-2">Guidelines for your appeal:</h4>
        <ul className="space-y-1 text-muted-foreground">
          <li>• Be honest and respectful in your explanation</li>
          <li>• Provide specific details about why you believe the action was incorrect</li>
          <li>• Include any relevant context we may have missed</li>
          <li>• Appeals are reviewed within 14 days</li>
          <li>• You can only submit one appeal per action</li>
        </ul>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        disabled={!canSubmit}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Submitting Appeal...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Submit Appeal
          </>
        )}
      </Button>
    </form>
  );
}
