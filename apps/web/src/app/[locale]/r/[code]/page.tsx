import type { Metadata } from "next";
import Link from "next/link";
import { Gift, ArrowRight, Sparkles, Check } from "lucide-react";
import { getReferralCodeByCode, REFERRAL_CONSTANTS } from "@/lib/referral/referral-store";
import { localizeHref } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ReferralLandingPageProps {
  params: Promise<{ locale: string; code: string }>;
}

export async function generateMetadata({ params }: ReferralLandingPageProps): Promise<Metadata> {
  const { code } = await params;
  const referralCode = getReferralCodeByCode(code);

  if (!referralCode) {
    return {
      title: "Referral Link Unavailable - JeffreysPrompts",
      description: "This referral link is invalid or has expired. You can still explore the free JeffreysPrompts library.",
    };
  }

  return {
    title: "You've Been Invited! - JeffreysPrompts",
    description: `Get a ${REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS}-day trial or ${REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT}% off your first month of JeffreysPrompts Premium.`,
    openGraph: {
      title: "You've Been Invited to JeffreysPrompts!",
      description: `Your friend invited you to JeffreysPrompts. Sign up now and get a ${REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS}-day trial or ${REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT}% off.`,
    },
  };
}

export default async function ReferralLandingPage({ params }: ReferralLandingPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const code = resolvedParams.code;
  const normalizedCode = code.trim().toUpperCase();
  const referralCode = getReferralCodeByCode(normalizedCode);
  const homeHref = localizeHref(locale, "/");

  if (!referralCode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white dark:from-neutral-950 dark:to-neutral-900">
        <div className="container-wide py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Gift className="size-4" />
              Referral Link Unavailable
            </div>

            <h1 className="mb-4 text-4xl font-bold text-neutral-900 dark:text-white sm:text-5xl">
              This Referral Link Isn&apos;t Active
            </h1>

            <p className="mb-8 text-lg text-neutral-600 dark:text-neutral-400">
              The referral code you followed is invalid or has expired. You can still browse the
              free JeffreysPrompts library and explore the prompt collection directly.
            </p>

            <div className="flex justify-center">
              <Button size="xl" variant="glow" asChild>
                <Link href={homeHref}>
                  Explore JeffreysPrompts
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm">
              <span className="text-muted-foreground">Referral code:</span>
              <span className="font-mono font-bold">{normalizedCode}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const claimHref = localizeHref(locale, `/?ref=${encodeURIComponent(referralCode.code)}`);

  const benefits = [
    `${REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS}-day free trial (instead of 14 days)`,
    `${REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT}% off your first month`,
    "Access to premium prompts and bundles",
    "Priority support",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      {/* Hero Section */}
      <div className="container-wide py-16 sm:py-24">
        <div className="text-center max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium mb-6">
            <Gift className="size-4" />
            You&apos;ve Been Invited!
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
            Get{" "}
            <span className="text-violet-600 dark:text-violet-400">
              {REFERRAL_CONSTANTS.REFEREE_EXTENDED_TRIAL_DAYS} Days Free
            </span>{" "}
            or{" "}
            <span className="text-violet-600 dark:text-violet-400">
              {REFERRAL_CONSTANTS.REFEREE_DISCOUNT_PERCENT}% Off
            </span>
          </h1>

          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
            Your friend thinks you&apos;ll love JeffreysPrompts - the ultimate collection of
            AI prompts to supercharge your productivity.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" variant="glow" asChild>
              <Link href={claimHref}>
                <Sparkles className="size-5" />
                Claim Your Reward
                <ArrowRight className="size-5" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href={homeHref}>
                Learn More About JeffreysPrompts
              </Link>
            </Button>
          </div>

          {/* Referral Code Display */}
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-sm">
            <span className="text-muted-foreground">Your referral code:</span>
            <span className="font-mono font-bold">{referralCode.code}</span>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container-wide pb-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Gift className="size-5 text-violet-500" />
              Your Exclusive Benefits
            </CardTitle>
            <CardDescription>
              Sign up using this referral link and get:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t text-center">
              <Button variant="glow" size="lg" asChild>
                <Link href={claimHref}>
                  Get Started Now
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Proof / Trust Section */}
      <div className="container-wide pb-16">
        <div className="text-center max-w-xl mx-auto">
          <p className="text-sm text-muted-foreground">
            JeffreysPrompts is trusted by thousands of professionals, developers, and creators
            to craft better prompts for AI assistants. Join the community today!
          </p>
        </div>
      </div>
    </div>
  );
}
