import Link from "next/link";
import { Ticket, User, Bell, Palette, Shield, ChevronRight, Link2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Settings",
  description: "Manage your JeffreysPrompts preferences.",
};

interface SettingCardProps {
  href?: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
}

function SettingCard({ href, icon, iconBg, title, description, badge, disabled }: SettingCardProps) {
  const content = (
    <Card hover={disabled ? "none" : "lift"} className={disabled ? "border-dashed opacity-70" : ""}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon with colored background */}
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {/* Arrow indicator for clickable cards */}
          {href && !disabled && (
            <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className="group block">
        {content}
      </Link>
    );
  }

  return content;
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-border/60 bg-white dark:bg-neutral-900">
        <div className="container-wide py-10">
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Manage your support tickets and account preferences.
          </p>
        </div>
      </div>

      <div className="container-wide py-10">
        {/* Sharing Section */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Sharing
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SettingCard
              href="/settings/shared"
              icon={<Link2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />}
              iconBg="bg-violet-100 dark:bg-violet-900/30"
              title="My Shared Links"
              description="Manage your active share links for prompts and packs."
            />
          </div>
        </div>

        {/* Support Section */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Support
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SettingCard
              href="/settings/tickets"
              icon={<Ticket className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />}
              iconBg="bg-indigo-100 dark:bg-indigo-900/30"
              title="My Tickets"
              description="View support requests submitted from this device."
            />
          </div>
        </div>

        {/* Account Section */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Account
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SettingCard
              icon={<User className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />}
              iconBg="bg-emerald-100 dark:bg-emerald-900/30"
              title="Profile"
              description="Manage your public profile and personal information."
              badge="Coming Soon"
              disabled
            />
            <SettingCard
              icon={<Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
              iconBg="bg-blue-100 dark:bg-blue-900/30"
              title="Privacy"
              description="Control your data and privacy preferences."
              badge="Coming Soon"
              disabled
            />
          </div>
        </div>

        {/* Preferences Section */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Preferences
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SettingCard
              href="/history"
              icon={<Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
              iconBg="bg-amber-100 dark:bg-amber-900/30"
              title="Recently Viewed"
              description="Review the prompts and searches you've opened."
            />
            <SettingCard
              icon={<Bell className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
              iconBg="bg-amber-100 dark:bg-amber-900/30"
              title="Notifications"
              description="Configure email and push notification settings."
              badge="Coming Soon"
              disabled
            />
            <SettingCard
              icon={<Palette className="h-6 w-6 text-purple-600 dark:text-purple-400" />}
              iconBg="bg-purple-100 dark:bg-purple-900/30"
              title="Appearance"
              description="Customize the look and feel of the interface."
              badge="Coming Soon"
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  );
}
