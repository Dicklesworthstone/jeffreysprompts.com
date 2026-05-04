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

function adminJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIncidentImpact(value: unknown): value is IncidentImpact {
  return typeof value === "string" && VALID_IMPACTS.includes(value as IncidentImpact);
}

function isIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as IncidentStatus);
}

export async function GET(request: NextRequest) {
  const auth = checkAdminPermission(request, "support.view");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return adminJson({ error: auth.reason ?? "forbidden" }, { status });
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action === "stats") {
    const stats = getIncidentStats();
    return adminJson({ stats });
  }

  const incidents = listIncidents({ limit: 100 });
  return adminJson({ incidents, total: incidents.length });
}

export async function POST(request: NextRequest) {
  const auth = checkAdminPermission(request, "support.manage");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return adminJson({ error: auth.reason ?? "forbidden" }, { status });
  }

  let payload: Record<string, unknown>;

  try {
    const parsed = await request.json();
    if (!isJsonObject(parsed)) {
      return adminJson({ error: "Invalid JSON body." }, { status: 400 });
    }
    payload = parsed;
  } catch {
    return adminJson({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { title, impact, affectedComponents, message } = payload;
  const trimmedTitle = typeof title === "string" ? title.trim() : "";
  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  const components = affectedComponents ?? [];

  if (!trimmedTitle || !impact || !trimmedMessage) {
    return adminJson({ error: "Missing required fields." }, { status: 400 });
  }

  if (!isIncidentImpact(impact)) {
    return adminJson({ error: "Invalid impact level." }, { status: 400 });
  }

  if (
    !Array.isArray(components) ||
    !components.every((component) => typeof component === "string")
  ) {
    return adminJson(
      { error: "Affected components must be an array of strings." },
      { status: 400 }
    );
  }

  const incident = createIncident({
    title: trimmedTitle,
    impact,
    affectedComponents: components.map((component) => component.trim()).filter(Boolean),
    message: trimmedMessage,
  });

  return adminJson({ success: true, incident });
}

export async function PUT(request: NextRequest) {
  const auth = checkAdminPermission(request, "support.manage");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return adminJson({ error: auth.reason ?? "forbidden" }, { status });
  }

  let payload: Record<string, unknown>;

  try {
    const parsed = await request.json();
    if (!isJsonObject(parsed)) {
      return adminJson({ error: "Invalid JSON body." }, { status: 400 });
    }
    payload = parsed;
  } catch {
    return adminJson({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { incidentId, status, message, impact } = payload;

  if (typeof incidentId !== "string" || !incidentId) {
    return adminJson({ error: "Missing incident ID." }, { status: 400 });
  }

  const hasStatus = status !== undefined;
  const hasMessage = message !== undefined;
  const trimmedMessage = typeof message === "string" ? message.trim() : "";

  if (hasStatus !== hasMessage) {
    return adminJson(
      { error: "Status updates require both status and message." },
      { status: 400 }
    );
  }

  if (hasStatus && !trimmedMessage) {
    return adminJson(
      { error: "Status update message cannot be empty." },
      { status: 400 }
    );
  }

  const existing = getIncident(incidentId);
  if (!existing) {
    return adminJson({ error: "Incident not found." }, { status: 404 });
  }

  // Validate all inputs before any mutations
  if (impact !== undefined && !isIncidentImpact(impact)) {
    return adminJson({ error: "Invalid impact level." }, { status: 400 });
  }
  if (status !== undefined && !isIncidentStatus(status)) {
    return adminJson({ error: "Invalid status." }, { status: 400 });
  }

  // Apply mutations after all validation passes
  if (isIncidentImpact(impact)) {
    updateIncidentImpact(incidentId, impact);
  }

  // Add status update if provided
  if (isIncidentStatus(status) && trimmedMessage) {
    const updated = addIncidentUpdate({
      incidentId,
      status,
      message: trimmedMessage,
    });

    if (!updated) {
      return adminJson({ error: "Failed to update incident." }, { status: 500 });
    }

    return adminJson({ success: true, incident: updated });
  }

  // Return current state if only impact was updated
  const refreshed = getIncident(incidentId);
  return adminJson({ success: true, incident: refreshed });
}
