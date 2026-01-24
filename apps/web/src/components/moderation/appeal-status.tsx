"use client";

import * as React from "react";
import { Clock, CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AppealStatusProps {
  appeal: {
    id: string;
    status: "pending" | "under_review" | "approved" | "denied";
    explanation: string;
    submittedAt: string;
    deadlineAt: string;
    reviewedAt?: string | null;
    adminResponse?: string | null;
  };
  action?: {
    actionType: string;
    reason: string;
    details?: string | null;
    createdAt: string;
  } | null;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Pending Review",
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    badgeVariant: "default" as const,
  },
  under_review: {
    icon: Eye,
    label: "Under Review",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    badgeVariant: "secondary" as const,
  },
  approved: {
    icon: CheckCircle,
    label: "Approved",
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    badgeVariant: "default" as const,
  },
  denied: {
    icon: XCircle,
    label: "Denied",
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-500/10",
    badgeVariant: "destructive" as const,
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimeRemaining(deadlineAt: string): string {
  const deadline = new Date(deadlineAt).getTime();
  const now = Date.now();

  if (now >= deadline) return "Overdue";

  const remainingMs = deadline - now;
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return `${days} day${days !== 1 ? "s" : ""} remaining`;
  }
  return `${hours} hour${hours !== 1 ? "s" : ""} remaining`;
}

export function AppealStatus({ appeal, action }: AppealStatusProps) {
  const config = statusConfig[appeal.status];
  const Icon = config.icon;
  const isPending = appeal.status === "pending" || appeal.status === "under_review";

  return (
    <div className="space-y-4">
      {/* Status card */}
      <Card className={cn("border-2", config.bgColor)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-full", config.bgColor)}>
              <Icon className={cn("h-8 w-8", config.color)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold">{config.label}</h2>
                <Badge variant={config.badgeVariant}>{appeal.status.replace("_", " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Submitted on {formatDate(appeal.submittedAt)}
              </p>
              {isPending && (
                <p className="text-sm text-muted-foreground">
                  Review deadline: {getTimeRemaining(appeal.deadlineAt)}
                </p>
              )}
              {appeal.reviewedAt && (
                <p className="text-sm text-muted-foreground">
                  Reviewed on {formatDate(appeal.reviewedAt)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin response (if any) */}
      {appeal.adminResponse && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Admin Response</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {appeal.adminResponse}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Original action details */}
      {action && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Original Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Type:</span>
              <span className="text-sm text-muted-foreground capitalize">
                {action.actionType.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Reason:</span>
              <span className="text-sm text-muted-foreground capitalize">
                {action.reason.replace(/_/g, " ")}
              </span>
            </div>
            {action.details && (
              <div>
                <span className="text-sm font-medium">Details:</span>
                <p className="text-sm text-muted-foreground mt-1">{action.details}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Date:</span>
              <span className="text-sm text-muted-foreground">
                {formatDate(action.createdAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your explanation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Explanation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {appeal.explanation}
          </p>
        </CardContent>
      </Card>

      {/* Next steps */}
      {isPending && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <h3 className="text-sm font-medium">What happens next?</h3>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Your appeal is in the queue for review</li>
                  <li>• A moderator will review your case within 14 days</li>
                  <li>• You will be notified of the decision via email</li>
                  <li>• If approved, your account restrictions may be lifted</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
