import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppealStatus } from "@/components/moderation/appeal-status";
import { getAppeal } from "@/lib/moderation/appeal-store";
import {
  getModerationAction,
  getModerationReasonLabel,
  getActionTypeLabel,
} from "@/lib/moderation/action-store";

export const metadata: Metadata = {
  title: "Appeal Status | JeffreysPrompts",
  description: "Check the status of your moderation appeal.",
};

interface AppealStatusPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ appealToken?: string }>;
}

export default async function AppealStatusPage({
  params,
  searchParams,
}: AppealStatusPageProps) {
  const { id } = await params;
  const { appealToken } = await searchParams;

  // Validate access token parameter
  if (!appealToken) {
    return (
      <div className="container max-w-2xl py-12">
        <Card className="border-amber-200 dark:border-amber-500/30">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Token Required</h2>
            <p className="text-muted-foreground mb-4">
              To view your appeal status, please use the link from your appeal confirmation.
            </p>
            <Button variant="outline" asChild>
              <Link href="/appeals">Go to Appeals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get the appeal
  const appeal = getAppeal(id);

  if (!appeal) {
    return (
      <div className="container max-w-2xl py-12">
        <Card className="border-red-200 dark:border-red-500/30">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Appeal Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The appeal you are looking for could not be found. Please check the link
              and try again.
            </p>
            <Button variant="outline" asChild>
              <Link href="/appeals">Go to Appeals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (appeal.accessToken !== appealToken) {
    return (
      <div className="container max-w-2xl py-12">
        <Card className="border-red-200 dark:border-red-500/30">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You do not have permission to view this appeal.
            </p>
            <Button variant="outline" asChild>
              <Link href="/appeals">Go to Appeals</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get the associated action
  const action = getModerationAction(appeal.actionId);
  const actionData = action
    ? {
        actionType: getActionTypeLabel(action.actionType),
        reason: getModerationReasonLabel(action.reason),
        details: action.details,
        createdAt: action.createdAt,
      }
    : null;

  return (
    <div className="container max-w-2xl py-12">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/appeals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Appeals
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Appeal Status</h1>
        <p className="text-muted-foreground mt-1">
          Appeal ID: {appeal.id.slice(0, 8)}...
        </p>
      </div>

      <AppealStatus appeal={appeal} action={actionData} />
    </div>
  );
}
