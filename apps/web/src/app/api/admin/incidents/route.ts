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
    return NextResponse.json({ stats });
  }

  const incidents = listIncidents({ limit: 100 });
  return NextResponse.json({ incidents, total: incidents.length });
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

  return NextResponse.json({ success: true, incident });
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

  const existing = getIncident(incidentId);
  if (!existing) {
    return NextResponse.json({ error: "Incident not found." }, { status: 404 });
  }

  // Update impact if provided
  if (impact) {
    if (!VALID_IMPACTS.includes(impact)) {
      return NextResponse.json({ error: "Invalid impact level." }, { status: 400 });
    }
    updateIncidentImpact(incidentId, impact);
  }

  // Add status update if provided
  if (status && message) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const updated = addIncidentUpdate({
      incidentId,
      status,
      message: message.trim(),
    });

    if (!updated) {
      return NextResponse.json({ error: "Failed to update incident." }, { status: 500 });
    }

    return NextResponse.json({ success: true, incident: updated });
  }

  // Return current state if only impact was updated
  const refreshed = getIncident(incidentId);
  return NextResponse.json({ success: true, incident: refreshed });
}
