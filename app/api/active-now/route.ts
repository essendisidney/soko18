import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SLUG = /^[a-z0-9-]{1,60}$/;

/** Real people active in the last 15 minutes. Null below 10: small numbers never show. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city") ?? "nairobi";
  const area = url.searchParams.get("area");
  if (!SLUG.test(city) || (area && !SLUG.test(area)) || !isSupabaseConfigured()) {
    return NextResponse.json({ data: { count: null } });
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("active_now", { p_city_slug: city, p_area_slug: area || null });
  return NextResponse.json(
    { data: { count: typeof data === "number" ? data : null } },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
