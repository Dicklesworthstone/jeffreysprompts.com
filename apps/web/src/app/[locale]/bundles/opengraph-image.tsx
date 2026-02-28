import { ImageResponse } from "next/og";
import { bundles } from "@jeffreysprompts/core/prompts/bundles";

export const runtime = "edge";
export const alt = "Prompt Bundles - Curated collections for agentic coding";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function BundlesOpenGraphImage() {
  const bundleCount = bundles.length;
  const totalPrompts = bundles.reduce((sum, b) => sum + b.promptIds.length, 0);

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
          fontFamily: "system-ui, sans-serif",
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
          {"Jeffrey's Prompts"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Prompt Bundles
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#7c2d12",
              maxWidth: 920,
            }}
          >
            Curated collections of related prompts. Install all prompts in a bundle with a single command.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 20,
            color: "#9a3412",
          }}
        >
          <span style={{ display: "flex", fontWeight: 600 }}>{bundleCount} bundles</span>
          <span style={{ display: "flex" }}>·</span>
          <span style={{ display: "flex", fontWeight: 600 }}>{totalPrompts} prompts</span>
          <span style={{ display: "flex", marginLeft: "auto" }}>jeffreysprompts.com</span>
        </div>
      </div>
    ),
    size
  );
}
