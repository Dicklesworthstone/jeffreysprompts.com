import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import type { DmcaStatus } from "@/lib/legal/dmca";
import {
  createDmcaRequest,
  getDmcaRequest,
  getDmcaStats,
  isDmcaStatus,
  listDmcaRequests,
  submitCounterNotice,
  updateDmcaRequestStatus,
} from "@/lib/legal/dmca";

const MAX_TEXT_LENGTH = 2000;
const MAX_NAME_LENGTH = 140;
const MAX_ADDRESS_LENGTH = 300;
const MAX_SIGNATURE_LENGTH = 140;
const MAX_URL_LENGTH = 500;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(normalizeEmail(value));
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_URL_LENGTH) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mode = typeof payload.type === "string" ? payload.type : "request";

  if (mode === "counter") {
    const requestId = typeof payload.requestId === "string" ? payload.requestId.trim() : "";
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    const address = typeof payload.address === "string" ? payload.address.trim() : "";
    const statement = typeof payload.statement === "string" ? payload.statement.trim() : "";
    const signature = typeof payload.signature === "string" ? payload.signature.trim() : "";
    const signatureDate = normalizeDate(
      typeof payload.signatureDate === "string" ? payload.signatureDate : null
    );

    if (!requestId || !name || !email || !address || !statement || !signature) {
      return NextResponse.json({ error: "Missing required counter-notice fields." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    if (statement.length > MAX_TEXT_LENGTH) {
      return NextResponse.json({ error: "Counter-notice is too long." }, { status: 400 });
    }

    const existing = getDmcaRequest(requestId);
    if (!existing) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    const updated = submitCounterNotice({
      requestId,
      name,
      email,
      address,
      statement,
      signature,
      signatureDate,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Unable to submit counter-notice for this request." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      requestId: updated.id,
      status: updated.status,
    });
  }

  const claimantName = typeof payload.claimantName === "string" ? payload.claimantName.trim() : "";
  const claimantEmail = typeof payload.claimantEmail === "string" ? payload.claimantEmail.trim() : "";
  const claimantAddress = typeof payload.claimantAddress === "string" ? payload.claimantAddress.trim() : "";
  const copyrightedWorkDescription =
    typeof payload.copyrightedWorkDescription === "string"
      ? payload.copyrightedWorkDescription.trim()
      : "";
  const copyrightedWorkUrl =
    typeof payload.copyrightedWorkUrl === "string"
      ? normalizeUrl(payload.copyrightedWorkUrl)
      : null;
  const infringingContentUrl =
    typeof payload.infringingContentUrl === "string"
      ? normalizeUrl(payload.infringingContentUrl)
      : null;
  const signature = typeof payload.signature === "string" ? payload.signature.trim() : "";
  const signatureDate = normalizeDate(
    typeof payload.signatureDate === "string" ? payload.signatureDate : null
  );
  const goodFaithStatement = payload.goodFaithStatement === true;
  const accuracyStatement = payload.accuracyStatement === true;
  const ownershipStatement = payload.ownershipStatement === true;

  if (
    !claimantName ||
    !claimantEmail ||
    !claimantAddress ||
    !copyrightedWorkDescription ||
    !infringingContentUrl ||
    !signature
  ) {
    return NextResponse.json({ error: "Missing required DMCA fields." }, { status: 400 });
  }

  if (!isValidEmail(claimantEmail)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  if (
    claimantName.length > MAX_NAME_LENGTH ||
    claimantAddress.length > MAX_ADDRESS_LENGTH ||
    signature.length > MAX_SIGNATURE_LENGTH
  ) {
    return NextResponse.json({ error: "One or more fields are too long." }, { status: 400 });
  }

  if (copyrightedWorkDescription.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "Description is too long." }, { status: 400 });
  }

  if (!goodFaithStatement || !accuracyStatement || !ownershipStatement) {
    return NextResponse.json(
      { error: "All legal attestations must be accepted." },
      { status: 400 }
    );
  }

  if (!infringingContentUrl) {
    return NextResponse.json({ error: "Invalid infringing URL." }, { status: 400 });
  }

  const normalizedSignatureDate = signatureDate ?? new Date().toISOString();

  const requestRecord = createDmcaRequest({
    claimantName,
    claimantEmail,
    claimantAddress,
    copyrightedWorkDescription,
    copyrightedWorkUrl,
    infringingContentUrl,
    signature,
    signatureDate: normalizedSignatureDate,
  });

  return NextResponse.json({
    success: true,
    requestId: requestRecord.id,
    status: requestRecord.status,
    signatureDate: normalizedSignatureDate,
  });
}

export async function GET(request: NextRequest) {
  const auth = checkAdminPermission(request, "content.view_reported");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.reason ?? "forbidden" }, { status });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status") ?? "all";
  const search = searchParams.get("search") ?? "";
  const parsedPage = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const parsedLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(50, Math.max(1, parsedLimit)) : 20;

  const normalizedStatus: DmcaStatus | "all" =
    status === "all" || isDmcaStatus(status) ? status : "all";

  const requests = listDmcaRequests({
    status: normalizedStatus,
    search,
    page,
    limit,
  });

  const totalCount = listDmcaRequests({
    status: normalizedStatus,
    search,
    page: 1,
    limit: 2000,
  }).length;

  return NextResponse.json({
    requests,
    stats: getDmcaStats(),
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
}

export async function PUT(request: NextRequest) {
  const auth = checkAdminPermission(request, "content.moderate");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.reason ?? "forbidden" }, { status });
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const requestId = typeof payload.requestId === "string" ? payload.requestId.trim() : "";
  const status = typeof payload.status === "string" ? payload.status : "";
  const reviewNotes = typeof payload.reviewNotes === "string" ? payload.reviewNotes.trim() : null;

  if (!requestId || !status) {
    return NextResponse.json({ error: "requestId and status are required." }, { status: 400 });
  }

  if (!isDmcaStatus(status)) {
    return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
  }

  const updated = updateDmcaRequestStatus({
    requestId,
    status,
    resolvedBy: auth.role,
    reviewNotes,
  });

  if (!updated) {
    return NextResponse.json({ error: "DMCA request not found." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    request: updated,
  });
}
