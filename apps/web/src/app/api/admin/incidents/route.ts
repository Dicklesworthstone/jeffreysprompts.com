import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import {
  createIncident,
  addIncidentUpdate,
  updateIncidentImpact,
  getIncident,
  listIncidents,
  getIncidentStats,
  type IncidentStatus,
  type IncidentImpact,
} from "@/lib/status";

const VALID_IMPACTS: IncidentImpact[] = ["none", "minor", "major", "critical"];
const VALID_STATUSES: IncidentStatus[] = ["investigating", "identified", "monitoring", "resolved"];
const ADMIN_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const auth = checkAdminPermission(request, "support.view");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.reason ?? "forbidden" }, { status });
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action === "stats") {
    const stats = getIncidentStats();
    return NextResponse.json({ stats }, { headers: ADMIN_HEADERS });
  }

  const incidents = listIncidents({ limit: 100 });
  return NextResponse.json(
    { incidents, total: incidents.length },
    { headers: ADMIN_HEADERS }
  );
}

export async function POST(request: NextRequest) {
  const auth = checkAdminPermission(request, "support.manage");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.reason ?? "forbidden" }, { status });
  }

  let payload: {
    title?: string;
    impact?: IncidentImpact;
    affectedComponents?: string[];
    message?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { title, impact, affectedComponents, message } = payload;

  if (!title || !impact || !message) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!VALID_IMPACTS.includes(impact)) {
    return NextResponse.json({ error: "Invalid impact level." }, { status: 400 });
  }

  const incident = createIncident({
    title: title.trim(),
    impact,
    affectedComponents: affectedComponents ?? [],
    message: message.trim(),
  });

  return NextResponse.json({ success: true, incident }, { headers: ADMIN_HEADERS });
}

export async function PUT(request: NextRequest) {
  const auth = checkAdminPermission(request, "support.manage");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.reason ?? "forbidden" }, { status });
  }

  let payload: {
    incidentId?: string;
    status?: IncidentStatus;
    message?: string;
    impact?: IncidentImpact;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { incidentId, status, message, impact } = payload;

  if (!incidentId) {
    return NextResponse.json({ error: "Missing incident ID." }, { status: 400 });
  }

  const hasStatus = status !== undefined;
  const hasMessage = message !== undefined;
  const trimmedMessage = typeof message === "string" ? message.trim() : "";

  if (hasStatus !== hasMessage) {
    return NextResponse.json(
      { error: "Status updates require both status and message." },
      { status: 400 }
    );
  }

  if (hasStatus && !trimmedMessage) {
    return NextResponse.json(
      { error: "Status update message cannot be empty." },
      { status: 400 }
    );
  }

  const existing = getIncident(incidentId);
  if (!existing) {
    return NextResponse.json({ error: "Incident not found." }, { status: 404 });
  }

  // Validate all inputs before any mutations
  if (impact && !VALID_IMPACTS.includes(impact)) {
    return NextResponse.json({ error: "Invalid impact level." }, { status: 400 });
  }
  if (status && trimmedMessage && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  // Apply mutations after all validation passes
  if (impact) {
    updateIncidentImpact(incidentId, impact);
  }

  // Add status update if provided
  if (status && trimmedMessage) {
    const updated = addIncidentUpdate({
      incidentId,
      status,
      message: trimmedMessage,
    });

    if (!updated) {
      return NextResponse.json({ error: "Failed to update incident." }, { status: 500 });
    }

    return NextResponse.json(
      { success: true, incident: updated },
      { headers: ADMIN_HEADERS }
    );
  }

  // Return current state if only impact was updated
  const refreshed = getIncident(incidentId);
  return NextResponse.json(
    { success: true, incident: refreshed },
    { headers: ADMIN_HEADERS }
  );
}
