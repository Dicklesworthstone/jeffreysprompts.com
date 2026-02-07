import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppealForm } from "@/components/moderation/appeal-form";
import {
  getModerationAction,
  getModerationReasonLabel,
  getActionTypeLabel,
} from "@/lib/moderation/action-store";
import { canAppealAction, getAppealByActionId } from "@/lib/moderation/appeal-store";

export const metadata: Metadata = {
  title: "Submit Appeal | JeffreysPrompts",
  description: "Submit an appeal for a moderation decision.",
};

interface NewAppealPageProps {
  searchParams: Promise<{
    actionId?: string;
    userId?: string;
    email?: string;
    name?: string;
  }>;
}

export default async function NewAppealPage({ searchParams }: NewAppealPageProps) {
  const params = await searchParams;
  const { actionId, userId, email, name } = params;

  // Validate required params
  if (!actionId || !userId || !email) {
    return (
      <div className="container max-w-2xl py-12">
        <Card className="border-red-200 dark:border-red-500/30">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Missing Information</h2>
            <p className="text-muted-foreground mb-4">
              To submit an appeal, you must access this page from your suspension notice.
              Please return to your suspension page and click the appeal link.
            </p>
            <Button variant="outline" asChild>
              <Link href="/suspended">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Suspension Page
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get the moderation action
  const action = getModerationAction(actionId);

  if (!action) {
    return (
      <div className="container max-w-2xl py-12">
        <Card className="border-red-200 dark:border-red-500/30">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Action Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The moderation action you are trying to appeal could not be found.
              It may have been reversed or expired.
            </p>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact Support</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verify user owns this action
  if (action.userId !== userId) {
    return (
      <div className="container max-w-2xl py-12">
        <Card className="border-red-200 dark:border-red-500/30">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You do not have permission to appeal this action.
            </p>
            <Button variant="outline" asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if already appealed
  const existingAppeal = getAppealByActionId(actionId);
  if (existingAppeal) {
    redirect(
      `/appeals/${existingAppeal.id}?appealToken=${encodeURIComponent(existingAppeal.accessToken)}`
    );
  }

  // Check if can appeal
  const appealCheck = canAppealAction(actionId, action.createdAt);
  if (!appealCheck.canAppeal) {
    return (
      <div className="container max-w-2xl py-12">
        <Card className="border-amber-200 dark:border-amber-500/30">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Cannot Submit Appeal</h2>
            <p className="text-muted-foreground mb-4">
              {appealCheck.reason}
            </p>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact Support</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const actionTypeLabel = getActionTypeLabel(action.actionType);
  const reasonLabel = getModerationReasonLabel(action.reason);

  return (
    <div className="container max-w-2xl py-12">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/suspended">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Submit an Appeal</h1>
        <p className="text-muted-foreground mt-1">
          Explain why you believe the moderation action was incorrect.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appeal Form</CardTitle>
        </CardHeader>
        <CardContent>
          <AppealForm
            actionId={actionId}
            userId={userId}
            userEmail={email}
            userName={name}
            actionType={actionTypeLabel}
            reason={reasonLabel}
            actionDate={action.createdAt}
          />
        </CardContent>
      </Card>
    </div>
  );
}
