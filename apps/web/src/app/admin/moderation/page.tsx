"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Flag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Clock,
  Filter,
  RefreshCw,
  Square,
  CheckSquare,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import type {
  ReportPriority,
  ReportPriorityLevel,
  ReportSlaStatus,
} from "@/lib/reporting/report-store";

interface ModerationReport {
  id: string;
  contentType: string;
  contentId: string;
  contentTitle?: string;
  contentAuthor?: { id?: string; email?: string; name?: string };
  reporter?: { id?: string; email?: string; name?: string };
  reason: string;
  reasonLabel?: string;
  details?: string;
  status: "pending" | "reviewed" | "actioned" | "dismissed" | string;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  action?: string | null;
  priority?: ReportPriority | null;
}

interface ReportsResponse {
  reports: ModerationReport[];
  stats: {
    pending: number;
    reviewed: number;
    actioned: number;
    dismissed: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const EMPTY_STATS = {
  pending: 0,
  reviewed: 0,
  actioned: 0,
  dismissed: 0,
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

function formatAuthError(code?: string): string {
  switch (code) {
    case "admin_token_not_configured":
      return "Admin token not configured. Set JFP_ADMIN_TOKEN or enable JFP_ADMIN_DEV_BYPASS for local dev.";
    case "unauthorized":
      return "Unauthorized. Provide a valid admin token in the request headers.";
    case "forbidden":
      return "Access denied. Your admin role lacks permission.";
    default:
      return "Unable to load reports.";
  }
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatSla(deadlineAt?: string | null, status?: ReportSlaStatus): string {
  if (!deadlineAt || !status) return "SLA unknown";
  const deadlineMs = new Date(deadlineAt).getTime();
  if (Number.isNaN(deadlineMs)) return "SLA unknown";
  const deltaMs = deadlineMs - Date.now();
  const label = formatDuration(Math.abs(deltaMs));
  if (status === "breach") return `SLA breached ${label} ago`;
  return `SLA due in ${label}`;
}

function formatPriorityLabel(level: ReportPriorityLevel): string {
  switch (level) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return "Low";
  }
}

export default function AdminModerationPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    contentType: "all",
    reason: "all",
    priority: "all",
  });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState<{
    action: "dismiss" | "warn" | "remove";
    count: number;
  } | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({
        status: filters.status,
        contentType: filters.contentType,
        reason: filters.reason,
        priority: filters.priority,
        sort: "priority",
      });
      const response = await fetch(`/api/admin/reports?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as ReportsResponse & { error?: string } | null;

      if (!response.ok) {
        setReports([]);
        setStats(EMPTY_STATS);
        setLoadError(formatAuthError(payload?.error));
        return;
      }

      setReports(payload?.reports ?? []);
      setStats(payload?.stats ?? EMPTY_STATS);
    } catch {
      setReports([]);
      setStats(EMPTY_STATS);
      setLoadError("Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Clear selection when filters change or reports reload
  useEffect(() => {
    setSelectedIds(new Set());
  }, [reports]);

  // Get pending report IDs for "select all" functionality
  const pendingReportIds = useMemo(
    () => reports.filter((r) => r.status === "pending").map((r) => r.id),
    [reports]
  );

  const allPendingSelected = pendingReportIds.length > 0 &&
    pendingReportIds.every((id) => selectedIds.has(id));

  const somePendingSelected = pendingReportIds.some((id) => selectedIds.has(id));

  const toggleSelectAll = useCallback(() => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingReportIds));
    }
  }, [allPendingSelected, pendingReportIds]);

  const toggleSelectOne = useCallback((reportId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  }, []);

  const handleBulkAction = useCallback(
    async (action: "dismiss" | "warn" | "remove") => {
      if (selectedIds.size === 0) return;

      setBulkActionLoading(true);
      setShowBulkConfirm(null);

      try {
        const response = await fetch("/api/admin/moderation/bulk-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemIds: Array.from(selectedIds),
            action,
            reason: `Bulk ${action} action`,
          }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          toastError("Bulk action failed", payload?.error ?? "Unable to process bulk action.");
          return;
        }

        const { summary } = payload;
        toastSuccess(
          "Bulk action completed",
          `${summary.succeeded} of ${summary.total} reports processed with action: ${action}`
        );

        setSelectedIds(new Set());
        await loadReports();
      } catch {
        toastError("Bulk action failed", "Unable to process bulk action.");
      } finally {
        setBulkActionLoading(false);
      }
    },
    [selectedIds, loadReports, toastError, toastSuccess]
  );

  const handleAction = useCallback(
    async (reportId: string, action: "dismiss" | "warn" | "remove" | "ban") => {
      setActioningId(reportId);
      try {
        const response = await fetch("/api/admin/reports", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId, action }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          toastError("Action failed", payload?.error ?? "Unable to update report.");
          return;
        }

        toastSuccess("Report updated", `Action: ${action}`);
        await loadReports();
      } catch {
        toastError("Action failed", "Unable to update report.");
      } finally {
        setActioningId(null);
      }
    },
    [loadReports, toastError, toastSuccess]
  );

  const viewReports = useMemo(
    () =>
      reports.map((report) => ({
        id: report.id,
        contentType: report.contentType,
        contentTitle: report.contentTitle ?? "Untitled content",
        reportedBy:
          report.reporter?.email ?? report.reporter?.name ?? "Anonymous",
        reason: report.reasonLabel ?? report.reason,
        details: report.details ?? "No additional details provided.",
        status: report.status,
        createdAt: formatAge(report.createdAt),
        contentAuthor:
          report.contentAuthor?.name ?? report.contentAuthor?.email ?? "Unknown author",
        priority: report.priority ?? null,
      })),
    [reports]
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
          Content Moderation
        </h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Review reported content and take appropriate action
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ModerationStatCard
          label="Pending Review"
          value={stats.pending}
          icon={Clock}
          variant="warning"
        />
        <ModerationStatCard
          label="Reviewed"
          value={stats.reviewed}
          icon={CheckCircle}
          variant="success"
        />
        <ModerationStatCard
          label="Dismissed (30d)"
          value={stats.dismissed}
          icon={XCircle}
          variant="default"
        />
        <ModerationStatCard
          label="Action Taken (30d)"
          value={stats.actioned}
          icon={Flag}
          variant="danger"
        />
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {/* Select All checkbox */}
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1 rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                title={allPendingSelected ? "Deselect all" : "Select all pending"}
                disabled={pendingReportIds.length === 0}
              >
                {allPendingSelected ? (
                  <CheckSquare className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                ) : somePendingSelected ? (
                  <CheckSquare className="h-5 w-5 text-neutral-400" />
                ) : (
                  <Square className="h-5 w-5 text-neutral-400" />
                )}
              </button>
              <Filter className="h-4 w-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Filter:
              </span>
              <select
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                value={filters.status}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="actioned">Actioned</option>
                <option value="dismissed">Dismissed</option>
                <option value="all">All</option>
              </select>
              <select
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                value={filters.contentType}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, contentType: event.target.value }))
                }
              >
                <option value="all">All types</option>
                <option value="prompt">Prompts</option>
                <option value="bundle">Bundles</option>
                <option value="workflow">Workflows</option>
                <option value="collection">Collections</option>
              </select>
              <select
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                value={filters.reason}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, reason: event.target.value }))
                }
              >
                <option value="all">All reasons</option>
                <option value="spam">Spam</option>
                <option value="offensive">Inappropriate</option>
                <option value="copyright">Copyright</option>
                <option value="harmful">Harmful</option>
                <option value="other">Other</option>
              </select>
              <select
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                value={filters.priority}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, priority: event.target.value }))
                }
              >
                <option value="all">All priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
              >
                {stats.pending} pending
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={loadReports}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <Card className="border-violet-200 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/10">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
                {selectedIds.size} selected
              </Badge>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Choose a bulk action:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                onClick={() => setShowBulkConfirm({ action: "dismiss", count: selectedIds.size })}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Dismiss All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                onClick={() => setShowBulkConfirm({ action: "warn", count: selectedIds.size })}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Warn All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                onClick={() => setShowBulkConfirm({ action: "remove", count: selectedIds.size })}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Remove All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkActionLoading}
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk action confirmation modal */}
      {showBulkConfirm && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                Confirm bulk {showBulkConfirm.action}
              </span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                This will {showBulkConfirm.action === "dismiss" ? "dismiss" : showBulkConfirm.action === "warn" ? "warn users for" : "remove"} {showBulkConfirm.count} report{showBulkConfirm.count !== 1 ? "s" : ""}.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkConfirm(null)}
                disabled={bulkActionLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className={
                  showBulkConfirm.action === "dismiss"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : showBulkConfirm.action === "warn"
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-red-600 text-white hover:bg-red-700"
                }
                onClick={() => handleBulkAction(showBulkConfirm.action)}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm {showBulkConfirm.action}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loadError && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {loadError}
            </p>
            <div>
              <Button size="sm" onClick={loadReports}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports queue */}
      <div className="space-y-4">
        {viewReports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onAction={handleAction}
            busy={loading || actioningId === report.id || bulkActionLoading}
            selected={selectedIds.has(report.id)}
            onToggleSelect={() => toggleSelectOne(report.id)}
          />
        ))}
      </div>

      {/* Empty state */}
      {!loading && viewReports.length === 0 && !loadError && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <h3 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">
              All caught up!
            </h3>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              No pending reports to review.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ModerationStatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "warning" | "success" | "danger";
}) {
  const colors = {
    default: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    warning: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    danger: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
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

function ReportCard({
  report,
  onAction,
  busy,
  selected,
  onToggleSelect,
}: {
  report: {
    id: string;
    contentType: string;
    contentTitle: string;
    reportedBy: string;
    reason: string;
    details: string;
    status: string;
    createdAt: string;
    contentAuthor: string;
    priority: ReportPriority | null;
  };
  onAction: (reportId: string, action: "dismiss" | "warn" | "remove" | "ban") => void;
  busy: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const priority = report.priority;
  const priorityLevel: ReportPriorityLevel = priority?.level ?? "low";
  const priorityLabel = formatPriorityLabel(priorityLevel);

  const reasonColors: Record<string, string> = {
    "Spam or misleading content": "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    "Copyright violation": "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    "Inappropriate or offensive": "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    "Contains harmful content": "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    "Other": "bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300",
  };

  const priorityColors: Record<ReportPriorityLevel, string> = {
    critical: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    high: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    low: "bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300",
  };

  const slaColors: Record<ReportSlaStatus, string> = {
    ok: "text-neutral-500",
    warning: "text-amber-600 dark:text-amber-400",
    breach: "text-red-600 dark:text-red-400",
  };

  const slaText = priority ? formatSla(priority.slaDeadlineAt, priority.slaStatus) : "SLA unknown";
  const slaClassName = priority ? slaColors[priority.slaStatus] : "text-neutral-500";

  const isPending = report.status === "pending";

  return (
    <Card className={`${report.status === "pending" ? "border-amber-200 dark:border-amber-500/30" : ""} ${selected ? "ring-2 ring-violet-500 dark:ring-violet-400" : ""}`}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Report info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              {/* Selection checkbox */}
              {isPending && (
                <button
                  type="button"
                  onClick={onToggleSelect}
                  className="mt-2 flex-shrink-0 rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title={selected ? "Deselect" : "Select for bulk action"}
                >
                  {selected ? (
                    <CheckSquare className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  ) : (
                    <Square className="h-5 w-5 text-neutral-400" />
                  )}
                </button>
              )}
              <div className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                <Flag className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    {report.contentTitle}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {report.contentType}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  by {report.contentAuthor}
                </p>
              </div>
            </div>

            <div className="ml-11 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {priority && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className={priorityColors[priorityLevel]}>
                        {priorityLabel}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      <div className="space-y-1">
                        <div className="font-medium">Priority score: {priority.score}</div>
                        <div>Reports: {priority.reportCount} (+{priority.breakdown.reportCountScore})</div>
                        <div>Reason impact: +{priority.breakdown.reasonScore}</div>
                        <div>Age impact: +{priority.breakdown.ageScore}</div>
                        <div>Reporter boost: {priority.breakdown.reporterBoost >= 0 ? "+" : ""}{priority.breakdown.reporterBoost}</div>
                        <div>Author tier: {priority.authorTier} ({priority.breakdown.authorTierPenalty})</div>
                        {priority.breakdown.escalationBoost > 0 && (
                          <div>Escalation: +{priority.breakdown.escalationBoost}</div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
                {priority?.escalatedAt && (
                  <Badge
                    variant="outline"
                    className="border-red-300 text-red-600 dark:border-red-500/50 dark:text-red-400"
                  >
                    Escalated
                  </Badge>
                )}
                <Badge className={reasonColors[report.reason] ?? reasonColors["Other"]}>
                  {report.reason}
                </Badge>
                {report.status === "pending" && (
                  <Badge
                    variant="outline"
                    className="border-amber-300 text-amber-600 dark:border-amber-500/50 dark:text-amber-400"
                  >
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>

              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {report.details}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                <span>Reported by: {report.reportedBy}</span>
                {priority && <span>Reports: {priority.reportCount}</span>}
                <span>{report.createdAt}</span>
                {priority && <span className={slaClassName}>{slaText}</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
            <Button variant="outline" size="sm" disabled={busy}>
              <Eye className="mr-2 h-4 w-4" />
              View Content
            </Button>
            {report.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                  onClick={() => onAction(report.id, "dismiss")}
                  disabled={busy}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Dismiss
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                  onClick={() => onAction(report.id, "warn")}
                  disabled={busy}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Warn
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  onClick={() => onAction(report.id, "remove")}
                  disabled={busy}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
