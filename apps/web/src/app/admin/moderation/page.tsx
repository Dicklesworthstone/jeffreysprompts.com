import type { Metadata } from "next";
import {
  Flag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  Clock,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Content Moderation | Admin",
  description: "Review and moderate reported content.",
};

// Mock data - in production, this would come from API
const mockReports = [
  {
    id: "1",
    contentType: "prompt",
    contentTitle: "Suspicious prompt about bypassing...",
    reportedBy: "user123@example.com",
    reason: "Spam or misleading content",
    details: "This prompt appears to be attempting to jailbreak AI models.",
    status: "pending",
    createdAt: "2 hours ago",
    contentAuthor: "spammer@example.com",
  },
  {
    id: "2",
    contentType: "prompt",
    contentTitle: "Code generation helper",
    reportedBy: "moderator@example.com",
    reason: "Copyright violation",
    details: "Contains copyrighted code snippets from a commercial product.",
    status: "pending",
    createdAt: "5 hours ago",
    contentAuthor: "developer@example.com",
  },
  {
    id: "3",
    contentType: "collection",
    contentTitle: "My awesome prompts",
    reportedBy: "concerned@example.com",
    reason: "Inappropriate or offensive",
    details: "Collection description contains inappropriate language.",
    status: "pending",
    createdAt: "1 day ago",
    contentAuthor: "creator@example.com",
  },
  {
    id: "4",
    contentType: "prompt",
    contentTitle: "Marketing assistant",
    reportedBy: "reviewer@example.com",
    reason: "Other",
    details: "Low quality content that doesnt meet community standards.",
    status: "reviewed",
    createdAt: "2 days ago",
    contentAuthor: "marketer@example.com",
  },
];

const stats = {
  pending: 12,
  reviewedToday: 8,
  dismissed: 45,
  actioned: 23,
};

export default function AdminModerationPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Content Moderation
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
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
          label="Reviewed Today"
          value={stats.reviewedToday}
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
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Filter:
              </span>
              <select className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="all">All</option>
              </select>
              <select className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <option value="all">All types</option>
                <option value="prompt">Prompts</option>
                <option value="collection">Collections</option>
                <option value="skill">Skills</option>
              </select>
              <select className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <option value="all">All reasons</option>
                <option value="spam">Spam</option>
                <option value="inappropriate">Inappropriate</option>
                <option value="copyright">Copyright</option>
                <option value="harmful">Harmful</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              {stats.pending} pending
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Reports queue */}
      <div className="space-y-4">
        {mockReports.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>

      {/* Empty state for when queue is clear */}
      {mockReports.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
              All caught up!
            </h3>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
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
    default: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
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
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {value}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportCard({
  report,
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
  };
}) {
  const reasonColors: Record<string, string> = {
    "Spam or misleading content": "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    "Copyright violation": "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    "Inappropriate or offensive": "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    "Contains harmful content": "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    "Other": "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  };

  return (
    <Card className={report.status === "pending" ? "border-amber-200 dark:border-amber-500/30" : ""}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          {/* Report info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                <Flag className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {report.contentTitle}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {report.contentType}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  by {report.contentAuthor}
                </p>
              </div>
            </div>

            <div className="ml-11 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={reasonColors[report.reason] ?? reasonColors["Other"]}>
                  {report.reason}
                </Badge>
                {report.status === "pending" && (
                  <Badge variant="outline" className="border-amber-300 text-amber-600 dark:border-amber-500/50 dark:text-amber-400">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {report.details}
              </p>

              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>Reported by: {report.reportedBy}</span>
                <span>{report.createdAt}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
            <Button variant="outline" size="sm">
              <Eye className="mr-2 h-4 w-4" />
              View Content
            </Button>
            {report.status === "pending" && (
              <>
                <Button variant="outline" size="sm" className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Dismiss
                </Button>
                <Button variant="outline" size="sm" className="text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Warn
                </Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
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
