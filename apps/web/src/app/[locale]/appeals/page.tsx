import type { Metadata } from "next";
import Link from "next/link";
import { FileText, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Moderation Appeals | JeffreysPrompts",
  description: "Submit or check the status of a moderation appeal.",
};

interface AppealsPageProps {
  searchParams: Promise<{
    actionId?: string;
    userId?: string;
    email?: string;
  }>;
}

export default async function AppealsPage({ searchParams }: AppealsPageProps) {
  const params = await searchParams;
  const { actionId, userId, email } = params;

  // If we have an actionId, redirect to the new appeal form
  if (actionId && userId && email) {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submit Appeal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You are about to submit an appeal for a moderation action.
            </p>
            <Button asChild>
              <Link
                href={`/appeals/new?actionId=${actionId}&userId=${userId}&email=${encodeURIComponent(email)}`}
              >
                Continue to Appeal Form
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">Moderation Appeals</h1>
        <p className="text-muted-foreground">
          If you believe a moderation action was taken in error, you can submit an appeal for review.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Check existing appeal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Check Appeal Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              If you have already submitted an appeal, you can check its status using the link
              provided in your confirmation email.
            </p>
            <p className="text-sm text-muted-foreground">
              Appeals are typically reviewed within 14 days. You will receive an email notification
              when a decision is made.
            </p>
          </CardContent>
        </Card>

        {/* New appeal info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Submit a New Appeal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              To submit a new appeal, you must access this page from your suspension notice.
              Appeals can only be submitted within 7 days of the moderation action.
            </p>
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Appeal Guidelines:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• You can only submit one appeal per moderation action</li>
                <li>• Appeals must be submitted within 7 days</li>
                <li>• Be honest and provide relevant context in your explanation</li>
                <li>• Decisions are typically made within 14 days</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Contact support */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              If you have questions about moderation or appeals, please{" "}
              <Link href="/contact" className="text-primary hover:underline">
                contact support
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
