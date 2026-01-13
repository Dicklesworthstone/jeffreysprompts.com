import { NextRequest, NextResponse } from "next/server";
import { buildRegistryPayload, buildPromptList } from "@jeffreysprompts/core/export";
import { prompts, categories, tags } from "@jeffreysprompts/core/prompts";
import { createHash } from "crypto";

// Version for ETag generation
const REGISTRY_VERSION = process.env.JFP_REGISTRY_VERSION ?? "1.0.0";

// Compute a stable hash of the prompts registry at startup
const REGISTRY_HASH = createHash("sha256")
  .update(JSON.stringify(prompts))
  .digest("hex")
  .substring(0, 8);

// Generate ETag from registry version, prompt hash, and filter parameters
// Uses base64 encoding of params to guarantee no collisions
function generateETag(params: {
  category?: string | null;
  tag?: string | null;
  featured?: string | null;
  minimal?: string | null;
}): string {
  // Include filter params and content hash in ETag to ensure correct caching
  const content = `v${REGISTRY_VERSION}:h${REGISTRY_HASH}:c${params.category ?? ""}:t${params.tag ?? ""}:f${params.featured ?? ""}:m${params.minimal ?? ""}`;
  // Use base64url encoding for a compact, collision-free ETag
  const encoded = Buffer.from(content).toString("base64url");
  return `"${encoded}"`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Filter parameters
  const category = searchParams.get("category");
  const tag = searchParams.get("tag");
  const featured = searchParams.get("featured");
  const minimal = searchParams.get("minimal");

  // Check ETag for 304 response (include filter params in ETag)
  const etag = generateETag({ category, tag, featured, minimal });
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }

  // Build response data
  let data: unknown;

  if (minimal === "true") {
    // Minimal list for search/autocomplete
    let filtered = buildPromptList();

    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (tag) {
      filtered = filtered.filter((p) => p.tags.includes(tag));
    }

    data = {
      prompts: filtered,
      meta: {
        count: filtered.length,
        categories: categories as string[],
        tags,
      },
    };
  } else {
    // Full registry
    const payload = buildRegistryPayload(REGISTRY_VERSION);

    // Apply filters if specified
    if (category || tag || featured) {
      payload.prompts = payload.prompts.filter((p) => {
        if (category && p.category !== category) return false;
        if (tag && !p.tags.includes(tag)) return false;
        if (featured === "true" && !p.featured) return false;
        return true;
      });
      payload.meta.promptCount = payload.prompts.length;
    }

    data = payload;
  }

  return NextResponse.json(data, {
    headers: {
      "ETag": etag,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "Vary": "Accept-Encoding",
    },
  });
}
