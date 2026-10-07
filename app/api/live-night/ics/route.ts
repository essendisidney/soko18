import { liveNightIcs } from "@/lib/live-night";
import { siteUrl } from "@/lib/site";

/** Weekly calendar event for the live swipe night, so people set their own reminder. */
export function GET() {
  return new Response(liveNightIcs(siteUrl()), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kutana-live-night.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
