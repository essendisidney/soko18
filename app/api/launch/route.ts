import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SLUG = /^[a-z0-9-]{2,40}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city") ?? "nairobi";
  const area = url.searchParams.get("area");
  if (!SLUG.test(city) || (area && !SLUG.test(area))) {
    return NextResponse.json({ error: { code: "invalid", message: "Unknown place." } }, { status: 400 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ data: null });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("area_launch", { p_city_slug: city, p_area_slug: area });
  if (error) return NextResponse.json({ data: null });
  return NextResponse.json(
    { data: data as { live: number; target: number } },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
