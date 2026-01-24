import type { Metadata } from "next";
import Link from "next/link";
import {
  getRoadmapByStatus,
  getRoadmapStats,
  STATUS_CONFIG,
  type FeatureRequest,
  type FeatureStatus,
} from "@/lib/roadmap/roadmap-store";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  MessageSquare,
  Lightbulb,
  Rocket,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "See what we're building next. Vote on features and help shape the future of Jeffrey's Prompts.",
};

function StatusIcon({ status }: { status: FeatureStatus }) {
  switch (status) {
    case "under_review":
      return <Clock className="h-4 w-4" />;
    case "planned":
      return <Lightbulb className="h-4 w-4" />;
    case "in_progress":
      return <Rocket className="h-4 w-4" />;
    case "shipped":
      return <CheckCircle2 className="h-4 w-4" />;
    case "declined":
      return <XCircle className="h-4 w-4" />;
    default:
      return null;
  }
}

function FeatureCard({ feature }: { feature: FeatureRequest }) {
  const statusConfig = STATUS_CONFIG[feature.status];

  return (
    <Link href={`/roadmap/${feature.id}`}>
      <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
        <div className="flex gap-4">
          {/* Vote count */}
          <div className="flex flex-col items-center justify-center min-w-[50px] text-center">
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-lg">{feature.voteCount}</span>
            <span className="text-xs text-muted-foreground">votes</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <h3 className="font-medium text-sm line-clamp-1">
                {feature.title}
              </h3>
              <Badge variant="outline" className={`shrink-0 ${statusConfig.color}`}>
                <StatusIcon status={feature.status} />
                <span className="ml-1">{statusConfig.label}</span>
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {feature.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {feature.plannedQuarter && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {feature.plannedQuarter}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {feature.commentCount} comments
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function StatusColumn({
  status,
  features,
}: {
  status: FeatureStatus;
  features: FeatureRequest[];
}) {
  const statusConfig = STATUS_CONFIG[status];

  if (features.length === 0 && status === "declined") {
    return null; // Hide empty declined column
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={statusConfig.color}>
          <StatusIcon status={status} />
          <span className="ml-1">{statusConfig.label}</span>
        </Badge>
        <span className="text-sm text-muted-foreground">
          ({features.length})
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{statusConfig.description}</p>

      <div className="flex flex-col gap-2">
        {features.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
        {features.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
            No features in this category
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const roadmap = getRoadmapByStatus();
  const stats = getRoadmapStats();

  return (
    <div className="container max-w-6xl py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Product Roadmap</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          See what we&apos;re building and help shape the future. Vote on features
          you want or submit your own ideas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{stats.totalFeatures}</div>
          <div className="text-sm text-muted-foreground">Total Features</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.inProgress}
          </div>
          <div className="text-sm text-muted-foreground">In Progress</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {stats.shipped}
          </div>
          <div className="text-sm text-muted-foreground">Shipped</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold">{stats.totalVotes}</div>
          <div className="text-sm text-muted-foreground">Total Votes</div>
        </Card>
      </div>

      {/* Submit CTA */}
      <div className="flex justify-center mb-8">
        <Link href="/roadmap/submit">
          <Button size="lg" className="gap-2">
            <Lightbulb className="h-5 w-5" />
            Submit a Feature Request
          </Button>
        </Link>
      </div>

      {/* Roadmap columns */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* In Progress - most visible */}
        <StatusColumn status="in_progress" features={roadmap.in_progress} />

        {/* Planned */}
        <StatusColumn status="planned" features={roadmap.planned} />

        {/* Under Review */}
        <StatusColumn status="under_review" features={roadmap.under_review} />
      </div>

      {/* Recently Shipped - Separate section */}
      {roadmap.shipped.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Recently Shipped
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roadmap.shipped.slice(0, 6).map((feature) => (
              <FeatureCard key={feature.id} feature={feature} />
            ))}
          </div>
        </div>
      )}

      {/* Declined - collapsed by default */}
      {roadmap.declined.length > 0 && (
        <div className="mt-12">
          <details className="group">
            <summary className="cursor-pointer list-none">
              <h2 className="text-lg font-medium text-muted-foreground flex items-center gap-2 hover:text-foreground transition-colors">
                <XCircle className="h-4 w-4" />
                Declined ({roadmap.declined.length})
                <span className="text-xs">(click to expand)</span>
              </h2>
            </summary>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {roadmap.declined.map((feature) => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
