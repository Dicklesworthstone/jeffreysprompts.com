import type { Metadata } from "next";
import Link from "next/link";
import { localizeHref } from "@/i18n/config";
import { getResolvedIncidents, getIncidentStats } from "@/lib/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Incident History | System Status | JeffreysPrompts",
  description: "View the history of past incidents and outages on JeffreysPrompts.",
};

export const revalidate = 60;

const IMPACT_COLORS: Record<string, string> = {
  none: "bg-neutral-500",
  minor: "bg-yellow-500",
  major: "bg-orange-500",
  critical: "bg-red-500",
};

const IMPACT_LABELS: Record<string, string> = {
  none: "No Impact",
  minor: "Minor",
  major: "Major",
  critical: "Critical",
};

function calculateDuration(start: string, end: string | null): string {
  if (!end) return "Ongoing";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
}

interface StatusHistoryPageProps {
  params: Promise<{ locale: string }>;
}

export default async function StatusHistoryPage({ params }: StatusHistoryPageProps) {
  const { locale } = await params;
  const [incidents, stats] = await Promise.all([
    Promise.resolve(getResolvedIncidents(50)),
    Promise.resolve(getIncidentStats()),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link
              href={localizeHref(locale, "/status")}
              className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              Status
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="text-sm">History</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Incident History</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Past incidents and their resolutions
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-neutral-500">Total Incidents</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.resolved}</div>
              <div className="text-sm text-neutral-500">Resolved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.active}</div>
              <div className="text-sm text-neutral-500">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.last30Days}</div>
              <div className="text-sm text-neutral-500">Last 30 Days</div>
            </CardContent>
          </Card>
        </div>

        <section>
          <h2 className="text-xl font-semibold mb-4">Past Incidents</h2>

          {incidents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">No past incidents</div>
                <p className="text-neutral-500">
                  Great news! There are no past incidents to report.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <Card key={incident.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{incident.title}</CardTitle>
                        <div className="text-sm text-neutral-500 mt-1">
                          {new Date(incident.createdAt).toLocaleDateString(undefined, {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-white ${IMPACT_COLORS[incident.impact]}`}
                      >
                        {IMPACT_LABELS[incident.impact] ?? incident.impact}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500 mb-4">
                      <div>
                        <span className="font-medium">Duration:</span>{" "}
                        {calculateDuration(incident.createdAt, incident.resolvedAt)}
                      </div>
                      {incident.affectedComponents.length > 0 && (
                        <div>
                          <span className="font-medium">Affected:</span>{" "}
                          {incident.affectedComponents.join(", ")}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
                      <h4 className="text-sm font-medium mb-3">Timeline</h4>
                      <div className="space-y-3">
                        {incident.updates.map((update, index) => (
                          <div
                            key={update.id}
                            className="flex gap-3 text-sm"
                          >
                            <div className="w-20 flex-shrink-0 text-neutral-400">
                              {new Date(update.createdAt).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="flex-1">
                              <Badge
                                variant="outline"
                                className={`text-xs mb-1 ${
                                  index === incident.updates.length - 1
                                    ? "bg-emerald-100 dark:bg-emerald-900"
                                    : ""
                                }`}
                              >
                                {update.status}
                              </Badge>
                              <p className="text-neutral-600 dark:text-neutral-400">
                                {update.message}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center">
          <p className="text-sm text-neutral-500">
            <Link href={localizeHref(locale, "/status")} className="hover:underline">
              Back to current status
            </Link>
            {" | "}
            <Link href={localizeHref(locale, "/")} className="hover:underline">
              Return to JeffreysPrompts
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
