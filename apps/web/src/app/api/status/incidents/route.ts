import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  listIncidents,
  getIncident,
  getResolvedIncidents,
} from "@/lib/status";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") ?? "all";
  const parsedLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 20;
  const id = searchParams.get("id");

  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
  };

  // Get single incident by ID
  if (id) {
    const incident = getIncident(id);
    if (!incident) {
      return NextResponse.json({ error: "Incident not found." }, { status: 404 });
    }
    return NextResponse.json({ incident }, { headers: cacheHeaders });
  }

  // Get resolved incidents (for history)
  if (status === "resolved") {
    const incidents = getResolvedIncidents(limit);
    return NextResponse.json(
      {
        incidents,
        total: incidents.length,
      },
      { headers: cacheHeaders }
    );
  }

  // Get all incidents with optional status filter
  const validStatuses = ["all", "investigating", "identified", "monitoring", "resolved"];
  const statusFilter = validStatuses.includes(status)
    ? (status as "all" | "investigating" | "identified" | "monitoring" | "resolved")
    : "all";

  const incidents = listIncidents({ status: statusFilter, limit });

  return NextResponse.json(
    {
      incidents,
      total: incidents.length,
    },
    { headers: cacheHeaders }
  );
}
