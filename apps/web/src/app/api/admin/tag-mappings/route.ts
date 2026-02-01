import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import {
  getTagMappingsRecord,
  listTagMappings,
  removeTagMapping,
  upsertTagMapping,
} from "@/lib/metadata/tag-mapping-store";

export const runtime = "nodejs";

function authError(request: NextRequest, permission: Parameters<typeof checkAdminPermission>[1]) {
  const auth = checkAdminPermission(request, permission);
  if (auth.ok) return null;
  const status = auth.reason === "unauthorized" ? 401 : 403;
  return NextResponse.json({ error: auth.reason ?? "forbidden" }, { status });
}

export async function GET(request: NextRequest) {
  const authResponse = authError(request, "content.view_reported");
  if (authResponse) return authResponse;

  const mappings = listTagMappings();

  return NextResponse.json(
    {
      success: true,
      data: mappings,
      record: getTagMappingsRecord(),
      meta: {
        count: mappings.length,
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: NextRequest) {
  const authResponse = authError(request, "content.moderate");
  if (authResponse) return authResponse;

  const body = await request.json().catch(() => null) as {
    alias?: string;
    canonical?: string;
    updatedBy?: string;
  } | null;

  if (!body?.alias || !body?.canonical) {
    return NextResponse.json(
      {
        success: false,
        error: "missing_fields",
        message: "alias and canonical are required",
      },
      { status: 400 }
    );
  }

  try {
    const mapping = upsertTagMapping({
      alias: body.alias,
      canonical: body.canonical,
      updatedBy: body.updatedBy ?? "admin",
    });

    return NextResponse.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid_payload";
    return NextResponse.json(
      {
        success: false,
        error: message,
        message: "Unable to save tag mapping",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResponse = authError(request, "content.moderate");
  if (authResponse) return authResponse;

  const aliasParam = request.nextUrl.searchParams.get("alias");
  const body = await request.json().catch(() => null) as { alias?: string } | null;
  const alias = aliasParam ?? body?.alias;

  if (!alias) {
    return NextResponse.json(
      {
        success: false,
        error: "missing_alias",
        message: "alias is required to remove a mapping",
      },
      { status: 400 }
    );
  }

  const removed = removeTagMapping(alias);
  if (!removed) {
    return NextResponse.json(
      {
        success: false,
        error: "not_found",
        message: "No mapping found for that alias",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
