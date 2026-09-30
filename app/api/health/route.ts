import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "soko18",
    city: "nairobi",
    open: "kenya",
    supabase: isSupabaseConfigured(),
  });
}
