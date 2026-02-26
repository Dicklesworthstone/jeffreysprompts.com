"use client";

import { useCallback, useMemo, useState } from "react";
import { Flag, ShieldAlert } from "lucide-react";
import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { useIsSmallScreen } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

type ReportContentType = "prompt" | "bundle" | "workflow" | "collection";

const REPORT_REASONS = [
  { value: "spam", label: "Spam or misleading content" },
  { value: "offensive", label: "Inappropriate or offensive" },
  { value: "copyright", label: "Copyright violation" },
  { value: "harmful", label: "Contains harmful content" },
  { value: "other", label: "Other" },
];

const MAX_DETAILS_LENGTH = 500;

export interface ReportDialogProps {
  contentType: ReportContentType;
  contentId: string;
  contentTitle?: string;
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
  triggerClassName?: string;
  showLabel?: boolean;
}

export function ReportDialog({
  contentType,
  contentId,
  contentTitle,
  triggerLabel = "Report",
  triggerVariant = "ghost",
  triggerSize = "icon-sm",
  triggerClassName,
  showLabel = false,
}: ReportDialogProps) {
  const isMobile = useIsSmallScreen();
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const remaining = useMemo(
    () => Math.max(0, MAX_DETAILS_LENGTH - details.length),
    [details.length]
  );

  const resetForm = useCallback(() => {
    setReason("");
    setDetails("");
    setFormError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!reason) {
      setFormError("Please select a reason.");
      return;
    }
    if (details.length > MAX_DETAILS_LENGTH) {
      setFormError("Details must be 500 characters or fewer.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentId,
          contentTitle,
          reason,
          details: details.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        error(payload?.error ?? "Failed to submit report.");
        return;
      }

      success("Report submitted. We'll review within 24 hours.");
      setOpen(false);
      resetForm();
    } catch {
      error("Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }, [contentType, contentId, contentTitle, details, error, reason, resetForm, success]);

  const form = (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
        Reports are reviewed by a human moderator. Abuse of the report system may lead to account
        restrictions.
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-reason">Reason</Label>
        <Select
          value={reason}
          onValueChange={(value) => {
            setReason(value);
            setFormError(null);
          }}
        >
          <SelectTrigger id="report-reason" aria-invalid={Boolean(formError)}>
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_REASONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="report-details">Details (optional)</Label>
          <span className="text-xs text-muted-foreground">
            {remaining} characters left
          </span>
        </div>
        <Textarea
          id="report-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="Add any extra context that helps us review this report."
          rows={4}
          maxLength={MAX_DETAILS_LENGTH}
        />
      </div>

      {formError && (
        <div role="alert" aria-live="assertive" className="text-sm text-destructive">
          {formError}
        </div>
      )}
    </div>
  );

  const actions = (
    <DialogFooter separated>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(false);
          resetForm();
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        loading={submitting}
        disabled={submitting}
      >
        <ShieldAlert className="h-4 w-4" />
        Submit Report
      </Button>
    </DialogFooter>
  );

  const dialogContent = (
    <>
      <DialogHeader>
        <DialogTitle>Report this content</DialogTitle>
        <DialogDescription>
          Tell me what&apos;s wrong so I can take a closer look.
        </DialogDescription>
      </DialogHeader>
      <DialogBody>{form}</DialogBody>
      {actions}
    </>
  );

  const trigger = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          className={cn(
            showLabel && "gap-2",
            !showLabel && "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400",
            triggerClassName
          )}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          aria-label="Report this content"
        >
          <Flag className="h-4 w-4" />
          {showLabel && <span>{triggerLabel}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Report this content</TooltipContent>
    </Tooltip>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <BottomSheet
          open={open}
          onClose={() => {
            setOpen(false);
            resetForm();
          }}
          title="Report this content"
        >
          {form}
          <div className="pt-4">{actions}</div>
        </BottomSheet>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm();
        setOpen(nextOpen);
      }}>
        <DialogContent size="sm">{dialogContent}</DialogContent>
      </Dialog>
    </>
  );
}
