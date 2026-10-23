import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Daily drop. Runs in the 17:00 UTC hour (20:00 Nairobi); the database builds picks only for
 * members whose market clock is in the drop hour, once per local day, and pushes "Your 7 are in".
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: "unauthorized", message: "Nope." } }, { status: 401 });
  }
  const admin = createServiceClient();
  if (!admin) return NextResponse.json({ data: { dropped: 0, skipped: "not configured" } });
  const { data, error } = await admin.rpc("run_daily_drops");
  if (error) return NextResponse.json({ error: { code: "failed", message: "Drop failed." } }, { status: 500 });
  return NextResponse.json({ data: { dropped: data ?? 0 } });
}
