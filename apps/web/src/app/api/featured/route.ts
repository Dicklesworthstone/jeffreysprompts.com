import { NextRequest, NextResponse } from "next/server";
import {
  listFeaturedContent,
  getActiveStaffPicks,
  getActiveFeatured,
  isFeatureType,
  isResourceType,
  type FeatureType,
  type ResourceType,
} from "@/lib/featured/featured-store";

export const runtime = "nodejs";

/**
 * GET /api/featured
 *
 * Query params:
 * - type: "staff_pick" | "featured" | "spotlight" | "all" (default: "all")
 * - resourceType: "prompt" | "bundle" | "workflow" | "collection" | "profile" | "all" (default: "all")
 * - category: string (optional)
 * - limit: number (default: 10, max: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const typeParam = searchParams.get("type") ?? "all";
    const resourceTypeParam = searchParams.get("resourceType") ?? "all";
    const category = searchParams.get("category") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = Math.min(50, Math.max(1, parseInt(limitParam ?? "10", 10) || 10));

    // Validate type
    let featureType: FeatureType | "all" = "all";
    if (typeParam !== "all") {
      if (!isFeatureType(typeParam)) {
        return NextResponse.json(
          {
            success: false,
            error: "invalid_feature_type",
            message: `Invalid feature type: ${typeParam}. Valid types: staff_pick, featured, spotlight`,
          },
          { status: 400 }
        );
      }
      featureType = typeParam;
    }

    // Validate resource type
    let resourceType: ResourceType | "all" = "all";
    if (resourceTypeParam !== "all") {
      if (!isResourceType(resourceTypeParam)) {
        return NextResponse.json(
          {
            success: false,
            error: "invalid_resource_type",
            message: `Invalid resource type: ${resourceTypeParam}. Valid types: prompt, bundle, workflow, collection, profile`,
          },
          { status: 400 }
        );
      }
      resourceType = resourceTypeParam;
    }

    // Shortcut endpoints for common queries
    if (featureType === "staff_pick") {
      const items = getActiveStaffPicks({
        resourceType: resourceType === "all" ? undefined : resourceType,
        category: category ?? undefined,
        limit,
      });
      return NextResponse.json(
        {
          success: true,
          data: items,
          meta: {
            type: "staff_pick",
            count: items.length,
            limit,
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    if (featureType === "featured") {
      const items = getActiveFeatured({
        resourceType: resourceType === "all" ? undefined : resourceType,
        category: category ?? undefined,
        limit,
      });
      return NextResponse.json(
        {
          success: true,
          data: items,
          meta: {
            type: "featured",
            count: items.length,
            limit,
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }

    // General query
    const items = listFeaturedContent({
      featureType,
      resourceType,
      category: category ?? null,
      limit,
    });

    return NextResponse.json(
      {
        success: true,
        data: items,
        meta: {
          type: featureType,
          resourceType,
          count: items.length,
          limit,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching featured content:", error);
    return NextResponse.json(
      {
        success: false,
        error: "internal_error",
        message: "Failed to fetch featured content",
      },
      { status: 500 }
    );
  }
}
