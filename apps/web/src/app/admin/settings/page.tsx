import type { Metadata } from "next";
import { Bell, Shield, Database, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const metadata: Metadata = {
  title: "Settings | Admin",
  description: "Platform configuration and settings.",
};

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Configure platform-wide settings and preferences
        </p>
      </div>

      {/* Settings sections */}
      <div className="grid gap-6">
        {/* General settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-zinc-500" />
              General
            </CardTitle>
            <CardDescription>
              Basic platform configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow
              label="Maintenance Mode"
              description="When enabled, users see a maintenance page instead of the site."
              action={<Switch />}
            />
            <SettingRow
              label="Registration"
              description="Allow new users to create accounts."
              action={<Switch defaultChecked />}
            />
            <SettingRow
              label="Public Swap Meet"
              description="Allow users to browse community prompts without logging in."
              action={<Switch defaultChecked />}
            />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-zinc-500" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure admin notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow
              label="New Reports"
              description="Email admins when new content is reported."
              action={<Switch defaultChecked />}
            />
            <SettingRow
              label="New Subscriptions"
              description="Notify when users upgrade to premium."
              action={<Switch />}
            />
            <SettingRow
              label="Daily Digest"
              description="Send daily summary of platform activity."
              action={<Switch defaultChecked />}
            />
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-zinc-500" />
              Security
            </CardTitle>
            <CardDescription>
              Security and access control settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow
              label="Two-Factor Authentication"
              description="Require 2FA for all admin accounts."
              action={<Switch />}
              badge="Recommended"
            />
            <SettingRow
              label="Rate Limiting"
              description="Limit API requests to prevent abuse."
              action={<Switch defaultChecked />}
            />
            <SettingRow
              label="Audit Logging"
              description="Log all admin actions for compliance."
              action={<Switch defaultChecked />}
            />
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-zinc-500" />
              Data Management
            </CardTitle>
            <CardDescription>
              Database and export options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow
              label="Export Users"
              description="Download a CSV of all user accounts."
              action={<Button variant="outline" size="sm">Export</Button>}
            />
            <SettingRow
              label="Export Content"
              description="Download all prompts and collections."
              action={<Button variant="outline" size="sm">Export</Button>}
            />
            <SettingRow
              label="Database Backup"
              description="Last backup: 2 hours ago"
              action={<Button variant="outline" size="sm">Backup Now</Button>}
            />
          </CardContent>
        </Card>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  action,
  badge,
}: {
  label: string;
  description: string;
  action: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-900 dark:text-white">
            {label}
          </span>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
