import { ImageResponse } from "next/og";
import { getBundle } from "@jeffreysprompts/core/prompts/bundles";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 600,
};
export const contentType = "image/png";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 3)).trimEnd() + "...";
}

export default async function BundleTwitterImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = getBundle(id);
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
          padding: "56px 64px",
          background: "linear-gradient(135deg, #fff7ed 0%, #fde68a 100%)",
          color: "#0f172a",
          fontFamily: "Geist, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#b45309",
          }}
        >
          {"Jeffrey's Prompts · Bundle"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
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
          <span style={{ display: "flex", textTransform: "uppercase", letterSpacing: "0.16em" }}>
            {promptCount} prompts
          </span>
          <span style={{ display: "flex" }}>·</span>
          <span style={{ display: "flex" }}>jeffreysprompts.com</span>
        </div>
      </div>
    ),
    size
  );
}
