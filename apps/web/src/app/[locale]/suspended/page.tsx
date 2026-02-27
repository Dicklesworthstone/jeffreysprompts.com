import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Clock, AlertTriangle, Mail, HelpCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Account Suspended | JeffreysPrompts",
  description: "Your account has been suspended. Learn more about next steps.",
};

interface SuspendedPageProps {
  searchParams: Promise<{
    reason?: string;
    until?: string;
    type?: string;
    actionId?: string;
    userId?: string;
    email?: string;
  }>;
}

export default async function SuspendedPage({ searchParams }: SuspendedPageProps) {
  const params = await searchParams;
  const suspensionType = params.type ?? "suspended";
  const reason = params.reason ?? "policy violation";
  const until = params.until;
  const actionId = params.actionId;
  const userId = params.userId;
  const userEmail = params.email;

  const isBanned = suspensionType === "ban" || suspensionType === "banned";
  const isIndefinite = suspensionType === "indefinite" || !until;

  // Build appeal URL if we have the required params
  const canBuildAppealUrl = !isBanned && actionId && userId && userEmail;
  const appealUrl = canBuildAppealUrl
    ? `/appeals/new?actionId=${encodeURIComponent(actionId)}&userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(userEmail)}`
    : "/contact?subject=suspension-appeal";

  let endDateText = "indefinitely";
  if (until && !isBanned) {
    const endDate = new Date(until);
    if (!Number.isNaN(endDate.getTime())) {
      endDateText = `until ${endDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`;
    }
  }

  const Icon = isBanned ? Ban : isIndefinite ? AlertTriangle : Clock;
  const iconColorClass = isBanned
    ? "text-red-500"
    : isIndefinite
      ? "text-amber-500"
      : "text-orange-500";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Card className="border-2 border-red-200 dark:border-red-500/30">
          <CardContent className="pt-8 pb-8 px-6 text-center">
            <div className="mb-6">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 dark:bg-red-500/10 ${iconColorClass}`}>
                <Icon className="h-10 w-10" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-3">
              {isBanned ? "Account Banned" : "Account Suspended"}
            </h1>

            <p className="text-muted-foreground mb-6">
              {isBanned ? (
                "Your account has been permanently banned due to serious or repeated violations of the community guidelines."
              ) : (
                <>
                  Your account has been suspended {endDateText}.
                  {!isIndefinite && " Access will be automatically restored after this period."}
                </>
              )}
            </p>

            {/* Reason card */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
              <h2 className="text-sm font-semibold text-foreground mb-2">
                Reason for {isBanned ? "ban" : "suspension"}:
              </h2>
              <p className="text-sm text-muted-foreground capitalize">
                {reason.replace(/_/g, " ")}
              </p>
            </div>

            {/* What this means section */}
            <div className="text-left mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                What this means:
              </h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  You cannot access your account or create content
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  Your public content may be hidden from other users
                </li>
                {!isBanned && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {isIndefinite
                      ? "Your account requires manual review to be reinstated"
                      : "Access will be automatically restored after the suspension period"}
                  </li>
                )}
                {!isBanned && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    You may submit an appeal if you believe this was a mistake
                  </li>
                )}
              </ul>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {!isBanned && (
                <Button asChild>
                  <Link href={appealUrl} className="gap-2">
                    <Mail className="h-4 w-4" />
                    Submit Appeal
                  </Link>
                </Button>
              )}

              <Button variant="outline" asChild>
                <Link href="/guidelines" className="gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Review Community Guidelines
                </Link>
              </Button>

              <Button variant="ghost" asChild>
                <Link href="/" className="gap-2">
                  <Home className="h-4 w-4" />
                  Return to Homepage
                </Link>
              </Button>
            </div>

            {/* Help text */}
            <p className="mt-6 text-xs text-muted-foreground">
              If you have questions about this {isBanned ? "ban" : "suspension"}, please{" "}
              <Link href="/contact" className="text-primary hover:underline">
                contact support
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* Additional info card */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Preventing future issues
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1.5">
              <li>• Be respectful and constructive in all interactions</li>
              <li>• Only share content you have rights to share</li>
              <li>• Follow the community guidelines at all times</li>
              <li>• Report violations instead of engaging with them</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
