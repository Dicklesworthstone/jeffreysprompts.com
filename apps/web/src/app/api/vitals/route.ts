import { NextResponse, type NextRequest } from "next/server";

export interface WebVitalPayload {
  name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType: string;
}

// In-memory buffer for batching (in production, you'd use a proper queue)
const metricsBuffer: WebVitalPayload[] = [];
const BUFFER_SIZE = 100;

function processMetrics(): void {
  if (metricsBuffer.length === 0) return;

  // In production, you would:
  // 1. Send to your analytics backend (e.g., BigQuery, InfluxDB, Datadog)
  // 2. Store in a time-series database
  // 3. Trigger alerts if metrics degrade

  // For now, just log aggregates in development
  if (process.env.NODE_ENV === "development") {
    const aggregates = metricsBuffer.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) {
          acc[metric.name] = { values: [], ratings: { good: 0, "needs-improvement": 0, poor: 0 } };
        }
        acc[metric.name].values.push(metric.value);
        acc[metric.name].ratings[metric.rating]++;
        return acc;
      },
      {} as Record<string, { values: number[]; ratings: Record<string, number> }>
    );

    console.log("[Web Vitals] Aggregated metrics:", aggregates);
  }

  // Clear buffer
  metricsBuffer.length = 0;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as WebVitalPayload;

    // Validate the payload
    const validNames = ["CLS", "FCP", "INP", "LCP", "TTFB"];
    if (!validNames.includes(body.name)) {
      return NextResponse.json({ error: "Invalid metric name" }, { status: 400 });
    }

    if (typeof body.value !== "number" || Number.isNaN(body.value)) {
      return NextResponse.json({ error: "Invalid metric value" }, { status: 400 });
    }

    // Add to buffer
    metricsBuffer.push({
      name: body.name,
      value: body.value,
      rating: body.rating,
      delta: body.delta,
      id: body.id,
      navigationType: body.navigationType,
    });

    // Process when buffer is full
    if (metricsBuffer.length >= BUFFER_SIZE) {
      processMetrics();
    }

    return NextResponse.json({ success: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// Health check for the vitals endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "healthy",
    metrics: ["CLS", "FCP", "INP", "LCP", "TTFB"],
    bufferSize: metricsBuffer.length,
  });
}
