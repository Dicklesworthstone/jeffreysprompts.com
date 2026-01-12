"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  getSupportCategoryLabel,
  getSupportPriorityLabel,
  type SupportCategory,
  type SupportPriority,
} from "@/lib/support/tickets";

const LOCAL_TICKETS_KEY = "jfpSupportTickets";

type LocalSupportMessage = {
  id: string;
  author: "user" | "support";
  body: string;
  createdAt: string;
};

type LocalSupportTicket = {
  ticketNumber: string;
  name: string;
  email: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: LocalSupportMessage[];
};

function createLocalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 9);
}

function readLocalTickets(): LocalSupportTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(LOCAL_TICKETS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as LocalSupportTicket[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTickets(tickets: LocalSupportTicket[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(tickets));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SupportTicketsPage() {
  const { success, error } = useToast();
  const [tickets, setTickets] = useState<LocalSupportTicket[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyingTicket, setReplyingTicket] = useState<string | null>(null);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupResult, setLookupResult] = useState<LocalSupportTicket | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setTickets(readLocalTickets());
  }, []);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [tickets]);

  const updateLocalTicket = useCallback((updated: LocalSupportTicket) => {
    setTickets((prev) => {
      const next = [
        updated,
        ...prev.filter((ticket) => ticket.ticketNumber !== updated.ticketNumber),
      ];
      writeLocalTickets(next);
      return next;
    });
  }, []);

  const handleReply = useCallback(async () => {
    if (!replyingTicket || !replyMessage.trim()) return;
    const ticket = tickets.find((item) => item.ticketNumber === replyingTicket);
    if (!ticket) return;

    try {
      const response = await fetch("/api/support/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketNumber: ticket.ticketNumber,
          email: ticket.email,
          message: replyMessage,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        error(payload?.error ?? "Unable to send reply.");
        return;
      }

      const now = new Date().toISOString();
      const updated: LocalSupportTicket = {
        ...ticket,
        status: payload?.ticket?.status ?? ticket.status,
        updatedAt: payload?.ticket?.updatedAt ?? now,
        messages: [
          ...ticket.messages,
          {
            id: createLocalId(),
            author: "user",
            body: replyMessage.trim(),
            createdAt: now,
          },
        ],
      };

      updateLocalTicket(updated);
      setReplyMessage("");
      setReplyingTicket(null);
      success("Reply sent.");
    } catch {
      error("Unable to send reply.");
    }
  }, [error, replyMessage, replyingTicket, success, tickets, updateLocalTicket]);

  const handleLookup = useCallback(async () => {
    if (!lookupEmail.trim() || !lookupNumber.trim()) {
      error("Enter both email and ticket number.");
      return;
    }

    try {
      const params = new URLSearchParams({
        email: lookupEmail.trim().toLowerCase(),
        ticketNumber: lookupNumber.trim().toUpperCase(),
      });
      const response = await fetch(`/api/support/tickets?${params.toString()}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        error(payload?.error ?? "Ticket not found.");
        return;
      }

      const ticket = payload?.ticket as LocalSupportTicket | undefined;
      if (!ticket) {
        error("Ticket not found.");
        return;
      }

      setLookupResult(ticket);
      success("Ticket loaded.");
    } catch {
      error("Unable to load ticket.");
    }
  }, [error, lookupEmail, lookupNumber, success]);

  const refreshTickets = useCallback(async () => {
    if (tickets.length === 0) return;
    setRefreshing(true);
    try {
      const results = await Promise.allSettled(
        tickets.map(async (ticket) => {
          const params = new URLSearchParams({
            email: ticket.email,
            ticketNumber: ticket.ticketNumber,
          });
          const response = await fetch(`/api/support/tickets?${params.toString()}`);
          if (!response.ok) return ticket;
          const payload = await response.json().catch(() => null);
          const updated = payload?.ticket as Partial<LocalSupportTicket> | undefined;
          if (!updated) return ticket;
          return {
            ...ticket,
            status: updated.status ?? ticket.status,
            updatedAt: updated.updatedAt ?? ticket.updatedAt,
            messages: Array.isArray(updated.messages) ? updated.messages : ticket.messages,
          };
        })
      );

      const nextTickets = results.map((result, index) =>
        result.status === "fulfilled" ? result.value : tickets[index]
      );
      setTickets(nextTickets);
      writeLocalTickets(nextTickets);
      success("Tickets refreshed.");
    } catch {
      error("Unable to refresh tickets.");
    } finally {
      setRefreshing(false);
    }
  }, [error, success, tickets]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="border-b border-border/60 bg-white dark:bg-neutral-900">
        <div className="container-wide py-10">
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">My Tickets</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400 max-w-2xl">
            View support requests submitted from this device. Need to open a new request?{" "}
            <Link href="/contact" className="font-medium text-foreground hover:underline">
              Contact support
            </Link>.
          </p>
        </div>
      </div>

      <div className="container-wide py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Look up a ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lookup-email">Email</Label>
                <Input
                  id="lookup-email"
                  type="email"
                  value={lookupEmail}
                  onChange={(event) => setLookupEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lookup-ticket">Ticket number</Label>
                <Input
                  id="lookup-ticket"
                  value={lookupNumber}
                  onChange={(event) => setLookupNumber(event.target.value)}
                  placeholder="SUP-20260112-1234"
                />
              </div>
            </div>
            <Button onClick={handleLookup}>Find ticket</Button>

            {lookupResult && (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{lookupResult.status}</Badge>
                  <Badge variant="outline">{lookupResult.category}</Badge>
                  <span className="text-xs">Updated {formatDate(lookupResult.updatedAt)}</span>
                </div>
                <p className="mt-2 font-medium text-foreground">{lookupResult.subject}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Your recent tickets</span>
              {sortedTickets.length > 0 && (
                <Button size="sm" variant="outline" onClick={refreshTickets} disabled={refreshing}>
                  {refreshing ? "Refreshing..." : "Refresh status"}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedTickets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                No tickets yet. Submit a request and it will show up here.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedTickets.map((ticket) => (
                  <div key={ticket.ticketNumber} className="rounded-xl border border-border/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{ticket.ticketNumber}</p>
                        <h3 className="text-lg font-semibold text-foreground">{ticket.subject}</h3>
                        <p className="text-xs text-muted-foreground">
                          Last updated {formatDate(ticket.updatedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{ticket.status}</Badge>
                        <Badge variant="outline">{getSupportCategoryLabel(ticket.category)}</Badge>
                        <Badge variant="outline">{getSupportPriorityLabel(ticket.priority)}</Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpanded(expanded === ticket.ticketNumber ? null : ticket.ticketNumber)}
                      >
                        {expanded === ticket.ticketNumber ? "Hide details" : "View details"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setExpanded(ticket.ticketNumber);
                          setReplyingTicket(ticket.ticketNumber);
                        }}
                      >
                        Reply
                      </Button>
                    </div>

                    {expanded === ticket.ticketNumber && (
                      <div className="mt-4 space-y-4">
                        <div className="space-y-3">
                          {ticket.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`rounded-lg border border-border/60 p-3 text-sm ${
                                msg.author === "support"
                                  ? "bg-indigo-50/70 text-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-100"
                                  : "bg-muted/40"
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{msg.author === "support" ? "Support" : "You"}</span>
                                <span>{formatDate(msg.createdAt)}</span>
                              </div>
                              <p className="mt-2 text-foreground">{msg.body}</p>
                            </div>
                          ))}
                        </div>

                        {ticket.status !== "closed" && (
                          <div className="space-y-3">
                            <Label htmlFor={`reply-${ticket.ticketNumber}`}>Add a reply</Label>
                            <Textarea
                              id={`reply-${ticket.ticketNumber}`}
                              value={replyingTicket === ticket.ticketNumber ? replyMessage : ""}
                              onChange={(event) => {
                                setReplyingTicket(ticket.ticketNumber);
                                setReplyMessage(event.target.value);
                              }}
                              rows={4}
                              placeholder="Share any updates or questions."
                            />
                            <Button
                              size="sm"
                              onClick={handleReply}
                              disabled={replyingTicket !== ticket.ticketNumber || !replyMessage.trim()}
                            >
                              Send reply
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
