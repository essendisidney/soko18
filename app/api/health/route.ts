import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * For an uptime monitor (e.g. a free UptimeRobot or Better Stack check every 5 minutes).
 * 200 when the app and the database answer; 503 when the database doesn't.
 */
export async function GET() {
  const started = Date.now();
  let database: "ok" | "down" | "not configured" = "not configured";
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("markets").select("country_code").limit(1);
      database = error ? "down" : "ok";
    } catch {
      database = "down";
    }
  }
  const ok = database !== "down";
  return NextResponse.json(
    { ok, service: "kutana", database, ms: Date.now() - started },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
