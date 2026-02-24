import { NextResponse } from "next/server";
import { getStatusSummary, getQuickStatus } from "@/lib/status";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const quick = searchParams.get("quick") === "true";

    if (quick) {
      const status = await getQuickStatus();
      return NextResponse.json(status, {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      });
    }

    const summary = await getStatusSummary();
    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Status check failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
