import { NextResponse } from "next/server";
import { broadcastToOptedIn } from "@/lib/push/send";
import { LIVE_NIGHT, liveNight } from "@/lib/live-night";

/**
 * Sundays 19:45 Nairobi (16:45 UTC): remind members who turned on push and said yes to news
 * that the live swipe night starts at 8. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Nope." } }, { status: 401 });
  }
  // Only remind in the hour before it starts, in case the schedule and the cron drift apart.
  const { live, start } = liveNight();
  const untilStart = start.getTime() - Date.now();
  if (live || untilStart > 60 * 60 * 1000) {
    return NextResponse.json({ data: { sent: 0, skipped: "not the hour before a live night" } });
  }
  const result = await broadcastToOptedIn({
    title: "Live swipe night starts at 8",
    body: `Everyone's on together, ${LIVE_NIGHT.label}. Open Kutana.`,
    href: "/discover",
  });
  return NextResponse.json({ data: result });
}
