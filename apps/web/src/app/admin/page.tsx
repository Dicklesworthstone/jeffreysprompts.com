import type { Metadata } from "next";
import {
  Users,
  CreditCard,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Dashboard | Admin",
  description: "Platform overview and statistics.",
};

// Mock data - in production, this would come from API
const stats = {
  totalUsers: 1234,
  newUsersThisWeek: 56,
  usersTrend: "+12%",
  activeSubscribers: 342,
  mrr: 3420,
  subscribersTrend: "+8%",
  totalContent: 4521,
  contentThisWeek: 127,
  pendingModeration: 12,
};

const recentActivity = [
  { type: "signup", user: "alice@example.com", time: "2 minutes ago" },
  { type: "subscription", user: "bob@example.com", time: "15 minutes ago" },
  { type: "content", user: "charlie@example.com", time: "1 hour ago" },
  { type: "report", user: "dave@example.com", time: "2 hours ago" },
  { type: "signup", user: "eve@example.com", time: "3 hours ago" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Platform overview and key metrics
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          subtitle={`+${stats.newUsersThisWeek} this week`}
          trend={stats.usersTrend}
          trendUp={true}
          icon={Users}
        />
        <StatCard
          title="Active Subscribers"
          value={stats.activeSubscribers.toLocaleString()}
          subtitle={`$${stats.mrr.toLocaleString()} MRR`}
          trend={stats.subscribersTrend}
          trendUp={true}
          icon={CreditCard}
        />
        <StatCard
          title="Total Content"
          value={stats.totalContent.toLocaleString()}
          subtitle={`+${stats.contentThisWeek} this week`}
          icon={FileText}
        />
        <StatCard
          title="Pending Moderation"
          value={stats.pendingModeration.toString()}
          subtitle="Requires review"
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* Content sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-zinc-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <ActivityItem key={idx} {...activity} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <QuickActionLink
                href="/admin/moderation"
                label="Review pending content"
                count={stats.pendingModeration}
              />
              <QuickActionLink
                href="/admin/users"
                label="Manage users"
                description="Search, view, and manage user accounts"
              />
              <QuickActionLink
                href="/admin/settings"
                label="Platform settings"
                description="Configure site-wide options"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
              <p className="text-sm text-zinc-500">
                Chart placeholder - integrate with analytics API
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
              <p className="text-sm text-zinc-500">
                Chart placeholder - integrate with Stripe API
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  trendUp?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div
            className={`rounded-lg p-2 ${
              variant === "warning"
                ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                : "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <Badge
              variant={trendUp ? "default" : "secondary"}
              className={
                trendUp
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
              }
            >
              {trendUp ? (
                <TrendingUp className="mr-1 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3" />
              )}
              {trend}
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {value}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
        </div>
        <p className="mt-2 text-sm font-medium text-zinc-500">{title}</p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({
  type,
  user,
  time,
}: {
  type: string;
  user: string;
  time: string;
}) {
  const config = {
    signup: {
      label: "New signup",
      color: "bg-emerald-500",
    },
    subscription: {
      label: "New subscription",
      color: "bg-violet-500",
    },
    content: {
      label: "Content created",
      color: "bg-blue-500",
    },
    report: {
      label: "Content reported",
      color: "bg-amber-500",
    },
  }[type] ?? { label: type, color: "bg-zinc-500" };

  return (
    <div className="flex items-center gap-3">
      <div className={`h-2 w-2 rounded-full ${config.color}`} />
      <div className="flex-1">
        <p className="text-sm text-zinc-900 dark:text-white">
          <span className="font-medium">{config.label}</span>
          <span className="text-zinc-600 dark:text-zinc-400"> - {user}</span>
        </p>
      </div>
      <p className="text-xs text-zinc-500">{time}</p>
    </div>
  );
}

function QuickActionLink({
  href,
  label,
  description,
  count,
}: {
  href: string;
  label: string;
  description?: string;
  count?: number;
}) {
  return (
    <a
      href={href}
      className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
    >
      <div>
        <p className="font-medium text-zinc-900 dark:text-white">{label}</p>
        {description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && count > 0 && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
            {count}
          </Badge>
        )}
        <ArrowUpRight className="h-4 w-4 text-zinc-400" />
      </div>
    </a>
  );
}
