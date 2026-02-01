import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import {
  LayoutDashboard,
  Users,
  Flag,
  Settings,
  ChevronLeft,
  Shield,
  LifeBuoy,
  Scale,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getAdminRoleFromHeaders } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Admin Dashboard | JeffreysPrompts",
  description: "Platform administration and user management.",
  robots: { index: false, follow: false },
};

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/moderation", label: "Moderation", icon: Flag },
  { href: "/admin/metadata", label: "Metadata", icon: Tags },
  { href: "/admin/dmca", label: "DMCA", icon: Scale },
  { href: "/admin/tickets", label: "Support", icon: LifeBuoy },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = getAdminRoleFromHeaders(await headers());
  const roleLabel = role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:flex">
        {/* Header */}
        <div className="flex h-16 items-center gap-2 border-b border-neutral-200 px-6 dark:border-neutral-800">
          <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          <div>
            <span className="text-lg font-semibold text-neutral-900 dark:text-white">
              Admin
            </span>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
              {roleLabel}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <AdminNavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-900 lg:hidden">
          <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          <div>
            <span className="text-lg font-semibold text-neutral-900 dark:text-white">
              Admin
            </span>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
              {roleLabel}
            </div>
          </div>
        </header>

        {/* Mobile navigation */}
        <nav className="flex items-center gap-2 overflow-x-auto border-b border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900 lg:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

function AdminNavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  // Note: In production, use usePathname() to detect active state
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
        "dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
