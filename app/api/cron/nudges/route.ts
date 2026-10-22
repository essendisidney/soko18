import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Daily, 18:15 Nairobi (15:15 UTC), when people are free to reply: one "Your match is waiting"
 * reminder for matches nobody has messaged in a day. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Nope." } }, { status: 401 });
  }
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ data: { nudged: 0, skipped: "not configured" } });
  const { data, error } = await admin.rpc("run_match_nudges");
  if (error) return NextResponse.json({ error: { code: "failed", message: "Nudges failed." } }, { status: 500 });
  return NextResponse.json({ data: { nudged: data ?? 0 } });
}
