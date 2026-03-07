"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localizeHref } from "@/i18n/config";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to get started with curated prompts.",
    highlight: false,
    features: [
      "Full prompt library access",
      "BM25-powered search",
      "Copy to clipboard",
      "CLI read access",
      "Prompt bundles",
    ],
    ctaLabel: "Browse Prompts",
    ctaHref: "/",
    ctaVariant: "outline" as const,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$10",
    period: "per month",
    description: "For power users who need advanced features and priority access.",
    highlight: true,
    features: [
      "Everything in Free",
      "Unlimited collections",
      "Swap Meet marketplace",
      "Analytics dashboard",
      "Priority support",
      "Early access to new prompts",
    ],
    ctaLabel: "Go Pro",
    ctaHref: "https://pro.jeffreysprompts.com",
    ctaVariant: "default" as const,
  },
];

export function PricingPreviewSection() {
  const locale = useLocale();

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-3 py-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 rounded-full mb-4">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            Start free, upgrade when you&apos;re ready. No hidden fees, no surprises.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              <div
                className={cn(
                  "relative h-full p-8 rounded-2xl border transition-all duration-300",
                  plan.highlight
                    ? "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800/50 shadow-xl shadow-indigo-500/10"
                    : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:shadow-lg"
                )}
              >
                {/* Best value badge */}
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold shadow-lg">
                    <Sparkles className="w-4 h-4" />
                    Best Value
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-neutral-900 dark:text-white">
                      {plan.price}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      /{plan.period}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  asChild
                  variant={plan.ctaVariant}
                  size="lg"
                  className="w-full"
                >
                  {plan.ctaHref.startsWith("/") ? (
                    <Link href={localizeHref(locale, plan.ctaHref)}>{plan.ctaLabel}</Link>
                  ) : (
                    <a href={plan.ctaHref} target="_blank" rel="noopener noreferrer">
                      {plan.ctaLabel}
                    </a>
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View full pricing link */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-10"
        >
          <Link
            href={localizeHref(locale, "/pricing")}
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
          >
            View full pricing details
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
