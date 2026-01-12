import type { Metadata } from "next";
import {
  Star,
  Sparkles,
  Award,
  Plus,
  Trash2,
  GripVertical,
  Calendar,
  Clock,
  Eye,
  FileText,
  Package,
  Workflow,
  FolderOpen,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listFeaturedContent,
  getFeaturedStats,
  getResourceTypeLabel,
  FEATURE_TYPES,
  RESOURCE_TYPES,
  type FeaturedContent,
} from "@/lib/featured/featured-store";

export const metadata: Metadata = {
  title: "Featured Content | Admin",
  description: "Manage staff picks and featured content.",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getFeatureIcon(type: string) {
  switch (type) {
    case "staff_pick":
      return <Star className="h-4 w-4" />;
    case "featured":
      return <Sparkles className="h-4 w-4" />;
    case "spotlight":
      return <Award className="h-4 w-4" />;
    default:
      return <Star className="h-4 w-4" />;
  }
}

function getResourceIcon(type: string) {
  switch (type) {
    case "prompt":
      return <FileText className="h-4 w-4" />;
    case "bundle":
      return <Package className="h-4 w-4" />;
    case "workflow":
      return <Workflow className="h-4 w-4" />;
    case "collection":
      return <FolderOpen className="h-4 w-4" />;
    case "profile":
      return <User className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

function getFeatureColor(type: string) {
  switch (type) {
    case "staff_pick":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
    case "featured":
      return "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400";
    case "spotlight":
      return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400";
    default:
      return "bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300";
  }
}

export default function AdminFeaturedPage() {
  const items = listFeaturedContent({ includeInactive: true, includeExpired: true, limit: 100 });
  const activeItems = listFeaturedContent({ includeInactive: false, includeExpired: false, limit: 100 });
  const stats = getFeaturedStats();

  const activeIds = new Set(activeItems.map((item) => item.id));
  const staffPicks = activeItems.filter((item) => item.featureType === "staff_pick");
  const featured = activeItems.filter((item) => item.featureType === "featured");
  const spotlights = activeItems.filter((item) => item.featureType === "spotlight");
  const inactive = items.filter((item) => !activeIds.has(item.id));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Featured Content
          </h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            Manage staff picks, featured items, and spotlight content
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Featured
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Staff Picks"
          value={stats.byType.staff_pick}
          icon={Star}
          variant="amber"
        />
        <StatsCard
          label="Featured"
          value={stats.byType.featured}
          icon={Sparkles}
          variant="violet"
        />
        <StatsCard
          label="Spotlights"
          value={stats.byType.spotlight}
          icon={Award}
          variant="sky"
        />
        <StatsCard
          label="Total Active"
          value={stats.active}
          icon={Eye}
          variant="default"
        />
      </div>

      {/* Content by type */}
      <div className="space-y-6">
        {/* Staff Picks */}
        <FeaturedSection
          title="Staff Picks"
          description="Hand-picked content by our team"
          icon={Star}
          items={staffPicks}
          emptyMessage="No staff picks yet. Add your first pick!"
          variant="amber"
        />

        {/* Featured */}
        <FeaturedSection
          title="Featured"
          description="Highlighted content for discovery"
          icon={Sparkles}
          items={featured}
          emptyMessage="No featured content. Highlight great content!"
          variant="violet"
        />

        {/* Spotlights */}
        <FeaturedSection
          title="Spotlights"
          description="Special spotlight features"
          icon={Award}
          items={spotlights}
          emptyMessage="No spotlights active."
          variant="sky"
        />

        {/* Inactive */}
        {inactive.length > 0 && (
          <FeaturedSection
            title="Inactive / Expired"
            description="Previously featured content"
            icon={Clock}
            items={inactive}
            emptyMessage=""
            variant="neutral"
          />
        )}
      </div>

      {/* Quick add form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Featured Content
          </CardTitle>
          <CardDescription>
            Select content to feature on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground">Feature Type</label>
              <select className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {FEATURE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Resource Type</label>
              <select className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {RESOURCE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Resource ID</label>
            <input
              type="text"
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Enter the resource ID (e.g., idea-wizard)"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-foreground">Headline (optional)</label>
              <input
                type="text"
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Custom headline"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">End Date (optional)</label>
              <input
                type="date"
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Featured Content
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "amber" | "violet" | "sky";
}) {
  const colors = {
    default: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
    sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg p-2 ${colors[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturedSection({
  title,
  description,
  icon: Icon,
  items,
  emptyMessage,
  variant,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FeaturedContent[];
  emptyMessage: string;
  variant: "amber" | "violet" | "sky" | "neutral";
}) {
  const headerColors = {
    amber: "text-amber-600 dark:text-amber-400",
    violet: "text-violet-600 dark:text-violet-400",
    sky: "text-sky-600 dark:text-sky-400",
    neutral: "text-neutral-500 dark:text-neutral-400",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${headerColors[variant]}`}>
          <Icon className="h-5 w-5" />
          {title}
          <Badge variant="secondary" className="ml-auto">
            {items.length}
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <FeaturedItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FeaturedItem({ item }: { item: FeaturedContent }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
      <div className="cursor-grab text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className={`rounded-lg p-2 ${getFeatureColor(item.featureType)}`}>
        {getFeatureIcon(item.featureType)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">
            {item.headline ?? item.resourceTitle ?? item.resourceId}
          </span>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            {getResourceIcon(item.resourceType)}
            {getResourceTypeLabel(item.resourceType)}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Added {formatDate(item.createdAt)}
          </span>
          {item.endAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Ends {formatDate(item.endAt)}
            </span>
          )}
          {item.category && (
            <span>Category: {item.category}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" title="View">
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" title="Remove" className="text-red-500 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
