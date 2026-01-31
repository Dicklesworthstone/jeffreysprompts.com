import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runStatusChecks } from "@/lib/health/checks";

function getVersion(): string {
  return (
    process.env.JFP_APP_VERSION ||
    process.env.JFP_REGISTRY_VERSION ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "unknown"
  );
}

function isAuthorized(request: NextRequest): boolean {
  const token = process.env.JFP_HEALTH_STATUS_TOKEN;
  if (!token) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const headerToken = request.headers.get("x-jfp-admin-token");
  const provided = bearer || headerToken;

  if (!provided) return false;

  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(token, "utf8");
  if (providedBuf.length !== expectedBuf.length) {
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return timingSafeEqual(providedBuf, expectedBuf);
}

function getMemoryUsage(): Record<string, number> | null {
  if (typeof process?.memoryUsage !== "function") return null;
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const { status, checks } = await runStatusChecks();

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: getVersion(),
      environment: process.env.NODE_ENV ?? "development",
      uptimeSeconds: typeof process?.uptime === "function" ? Math.round(process.uptime()) : null,
      memory: getMemoryUsage(),
      checks,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
