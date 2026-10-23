import { ImageResponse } from "next/og";

/** A plain notes-style icon with no Kutana branding, for the neutral home screen install. */
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = (await params).size === "192" ? 192 : 512;
  const line = Math.round(size * 0.05);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#f2efe6" }}>
        <div
          style={{
            width: size * 0.62,
            height: size * 0.72,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: line * 1.6,
            padding: size * 0.08,
            background: "#ffffff",
            borderRadius: size * 0.06,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {[1, 0.8, 0.9, 0.6].map((w, i) => (
            <div key={i} style={{ height: line, width: `${w * 100}%`, background: "#b9b3a3", borderRadius: line }} />
          ))}
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
