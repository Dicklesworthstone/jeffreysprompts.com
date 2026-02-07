"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  SUPPORT_CATEGORIES,
  SUPPORT_PRIORITIES,
  SUPPORT_EMAIL,
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
  accessToken: string;
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

export function ContactForm() {
  const { success, error } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<SupportCategory>("billing");
  const [priority, setPriority] = useState<SupportPriority>("normal");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ticketInfo, setTicketInfo] = useState<LocalSupportTicket | null>(null);

  const emailIsValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const canSubmit = Boolean(name.trim() && emailIsValid && subject.trim() && message.trim());

  const resetForm = useCallback(() => {
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setCategory("billing");
    setPriority("normal");
    setCompany("");
    setFormError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      setFormError("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          category,
          priority,
          company,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        error(payload?.error ?? "Unable to submit your request.");
        return;
      }

      const createdAt = payload?.ticket?.createdAt ?? new Date().toISOString();
      const localTicket: LocalSupportTicket = {
        ticketNumber: payload?.ticket?.ticketNumber ?? "",
        accessToken: payload?.ticket?.accessToken ?? "",
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: subject.trim(),
        category,
        priority,
        status: payload?.ticket?.status ?? "open",
        createdAt,
        updatedAt: createdAt,
        messages: [
          {
            id: createLocalId(),
            author: "user",
            body: message.trim(),
            createdAt,
          },
        ],
      };

      const existing = readLocalTickets();
      writeLocalTickets([
        localTicket,
        ...existing.filter((ticket) => ticket.ticketNumber !== localTicket.ticketNumber),
      ]);

      setTicketInfo(localTicket);
      resetForm();
      success("Support request submitted.");
    } catch {
      error("Unable to submit your request.");
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    category,
    company,
    email,
    error,
    message,
    name,
    priority,
    resetForm,
    subject,
    success,
  ]);

  if (ticketInfo) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-5 w-5" />
          <div className="space-y-2">
            <p className="font-semibold">We received your request.</p>
            <p className="text-sm text-emerald-800/90 dark:text-emerald-200/90">
              Ticket <span className="font-mono">{ticketInfo.ticketNumber}</span> is now open.
              A confirmation email will follow shortly.
            </p>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-100/80">
              Access token: <span className="font-mono break-all">{ticketInfo.accessToken}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{getSupportCategoryLabel(ticketInfo.category)}</Badge>
              <Badge variant="outline">{getSupportPriorityLabel(ticketInfo.priority)}</Badge>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
          Keep your ticket number handy for updates. You can also view it in your
          <Link href="/settings/tickets" className="font-medium text-foreground hover:underline">
            {" "}My Tickets
          </Link>{" "}
          page on this device.
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setTicketInfo(null)} variant="outline">
            Submit another request
          </Button>
          <Button asChild>
            <Link href="/settings/tickets">View my tickets</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="support-name">Name</Label>
          <Input
            id="support-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Jane Doe"
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-email">Email</Label>
          <Input
            id="support-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-subject">Subject</Label>
        <Input
          id="support-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="How can we help?"
          autoComplete="off"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="support-category">Category</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as SupportCategory)}>
            <SelectTrigger id="support-category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_CATEGORIES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-priority">Priority</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as SupportPriority)}>
            <SelectTrigger id="support-priority">
              <SelectValue placeholder="Select a priority" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_PRIORITIES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-message">Message</Label>
        <Textarea
          id="support-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Share the details so we can help fast."
          rows={6}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-attachment">Attachments (optional)</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input id="support-attachment" type="file" disabled />
          <Badge variant="secondary">Coming soon</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          For now, include links or screenshots directly in your message.
        </p>
      </div>

      <div className="hidden" aria-hidden="true">
        <Label htmlFor="support-company">Company</Label>
        <Input
          id="support-company"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          placeholder="Leave blank"
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      {formError && (
        <div role="alert" aria-live="assertive" className="text-sm text-destructive">
          {formError}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex items-start gap-2 text-foreground">
          <Mail className="mt-0.5 h-4 w-4" />
          <span>
            Prefer email? Reach us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium hover:underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </span>
        </div>
        <span>Typical response time: 1 business day.</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSubmit || submitting} loading={submitting}>
          Submit request
        </Button>
        <span className="text-xs text-muted-foreground">
          We will email you a confirmation and ticket ID.
        </span>
      </div>
    </form>
  );
}
