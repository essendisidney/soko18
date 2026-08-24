import { NextResponse } from "next/server";
import { publicPhotos } from "@/lib/media/public";
import { getLiveProfile } from "@/lib/profile/live";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, slug, display_name, birth_year, bio, status, is_verified")
      .eq("slug", slug)
      .eq("status", "live")
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ error: { code: "not_found", message: "Profile not found." } }, { status: 404 });
    }
    return NextResponse.json({ data });
  }

  const profile = getLiveProfile(slug);
  if (!profile) {
    return NextResponse.json({ error: { code: "not_found", message: "Profile not found." } }, { status: 404 });
  }
  return NextResponse.json({
    data: { ...profile, photos: publicPhotos(profile) },
  });
}
