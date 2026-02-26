import Link from "next/link";
import type { Metadata } from "next";
import { Check, CreditCard, Shield, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing | JeffreysPrompts",
  description:
    "Simple, transparent pricing for the prompt library built for AI power users.",
};

const PRO_URL = process.env.NEXT_PUBLIC_PRO_URL ?? "https://pro.jeffreysprompts.com";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "Explore the library and build your workflow.",
    ctaLabel: "Browse prompts",
    ctaHref: "/",
    highlight: false,
    features: [
      "Official prompt library",
      "Basic search + filters",
      "CLI access (read-only)",
      "Prompt bundles + workflows",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$10",
    description: "Everything you need for deep prompt work.",
    ctaLabel: "Go Pro",
    ctaHref: PRO_URL,
    highlight: true,
    features: [
      "Unlimited prompt creation",
      "Prompt packs + skills",
      "Swap Meet access",
      "Collections + advanced filters",
      "Analytics dashboard",
      "Priority support",
    ],
  },
];

const comparisonRows = [
  { feature: "Official prompt library", free: true, pro: true },
  { feature: "Basic search + filters", free: true, pro: true },
  { feature: "CLI read-only access", free: true, pro: true },
  { feature: "Unlimited prompt creation", free: false, pro: true },
  { feature: "Prompt packs + skills", free: false, pro: true },
  { feature: "Swap Meet access", free: false, pro: true },
  { feature: "Collections + advanced filters", free: false, pro: true },
  { feature: "Analytics dashboard", free: false, pro: true },
  { feature: "Priority support", free: false, pro: true },
];

const faqs = [
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. You can downgrade or cancel whenever you want. Your data stays intact.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "The free tier stays available, and Pro upgrades unlock premium features immediately.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "All major cards via Stripe. Billing is monthly with a receipt every cycle.",
  },
  {
    question: "Do you offer team plans?",
    answer:
      "Team plans are coming soon. Reach out if you need multi-seat access today.",
  },
];

const trustSignals = [
  {
    title: "Secure payments",
    description: "Stripe-backed billing with bank-grade security.",
    icon: CreditCard,
  },
  {
    title: "Cancel anytime",
    description: "No lock-in. Keep using the free tier after canceling.",
    icon: Shield,
  },
  {
    title: "Built for power users",
    description: "Fast search, tight UX, and CLI workflows that scale.",
    icon: Zap,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/60 via-white to-white dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900">
      <div className="border-b border-neutral-200/70 dark:border-neutral-800/70">
        <div className="container mx-auto px-4 py-14">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              Simple, transparent pricing
            </Badge>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-white sm:text-5xl">
              Pricing that scales with your workflow
            </h1>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">
              Start for free, upgrade when you want deeper tooling. Pro unlocks everything
              you need for serious prompt engineering.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <a href={PRO_URL} rel="noopener noreferrer">
                  Go Pro
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">Browse prompts</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <section className="container mx-auto px-4 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative overflow-hidden border-neutral-200/80 dark:border-neutral-800/70",
                plan.highlight &&
                  "border-violet-300 bg-violet-50/70 shadow-xl shadow-violet-500/10 dark:border-violet-500/40 dark:bg-violet-950/30"
              )}
            >
              {plan.highlight && (
                <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">
                  <Sparkles className="h-3 w-3" />
                  Best value
                </div>
              )}
              <CardHeader className="space-y-3">
                <CardTitle className="text-2xl text-neutral-900 dark:text-white">
                  {plan.name}
                </CardTitle>
                <p className="text-neutral-600 dark:text-neutral-400">{plan.description}</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold text-neutral-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="pb-1 text-sm text-neutral-500 dark:text-neutral-400">
                    / month
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  size="lg"
                  variant={plan.highlight ? "default" : "outline"}
                  className="w-full"
                >
                  {plan.ctaHref.startsWith("/") ? (
                    <Link href={plan.ctaHref}>{plan.ctaLabel}</Link>
                  ) : (
                    <a
                      href={plan.ctaHref}
                      rel="noopener noreferrer"
                      data-analytics={plan.id === "pro" ? "begin_checkout" : undefined}
                      data-analytics-plan={plan.id === "pro" ? "pro" : undefined}
                      data-analytics-source="pricing"
                    >
                      {plan.ctaLabel}
                    </a>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14">
        <div className="rounded-2xl border border-neutral-200/70 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-900/60">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Feature comparison
          </h2>
          <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200/70 dark:border-neutral-800/70">
            <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] bg-neutral-100/60 text-sm font-semibold text-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-200">
              <div className="px-4 py-3">Feature</div>
              <div className="px-4 py-3 text-center">Free</div>
              <div className="px-4 py-3 text-center">Pro</div>
            </div>
            <div className="divide-y divide-neutral-200/70 text-sm text-neutral-600 dark:divide-neutral-800/70 dark:text-neutral-300">
              {comparisonRows.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-[1.4fr_0.8fr_0.8fr] items-center"
                >
                  <div className="px-4 py-3">{row.feature}</div>
                  <div className="px-4 py-3 text-center">
                    {row.free ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-500" />
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </div>
                  <div className="px-4 py-3 text-center">
                    {row.pro ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-500" />
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-neutral-200/70 bg-white/80 p-6 dark:border-neutral-800/70 dark:bg-neutral-900/60">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">FAQ</h2>
            <div className="mt-6 space-y-4">
              {faqs.map((item) => (
                <div key={item.question} className="space-y-2">
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                    {item.question}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {trustSignals.map((signal) => (
              <Card key={signal.title} className="border-neutral-200/70 dark:border-neutral-800/70">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
                    <signal.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                      {signal.title}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {signal.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-violet-200/70 bg-violet-50/70 dark:border-violet-500/30 dark:bg-violet-950/40">
              <CardContent className="p-5">
                <h3 className="text-base font-semibold text-violet-900 dark:text-violet-100">
                  Need a team plan?
                </h3>
                <p className="mt-1 text-sm text-violet-800/80 dark:text-violet-200/80">
                  Reach out and I&apos;ll set up a plan that fits your workflow.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <a href="mailto:jeff@jeffreysprompts.com">Get in touch</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
