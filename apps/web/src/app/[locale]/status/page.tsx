import type { Metadata } from "next";
import Link from "next/link";
import { localizeHref } from "@/i18n/config";
import { getStatusSummary, getResolvedIncidents } from "@/lib/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "System Status | JeffreysPrompts",
  description: "Check the current operational status of JeffreysPrompts services and view incident history.",
};

export const revalidate = 30;

const STATUS_COLORS: Record<string, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-yellow-500",
  partial_outage: "bg-orange-500",
  major_outage: "bg-red-500",
  maintenance: "bg-blue-500",
};

const STATUS_LABELS: Record<string, string> = {
  operational: "Operational",
  degraded: "Degraded",
  partial_outage: "Partial Outage",
  major_outage: "Major Outage",
  maintenance: "Under Maintenance",
};

const INCIDENT_STATUS_COLORS: Record<string, string> = {
  investigating: "bg-red-500",
  identified: "bg-orange-500",
  monitoring: "bg-yellow-500",
  resolved: "bg-emerald-500",
};

function StatusIndicator({ status }: { status: string }) {
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${STATUS_COLORS[status] ?? "bg-neutral-400"}`}
      aria-label={STATUS_LABELS[status] ?? status}
    />
  );
}

function OverallStatus({ status, message }: { status: string; message: string }) {
  const bgColor = {
    operational: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800",
    degraded: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800",
    partial_outage: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
    major_outage: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
    maintenance: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  }[status] ?? "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800";

  return (
    <div className={`rounded-lg border-2 p-6 text-center ${bgColor}`}>
      <div className="flex items-center justify-center gap-3 mb-2">
        <StatusIndicator status={status} />
        <span className="text-2xl font-semibold">{STATUS_LABELS[status] ?? status}</span>
      </div>
      <p className="text-neutral-600 dark:text-neutral-400">{message}</p>
    </div>
  );
}

interface StatusPageProps {
  params: Promise<{ locale: string }>;
}

export default async function StatusPage({ params }: StatusPageProps) {
  const { locale } = await params;
  const [summary, recentIncidents] = await Promise.all([
    getStatusSummary(),
    Promise.resolve(getResolvedIncidents(5)),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">System Status</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Current status of JeffreysPrompts services
          </p>
        </div>

        <OverallStatus status={summary.status} message={summary.message} />

        <section className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Components</h2>
          <Card>
            <CardContent className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {summary.components.map((component) => (
                <div
                  key={component.name}
                  className="flex items-center justify-between py-4 first:pt-6 last:pb-6"
                >
                  <div>
                    <span className="font-medium">{component.displayName}</span>
                    {component.latencyMs !== undefined && (
                      <span className="ml-2 text-sm text-neutral-500">
                        ({component.latencyMs}ms)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {STATUS_LABELS[component.status] ?? component.status}
                    </span>
                    <StatusIndicator status={component.status} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {summary.activeIncidents.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Active Incidents</h2>
            <div className="space-y-4">
              {summary.activeIncidents.map((incident) => (
                <Card key={incident.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{incident.title}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-white ${INCIDENT_STATUS_COLORS[incident.status]}`}
                      >
                        {incident.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-neutral-500">
                      Started {new Date(incident.createdAt).toLocaleString()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {incident.updates.slice(0, 3).map((update) => (
                        <div key={update.id} className="border-l-2 border-neutral-300 dark:border-neutral-700 pl-3">
                          <div className="text-sm text-neutral-500 mb-1">
                            {new Date(update.createdAt).toLocaleString()} - {update.status}
                          </div>
                          <p className="text-sm">{update.message}</p>
                        </div>
                      ))}
                    </div>
                    {incident.affectedComponents.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {incident.affectedComponents.map((comp) => (
                          <Badge key={comp} variant="secondary">
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {summary.upcomingMaintenance.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-4">Scheduled Maintenance</h2>
            <div className="space-y-4">
              {summary.upcomingMaintenance.map((maintenance) => (
                <Card key={maintenance.id} className="border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{maintenance.title}</CardTitle>
                    <div className="text-sm text-neutral-500">
                      {new Date(maintenance.scheduledStart).toLocaleString()} -{" "}
                      {new Date(maintenance.scheduledEnd).toLocaleString()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {maintenance.description}
                    </p>
                    {maintenance.affectedComponents.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {maintenance.affectedComponents.map((comp) => (
                          <Badge key={comp} variant="outline">
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Incidents</h2>
            <Link
              href={localizeHref(locale, "/status/history")}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline"
            >
              View full history
            </Link>
          </div>
          {recentIncidents.length === 0 ? (
            <Card>
              <CardContent className="py-6">
                <p className="text-center text-neutral-500">No recent incidents to display.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <Card key={incident.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{incident.title}</h3>
                        <p className="text-sm text-neutral-500 mt-1">
                          Resolved {new Date(incident.resolvedAt ?? incident.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                        Resolved
                      </Badge>
                    </div>
                    {incident.updates.length > 0 && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                        {incident.updates[incident.updates.length - 1].message}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-center">
          <p className="text-sm text-neutral-500">
            Last updated: {new Date(summary.updatedAt).toLocaleString()}
          </p>
          <p className="text-sm text-neutral-500 mt-1">
            <Link href={localizeHref(locale, "/")} className="hover:underline">
              Return to JeffreysPrompts
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
