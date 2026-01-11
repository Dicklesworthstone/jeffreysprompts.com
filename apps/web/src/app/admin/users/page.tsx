import type { Metadata } from "next";
import {
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Shield,
  Ban,
  Eye,
  ChevronLeft,
  ChevronRight,
  Crown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "User Management | Admin",
  description: "Manage platform users and subscriptions.",
};

// Mock data - in production, this would come from API
const mockUsers = [
  {
    id: "1",
    email: "alice@example.com",
    name: "Alice Johnson",
    tier: "premium",
    status: "active",
    joinedAt: "2024-11-15",
    lastActive: "2 hours ago",
  },
  {
    id: "2",
    email: "bob@example.com",
    name: "Bob Smith",
    tier: "free",
    status: "active",
    joinedAt: "2024-12-01",
    lastActive: "1 day ago",
  },
  {
    id: "3",
    email: "charlie@example.com",
    name: "Charlie Brown",
    tier: "premium",
    status: "active",
    joinedAt: "2025-01-02",
    lastActive: "5 minutes ago",
  },
  {
    id: "4",
    email: "dave@example.com",
    name: "Dave Wilson",
    tier: "free",
    status: "suspended",
    joinedAt: "2024-10-20",
    lastActive: "1 week ago",
  },
  {
    id: "5",
    email: "eve@example.com",
    name: "Eve Martinez",
    tier: "premium",
    status: "active",
    joinedAt: "2025-01-10",
    lastActive: "Just now",
  },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
          User Management
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Search, view, and manage user accounts
        </p>
      </div>

      {/* Filters and search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                type="search"
                placeholder="Search by email or name..."
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <select className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <option value="all">All tiers</option>
                <option value="premium">Premium</option>
                <option value="free">Free</option>
              </select>
              <select className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Users</span>
            <Badge variant="secondary">
              {mockUsers.length} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {mockUsers.map((user) => (
                  <UserRow key={user.id} user={user} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Showing 1-5 of 1,234 users
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Page 1 of 247
              </span>
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UserRow({
  user,
}: {
  user: {
    id: string;
    email: string;
    name: string;
    tier: string;
    status: string;
    joinedAt: string;
    lastActive: string;
  };
}) {
  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-medium text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
            {user.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">
              {user.name}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Badge
          variant={user.tier === "premium" ? "default" : "secondary"}
          className={
            user.tier === "premium"
              ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400"
              : ""
          }
        >
          {user.tier === "premium" && <Crown className="mr-1 h-3 w-3" />}
          {user.tier}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <Badge
          variant="secondary"
          className={
            user.status === "active"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
          }
        >
          {user.status}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
        {user.joinedAt}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-zinc-600 dark:text-zinc-400">
        {user.lastActive}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" title="View user">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" title="Email user">
            <Mail className="h-4 w-4" />
          </Button>
          {user.status === "active" ? (
            <Button variant="ghost" size="sm" title="Suspend user">
              <Ban className="h-4 w-4 text-red-500" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" title="Unsuspend user">
              <Shield className="h-4 w-4 text-emerald-500" />
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
