import { NextRequest, NextResponse } from "next/server";
import { checkAdminPermission } from "@/lib/admin/permissions";
import {
  createFeaturedContent,
  listFeaturedContent,
  removeFeaturedContent,
  updateFeaturedContent,
  reorderFeaturedContent,
  getFeaturedStats,
  isFeatureType,
  isResourceType,
  type FeatureType,
  type ResourceType,
} from "@/lib/featured/featured-store";

export const runtime = "nodejs";
const ADMIN_HEADERS = { "Cache-Control": "no-store" };

function adminJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", ADMIN_HEADERS["Cache-Control"]);
  return response;
}

/**
 * GET /api/admin/featured
 *
 * List all featured content with admin options (includes inactive).
 */
export async function GET(request: NextRequest) {
  const auth = checkAdminPermission(request, "content.view_reported");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return adminJson({ error: auth.reason ?? "forbidden" }, { status });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const typeParam = searchParams.get("type") ?? "all";
    const includeInactive = searchParams.get("includeInactive") === "true";
    const limitParam = searchParams.get("limit");
    const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? "50", 10) || 50));

    const featureType: FeatureType | "all" = typeParam === "all" || !isFeatureType(typeParam) ? "all" : typeParam;

    const items = listFeaturedContent({
      featureType,
      includeInactive,
      includeExpired: true,
      limit,
    });

    const stats = getFeaturedStats();

    return adminJson({
      success: true,
      data: items,
      stats,
      meta: {
        count: items.length,
        limit,
      },
    });
  } catch (error) {
    console.error("Error listing featured content:", error);
    return adminJson(
      {
        success: false,
        error: "internal_error",
        message: "Failed to list featured content",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/featured
 *
 * Create a new featured content entry.
 */
export async function POST(request: NextRequest) {
  const auth = checkAdminPermission(request, "content.moderate");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return adminJson({ error: auth.reason ?? "forbidden" }, { status });
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return adminJson(
        { success: false, error: "invalid_body", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.resourceType || !body.resourceId || !body.featureType) {
      return adminJson(
        {
          success: false,
          error: "missing_fields",
          message: "resourceType, resourceId, and featureType are required",
        },
        { status: 400 }
      );
    }

    // Validate types
    if (!isResourceType(body.resourceType)) {
      return adminJson(
        {
          success: false,
          error: "invalid_resource_type",
          message: `Invalid resource type: ${body.resourceType}`,
        },
        { status: 400 }
      );
    }

    if (!isFeatureType(body.featureType)) {
      return adminJson(
        {
          success: false,
          error: "invalid_feature_type",
          message: `Invalid feature type: ${body.featureType}`,
        },
        { status: 400 }
      );
    }

    const item = createFeaturedContent({
      resourceType: body.resourceType as ResourceType,
      resourceId: body.resourceId,
      resourceTitle: body.resourceTitle ?? null,
      featureType: body.featureType as FeatureType,
      category: body.category ?? null,
      position: body.position ?? 0,
      headline: body.headline ?? null,
      description: body.description ?? null,
      startAt: body.startAt ?? null,
      endAt: body.endAt ?? null,
      featuredBy: body.featuredBy ?? "admin",
    });

    return adminJson({
      success: true,
      data: item,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create featured content";

    if (message.includes("already featured")) {
      return adminJson(
        {
          success: false,
          error: "already_featured",
          message,
        },
        { status: 409 }
      );
    }

    console.error("Error creating featured content:", error);
    return adminJson(
      {
        success: false,
        error: "internal_error",
        message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/featured
 *
 * Update featured content or reorder items.
 */
export async function PATCH(request: NextRequest) {
  const auth = checkAdminPermission(request, "content.moderate");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return adminJson({ error: auth.reason ?? "forbidden" }, { status });
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return adminJson(
        { success: false, error: "invalid_body", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Handle reorder
    if (body.action === "reorder" && Array.isArray(body.ids)) {
      reorderFeaturedContent(body.ids);
      return adminJson({
        success: true,
        message: "Reordered successfully",
      });
    }

    // Handle single item update
    if (!body.id) {
      return adminJson(
        {
          success: false,
          error: "missing_id",
          message: "Item id is required for update",
        },
        { status: 400 }
      );
    }

    const item = updateFeaturedContent({
      id: body.id,
      position: body.position,
      headline: body.headline,
      description: body.description,
      endAt: body.endAt,
    });

    if (!item) {
      return adminJson(
        {
          success: false,
          error: "not_found",
          message: "Featured content not found",
        },
        { status: 404 }
      );
    }

    return adminJson({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Error updating featured content:", error);
    return adminJson(
      {
        success: false,
        error: "internal_error",
        message: "Failed to update featured content",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/featured
 *
 * Remove featured content.
 */
export async function DELETE(request: NextRequest) {
  const auth = checkAdminPermission(request, "content.moderate");
  if (!auth.ok) {
    const status = auth.reason === "unauthorized" ? 401 : 403;
    return adminJson({ error: auth.reason ?? "forbidden" }, { status });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return adminJson(
        {
          success: false,
          error: "missing_id",
          message: "Item id is required",
        },
        { status: 400 }
      );
    }

    const item = removeFeaturedContent(id);

    if (!item) {
      return adminJson(
        {
          success: false,
          error: "not_found",
          message: "Featured content not found",
        },
        { status: 404 }
      );
    }

    return adminJson({
      success: true,
      message: "Featured content removed",
      data: item,
    });
  } catch (error) {
    console.error("Error removing featured content:", error);
    return adminJson(
      {
        success: false,
        error: "internal_error",
        message: "Failed to remove featured content",
      },
      { status: 500 }
    );
  }
}
