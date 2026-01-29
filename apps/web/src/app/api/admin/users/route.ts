import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";

/**
 * GET /api/admin/users
 * Returns paginated list of users with optional filtering.
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search by email or name
 * - tier: Filter by tier (free, premium)
 * - status: Filter by status (active, suspended)
 * - sort: Sort field (joinedAt, lastActive, name)
 * - order: Sort order (asc, desc)
 *
 * In production, this would query the database with proper auth.
 */
export async function GET(request: NextRequest) {
  const auth = checkAdminPermission(request, "users.view");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json(
      { error: auth.reason ?? "forbidden" },
      { status }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const parsedPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const parsedLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 20;
  const search = searchParams.get("search") ?? "";
  const tier = searchParams.get("tier") ?? "all";
  const status = searchParams.get("status") ?? "all";

  // Mock data - in production, this would be a database query
  const mockUsers = [
    {
      id: "1",
      email: "alice@example.com",
      name: "Alice Johnson",
      tier: "premium",
      status: "active",
      joinedAt: "2024-11-15T10:30:00Z",
      lastActive: "2026-01-11T13:45:00Z",
      contentCount: 42,
    },
    {
      id: "2",
      email: "bob@example.com",
      name: "Bob Smith",
      tier: "free",
      status: "active",
      joinedAt: "2024-12-01T14:20:00Z",
      lastActive: "2026-01-10T09:15:00Z",
      contentCount: 5,
    },
    {
      id: "3",
      email: "charlie@example.com",
      name: "Charlie Brown",
      tier: "premium",
      status: "active",
      joinedAt: "2025-01-02T08:00:00Z",
      lastActive: "2026-01-11T15:30:00Z",
      contentCount: 127,
    },
    {
      id: "4",
      email: "dave@example.com",
      name: "Dave Wilson",
      tier: "free",
      status: "suspended",
      joinedAt: "2024-10-20T16:45:00Z",
      lastActive: "2026-01-04T11:00:00Z",
      contentCount: 0,
    },
    {
      id: "5",
      email: "eve@example.com",
      name: "Eve Martinez",
      tier: "premium",
      status: "active",
      joinedAt: "2025-01-10T12:00:00Z",
      lastActive: "2026-01-11T15:39:00Z",
      contentCount: 8,
    },
  ];

  // Apply filters (simplified for mock data)
  let filteredUsers = mockUsers;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredUsers = filteredUsers.filter(
      (u) =>
        u.email.toLowerCase().includes(searchLower) ||
        u.name.toLowerCase().includes(searchLower)
    );
  }
  if (tier !== "all") {
    filteredUsers = filteredUsers.filter((u) => u.tier === tier);
  }
  if (status !== "all") {
    filteredUsers = filteredUsers.filter((u) => u.status === status);
  }

  return NextResponse.json({
    users: filteredUsers,
    pagination: {
      page,
      limit,
      total: 1234, // Mock total
      totalPages: Math.ceil(1234 / limit),
    },
    filters: {
      search,
      tier,
      status,
    },
  });
}
