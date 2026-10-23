import { NextResponse } from "next/server";

/** The neutral install: a generic name and icon, chosen in Settings → Discreet mode. */
export function GET() {
  return NextResponse.json(
    {
      id: "/?neutral",
      name: "Notes",
      short_name: "Notes",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#f2efe6",
      theme_color: "#070708",
      icons: [
        { src: "/neutral-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/neutral-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
