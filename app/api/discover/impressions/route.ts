import { NextResponse } from "next/server";
import { isAnalyticsSurface } from "@/lib/analytics/engine";
import { UUID } from "@/lib/likes/ids";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const profileId = String(body?.profileId ?? "");
  const surface = isAnalyticsSurface(body?.surface) ? body.surface : null;

  if (!profileId || !surface) {
    return NextResponse.json(
      { error: { code: "invalid", message: "Missing impression." } },
      { status: 400 },
    );
  }

  if (isSupabaseConfigured() && UUID.test(profileId)) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("profile_impressions").insert({
      account_id: user?.id ?? null,
      profile_id: profileId,
      surface,
    });
    return NextResponse.json({ data: { persisted: !error } });
  }

  return NextResponse.json({ data: { persisted: false, profileId, surface } });
}
