"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Filter,
  Inbox,
  Mail,
  CheckCircle2,
  XCircle,
  MessageSquare,
  StickyNote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface SupportTicket {
  ticketNumber: string;
  name: string;
  email: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketResponse {
  tickets: SupportTicket[];
  stats: Record<string, number>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function statusVariant(status: string) {
  switch (status) {
    case "open":
      return "default";
    case "pending":
      return "secondary";
    case "resolved":
      return "outline";
    case "closed":
      return "destructive";
    default:
      return "secondary";
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AdminTicketsPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    priority: "all",
    search: "",
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams({
        status: filters.status,
        category: filters.category,
        priority: filters.priority,
        search: filters.search,
      });
      const response = await fetch(`/api/admin/tickets?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as TicketResponse;

      if (!response.ok) {
        setLoadError((payload as { error?: string })?.error ?? "Unable to load tickets.");
        setTickets([]);
        return;
      }

      setTickets(payload.tickets ?? []);
      setStats(payload.stats ?? {});
    } catch {
      setLoadError("Unable to load tickets.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const totals = useMemo(() => {
    return {
      open: stats.open ?? 0,
      pending: stats.pending ?? 0,
      resolved: stats.resolved ?? 0,
      closed: stats.closed ?? 0,
    };
  }, [stats]);

  const updateTicket = useCallback(
    async (ticketNumber: string, update: { status?: string; reply?: string; note?: string }) => {
      try {
        const response = await fetch("/api/admin/tickets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketNumber, ...update }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          toastError((payload as { error?: string })?.error ?? "Unable to update ticket.");
          return;
        }

        setTickets((prev) =>
          prev.map((ticket) => (ticket.ticketNumber === ticketNumber ? payload.ticket : ticket))
        );
        toastSuccess("Ticket updated.");
        loadTickets();
      } catch {
        toastError("Unable to update ticket.");
      }
    },
    [loadTickets, toastError, toastSuccess]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
          Support Tickets
        </h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">
          Triage incoming support requests and respond quickly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="text-2xl font-semibold text-foreground">{totals.open}</p>
            </div>
            <Inbox className="h-5 w-5 text-indigo-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-2xl font-semibold text-foreground">{totals.pending}</p>
            </div>
            <MessageSquare className="h-5 w-5 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Resolved</p>
              <p className="text-2xl font-semibold text-foreground">{totals.resolved}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Closed</p>
              <p className="text-2xl font-semibold text-foreground">{totals.closed}</p>
            </div>
            <XCircle className="h-5 w-5 text-rose-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                type="search"
                placeholder="Search by ticket, email, or subject..."
                className="pl-10"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <select
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                value={filters.category}
                onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
              >
                <option value="all">All categories</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="feedback">Feedback</option>
                <option value="feature">Feature request</option>
                <option value="bug">Bug report</option>
                <option value="account">Account help</option>
                <option value="other">Other</option>
              </select>
              <select
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                value={filters.priority}
                onChange={(event) => setFilters((prev) => ({ ...prev, priority: event.target.value }))}
              >
                <option value="all">All priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tickets</span>
            <Badge variant="secondary">{tickets.length} showing</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading tickets...</div>
          ) : loadError ? (
            <div className="p-6 text-sm text-destructive">{loadError}</div>
          ) : tickets.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No tickets match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Ticket
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-neutral-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {tickets.map((ticket) => (
                    <tr key={ticket.ticketNumber} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{ticket.ticketNumber}</p>
                          <p className="font-medium text-foreground">{ticket.subject}</p>
                          <p className="text-xs text-muted-foreground">{ticket.category}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{ticket.name}</p>
                          <p className="text-xs text-muted-foreground">{ticket.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusVariant(ticket.status)}>{ticket.status}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline">{ticket.priority}</Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(ticket.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTicket(ticket.ticketNumber, { status: "resolved" })}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateTicket(ticket.ticketNumber, { status: "closed" })}
                          >
                            <XCircle className="h-4 w-4" />
                            Close
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const reply = window.prompt("Support reply to send:");
                              if (reply) {
                                updateTicket(ticket.ticketNumber, { reply });
                              }
                            }}
                          >
                            <Mail className="h-4 w-4" />
                            Reply
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const note = window.prompt("Internal note (not shared with customer):");
                              if (note) {
                                updateTicket(ticket.ticketNumber, { note });
                              }
                            }}
                          >
                            <StickyNote className="h-4 w-4" />
                            Note
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
