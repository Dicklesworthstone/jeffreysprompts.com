import Link from "next/link";
import { Mail, Headphones, Clock, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/support/ContactForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUPPORT_CATEGORIES, SUPPORT_EMAIL } from "@/lib/support/tickets";

export const metadata = {
  title: "Contact Support",
  description: "Get help with JeffreysPrompts.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-white to-white dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900">
      <div className="border-b border-border/60">
        <div className="container-wide py-12">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-900/30 px-3 py-1 rounded-full w-fit">
              <Headphones className="h-4 w-4" />
              Contact support
            </div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-white">
              How can I help?
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
              I respond to support requests within one business day. Share the details below and I&apos;ll
              follow up with next steps.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {SUPPORT_EMAIL}
              </span>
              <span>•</span>
              <Link href="/help" className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white">
                Visit the Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-wide py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Support request</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactForm />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Response times
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Standard requests are answered within one business day.</p>
                <p>Urgent issues are prioritized within a few hours during business time.</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Mon-Fri, 9am-5pm ET</Badge>
                  <Badge variant="outline">Async support via email</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  What to include
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Help me resolve issues faster by sharing:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Steps to reproduce or a clear description of the problem.</li>
                  <li>Links, screenshots, or prompt IDs if relevant.</li>
                  <li>Your preferred follow-up email address.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common topics</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {SUPPORT_CATEGORIES.map((category) => (
                  <Badge key={category.value} variant="outline">
                    {category.label}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
