import { ImageResponse } from "next/og";
import { getBundle } from "@jeffreysprompts/core/prompts/bundles";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 3)).trimEnd() + "...";
}

export default function BundleOpenGraphImage({
  params,
}: {
  params: { id: string };
}) {
  const bundle = getBundle(params.id);
  const title = bundle?.title ?? "Bundle Not Found";
  const description = bundle?.description
    ? truncate(bundle.description, 180)
    : "Curated prompt bundles for agentic coding workflows.";
  const promptCount = bundle?.promptIds.length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #fff7ed 0%, #fde68a 100%)",
          color: "#0f172a",
          fontFamily: "Geist, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#b45309",
          }}
        >
          Jeffrey's Prompts · Bundle
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 24,
              color: "#7c2d12",
              maxWidth: 920,
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 20,
            color: "#9a3412",
          }}
        >
          <span style={{ textTransform: "uppercase", letterSpacing: "0.16em" }}>
            {promptCount} prompts
          </span>
          <span>·</span>
          <span>jeffreysprompts.com</span>
        </div>
      </div>
    ),
    size
  );
}
