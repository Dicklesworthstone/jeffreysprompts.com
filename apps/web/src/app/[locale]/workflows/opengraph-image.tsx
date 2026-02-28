import { ImageResponse } from "next/og";
import { workflows } from "@jeffreysprompts/core/prompts";

export const runtime = "edge";
export const alt = "Workflow Builder - Chain prompts into powerful workflows";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function WorkflowsOpenGraphImage() {
  const workflowCount = workflows.length;

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
          background: "linear-gradient(135deg, #0f172a 0%, #312e81 100%)",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#a5b4fc",
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
            Workflow Builder
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#e2e8f0",
              maxWidth: 920,
            }}
          >
            Chain prompts together into powerful multi-step workflows. Export as markdown for any AI assistant.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            fontSize: 20,
            color: "#94a3b8",
          }}
        >
          <span style={{ display: "flex", fontWeight: 600, color: "#c7d2fe" }}>{workflowCount} curated workflows</span>
          <span style={{ display: "flex", marginLeft: "auto" }}>jeffreysprompts.com</span>
        </div>
      </div>
    ),
    size
  );
}
