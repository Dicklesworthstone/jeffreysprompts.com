"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Scale,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ClientDate } from "@/components/ClientDate";
import { useToast } from "@/components/ui/toast";
import type { AppealStatus } from "@/lib/moderation/appeal-store";

interface Appeal {
  id: string;
  actionId: string;
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  explanation: string;
  status: AppealStatus;
  submittedAt: string;
  deadlineAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  adminResponse?: string | null;
  isOverdue?: boolean;
  action?: {
    id: string;
    actionType: string;
    actionTypeLabel: string;
    reason: string;
    reasonLabel: string;
    details?: string | null;
    createdAt: string;
    userId: string;
  } | null;
}

interface AppealsResponse {
  appeals: Appeal[];
  stats: {
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    denied: number;
    overdue: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const EMPTY_STATS = {
  total: 0,
  pending: 0,
  underReview: 0,
  approved: 0,
  denied: 0,
  overdue: 0,
};

function formatAge(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  const ms = Date.now() - date.getTime();
  if (ms < 60000) return "just now";
  if (ms < 3600000) return `${Math.floor(ms / 60000)} min ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours ago`;
  return `${Math.floor(ms / 86400000)} days ago`;
}

function formatDeadline(iso: string): string {
  const deadline = new Date(iso).getTime();
  const now = Date.now();
  if (Number.isNaN(deadline)) return "unknown";

  const diff = deadline - now;
  if (diff < 0) return "overdue";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  return "< 1h remaining";
}

function formatAuthError(code?: string): string {
  switch (code) {
    case "admin_token_not_configured":
      return "Admin token not configured. Set JFP_ADMIN_TOKEN or enable JFP_ADMIN_DEV_BYPASS for local dev.";
    case "unauthorized":
      return "Unauthorized. Provide a valid admin token in the request headers.";
    case "forbidden":
      return "Access denied. Your admin role lacks permission.";
    default:
      return "Unable to load appeals.";
  }
}

const statusConfig: Record<AppealStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: {
    label: "Pending",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    icon: Clock,
  },
  under_review: {
    label: "Under Review",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    icon: CheckCircle,
  },
  denied: {
    label: "Denied",
    color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    icon: XCircle,
  },
};

export default function AdminAppealsPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "pending" as AppealStatus | "all",
    sort: "deadline",
  });

  // Review form state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewResponse, setReviewResponse] = useState("");
  const [reverseAction, setReverseAction] = useState(false);

  const loadAppeals = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({
        status: filters.status,
        sort: filters.sort,
      });
      const response = await fetch(`/api/admin/appeals?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as AppealsResponse & { error?: string } | null;

      if (!response.ok) {
        setAppeals([]);
        setStats(EMPTY_STATS);
        setLoadError(formatAuthError(payload?.error));
        return;
      }

      setAppeals(payload?.appeals ?? []);
      setStats(payload?.stats ?? EMPTY_STATS);
    } catch {
      setAppeals([]);
      setStats(EMPTY_STATS);
      setLoadError("Unable to load appeals.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAppeals();
  }, [loadAppeals]);

  const handleStatusUpdate = useCallback(
    async (appealId: string, status: "under_review" | "approved" | "denied", response?: string, shouldReverseAction?: boolean) => {
      setActioningId(appealId);
      try {
        const res = await fetch(`/api/admin/appeals/${appealId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            adminResponse: response,
            reverseAction: shouldReverseAction,
          }),
        });
        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          toastError("Action failed", payload?.error ?? "Unable to update appeal.");
          return;
        }

        toastSuccess(
          "Appeal updated",
          status === "under_review"
            ? "Appeal marked as under review"
            : `Appeal ${status}${shouldReverseAction ? " (action reversed)" : ""}`
        );
        setReviewingId(null);
        setReviewResponse("");
        setReverseAction(false);
        await loadAppeals();
      } catch {
        toastError("Action failed", "Unable to update appeal.");
      } finally {
        setActioningId(null);
      }
    },
    [loadAppeals, toastError, toastSuccess]
  );

  const openReview = (appealId: string, action: "approved" | "denied") => {
    setReviewingId(appealId);
    setReviewResponse("");
    setReverseAction(action === "approved");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
          Moderation Appeals
        </h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Review and respond to user appeals for moderation decisions
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <AppealStatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          variant="warning"
        />
        <AppealStatCard
          label="Under Review"
          value={stats.underReview}
          icon={Eye}
          variant="info"
        />
        <AppealStatCard
          label="Approved"
          value={stats.approved}
          icon={CheckCircle}
          variant="success"
        />
        <AppealStatCard
          label="Denied"
          value={stats.denied}
          icon={XCircle}
          variant="danger"
        />
        <AppealStatCard
          label="Overdue"
          value={stats.overdue}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Filter:
              </span>
              <select
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                value={filters.status}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, status: event.target.value as AppealStatus | "all" }))
                }
              >
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
                <option value="all">All</option>
              </select>
              <select
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                value={filters.sort}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, sort: event.target.value }))
                }
              >
                <option value="deadline">By Deadline</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              {stats.overdue > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                >
                  {stats.overdue} overdue
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
              >
                {stats.pending} pending
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={loadAppeals}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadError && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {loadError}
            </p>
            <div>
              <Button size="sm" onClick={loadAppeals}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appeals queue */}
      <div className="space-y-4">
        {appeals.map((appeal) => (
          <AppealCard
            key={appeal.id}
            appeal={appeal}
            expanded={expandedId === appeal.id}
            onToggleExpand={() => setExpandedId(expandedId === appeal.id ? null : appeal.id)}
            onMarkUnderReview={() => handleStatusUpdate(appeal.id, "under_review")}
            onOpenReview={openReview}
            busy={loading || actioningId === appeal.id}
            isReviewing={reviewingId === appeal.id}
            reviewResponse={reviewResponse}
            setReviewResponse={setReviewResponse}
            reverseAction={reverseAction}
            setReverseAction={setReverseAction}
            onSubmitReview={(status) => handleStatusUpdate(appeal.id, status, reviewResponse, status === "approved" && reverseAction)}
            onCancelReview={() => {
              setReviewingId(null);
              setReviewResponse("");
              setReverseAction(false);
            }}
          />
        ))}
      </div>

      {/* Empty state */}
      {!loading && appeals.length === 0 && !loadError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scale className="h-12 w-12 text-emerald-500" />
            <h3 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">
              No appeals to review
            </h3>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              All appeals have been processed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AppealStatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "warning" | "success" | "danger" | "info";
}) {
  const colors = {
    default: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    danger: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    info: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg p-2 ${colors[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {value}
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AppealCard({
  appeal,
  expanded,
  onToggleExpand,
  onMarkUnderReview,
  onOpenReview,
  busy,
  isReviewing,
  reviewResponse,
  setReviewResponse,
  reverseAction,
  setReverseAction,
  onSubmitReview,
  onCancelReview,
}: {
  appeal: Appeal;
  expanded: boolean;
  onToggleExpand: () => void;
  onMarkUnderReview: () => void;
  onOpenReview: (appealId: string, action: "approved" | "denied") => void;
  busy: boolean;
  isReviewing: boolean;
  reviewResponse: string;
  setReviewResponse: (value: string) => void;
  reverseAction: boolean;
  setReverseAction: (value: boolean) => void;
  onSubmitReview: (status: "approved" | "denied") => void;
  onCancelReview: () => void;
}) {
  const config = statusConfig[appeal.status];
  const StatusIcon = config.icon;
  const isPendingOrReview = appeal.status === "pending" || appeal.status === "under_review";

  return (
    <Card className={`${appeal.isOverdue ? "border-red-200 dark:border-red-500/30" : isPendingOrReview ? "border-amber-200 dark:border-amber-500/30" : ""}`}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                  <Scale className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      Appeal from {appeal.userName ?? appeal.userEmail ?? "User"}
                    </h3>
                    <Badge className={config.color}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                    {appeal.isOverdue && (
                      <Badge variant="destructive">
                        <AlertTriangle className="mr-1 h-3 w-3" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {appeal.userEmail}
                  </p>
                </div>
              </div>

              <div className="ml-11 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {appeal.action && (
                    <>
                      <Badge variant="outline">
                        {appeal.action.actionTypeLabel}
                      </Badge>
                      <Badge variant="secondary">
                        {appeal.action.reasonLabel}
                      </Badge>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                  <span>Submitted: {formatAge(appeal.submittedAt)}</span>
                  {isPendingOrReview && (
                    <span className={appeal.isOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                      Deadline: {formatDeadline(appeal.deadlineAt)}
                    </span>
                  )}
                  {appeal.reviewedAt && (
                    <span>Reviewed: {formatAge(appeal.reviewedAt)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleExpand}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Details
                  </>
                )}
              </Button>
              {appeal.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                  onClick={onMarkUnderReview}
                  disabled={busy}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Mark Reviewing
                </Button>
              )}
              {isPendingOrReview && !isReviewing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    onClick={() => onOpenReview(appeal.id, "approved")}
                    disabled={busy}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => onOpenReview(appeal.id, "denied")}
                    disabled={busy}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Deny
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Expanded content */}
          {expanded && (
            <div className="ml-11 mt-4 space-y-4 border-t pt-4">
              {/* User explanation */}
              <div>
                <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  User Explanation
                </h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                  {appeal.explanation}
                </p>
              </div>

              {/* Original action details */}
              {appeal.action && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    Original Action
                  </h4>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 bg-muted/50 rounded-lg p-3 space-y-1">
                    <p><span className="font-medium">Type:</span> {appeal.action.actionTypeLabel}</p>
                    <p><span className="font-medium">Reason:</span> {appeal.action.reasonLabel}</p>
                    {appeal.action.details && (
                      <p><span className="font-medium">Details:</span> {appeal.action.details}</p>
                    )}
                    <p><span className="font-medium">Date:</span> <ClientDate date={appeal.action.createdAt} format="date" /></p>
                  </div>
                </div>
              )}

              {/* Admin response (if already reviewed) */}
              {appeal.adminResponse && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    Admin Response
                  </h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                    {appeal.adminResponse}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Review form */}
          {isReviewing && (
            <div className="ml-11 mt-4 space-y-4 border-t pt-4">
              <div>
                <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Your Response to the User
                </h4>
                <Textarea
                  value={reviewResponse}
                  onChange={(e) => setReviewResponse(e.target.value)}
                  placeholder="Explain your decision to the user..."
                  rows={4}
                />
              </div>

              {reverseAction && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`reverse-${appeal.id}`}
                    checked={reverseAction}
                    onChange={(e) => setReverseAction(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  <label htmlFor={`reverse-${appeal.id}`} className="text-sm text-neutral-600 dark:text-neutral-400">
                    Reverse the original moderation action (lift suspension/ban)
                  </label>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelReview}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className={reverseAction ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                  onClick={() => onSubmitReview(reverseAction ? "approved" : "denied")}
                  disabled={busy || !reviewResponse.trim()}
                >
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : reverseAction ? (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  {reverseAction ? "Approve Appeal" : "Deny Appeal"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
