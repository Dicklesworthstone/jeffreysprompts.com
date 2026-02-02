import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import {
  getTagMappingsRecord,
  getTagMappingsMeta,
  listTagMappings,
  removeTagMapping,
  upsertTagMapping,
} from "@/lib/metadata/tag-mapping-store";

export const runtime = "nodejs";

function requirePermission(
  request: NextRequest,
  permission: Parameters<typeof checkAdminPermission>[1]
): { response: NextResponse | null; auth: ReturnType<typeof checkAdminPermission> } {
  const auth = checkAdminPermission(request, permission);
  if (auth.ok) return { response: null, auth };
  const status = auth.reason === "unauthorized" ? 401 : 403;
  return { response: NextResponse.json({ error: auth.reason ?? "forbidden" }, { status }), auth };
}

export async function GET(request: NextRequest) {
  const { response } = requirePermission(request, "content.view_reported");
  if (response) return response;

  const mappings = listTagMappings();
  const meta = getTagMappingsMeta();

  return NextResponse.json(
    {
      success: true,
      data: mappings,
      record: getTagMappingsRecord(),
      meta: {
        count: mappings.length,
        persistedPath: meta.persistedPath,
        lastPersistError: meta.lastPersistError,
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: NextRequest) {
  const { response, auth } = requirePermission(request, "content.moderate");
  if (response) return response;

  const body = await request.json().catch(() => null) as {
    alias?: string;
    canonical?: string;
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
      updatedBy: auth.role,
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
  const { response } = requirePermission(request, "content.moderate");
  if (response) return response;

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
