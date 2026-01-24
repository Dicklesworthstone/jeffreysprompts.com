import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFeature,
  getFeatureComments,
  STATUS_CONFIG,
} from "@/lib/roadmap/roadmap-store";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronUp,
  MessageSquare,
  Clock,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const feature = getFeature(id);

  if (!feature) {
    return { title: "Feature Not Found" };
  }

  return {
    title: feature.title,
    description: feature.description.slice(0, 160),
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function FeatureDetailPage({ params }: Props) {
  const { id } = await params;
  const feature = getFeature(id);

  if (!feature) {
    notFound();
  }

  const comments = getFeatureComments(id);
  const statusConfig = STATUS_CONFIG[feature.status];

  return (
    <div className="container max-w-3xl py-8 px-4">
      {/* Back link */}
      <Link
        href="/roadmap"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Roadmap
      </Link>

      {/* Feature header */}
      <Card className="p-6 mb-6">
        <div className="flex gap-6">
          {/* Vote section */}
          <div className="flex flex-col items-center justify-center text-center border-r pr-6">
            <Button variant="ghost" size="sm" className="flex flex-col h-auto py-2">
              <ChevronUp className="h-6 w-6" />
            </Button>
            <span className="text-2xl font-bold">{feature.voteCount}</span>
            <span className="text-xs text-muted-foreground">votes</span>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start gap-2 mb-2">
              <Badge variant="outline" className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
              {feature.plannedQuarter && (
                <Badge variant="secondary" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {feature.plannedQuarter}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl font-bold mb-2">{feature.title}</h1>

            <p className="text-muted-foreground mb-4">{feature.description}</p>

            {feature.useCase && (
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-sm mb-1">Use Case</h3>
                <p className="text-sm text-muted-foreground">{feature.useCase}</p>
              </div>
            )}

            {/* Status note (for declined features) */}
            {feature.statusNote && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <h3 className="font-medium text-sm mb-1 text-amber-600">
                      Status Note
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.statusNote}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Shipped date */}
            {feature.shippedAt && (
              <div className="flex items-center gap-2 text-emerald-600 mb-4">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Shipped on {formatDate(feature.shippedAt)}
                </span>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {feature.submittedByName && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Submitted by {feature.submittedByName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDate(feature.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                {feature.commentCount} comments
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Comments */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <Card
                key={comment.id}
                className={`p-4 ${
                  comment.isOfficial ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {comment.userName}
                      </span>
                      {comment.isOfficial && (
                        <Badge variant="default" className="text-xs">
                          Official
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add comment placeholder */}
        <Card className="p-4 border-dashed">
          <p className="text-sm text-muted-foreground text-center">
            Sign in to add a comment and vote on this feature.
          </p>
        </Card>
      </div>
    </div>
  );
}
