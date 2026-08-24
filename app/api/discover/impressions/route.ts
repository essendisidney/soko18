import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const profileId = String(body?.profileId ?? "");
  const surface = body?.surface === "discover" ? "discover" : null;

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
    await supabase.from("profile_impressions").insert({
      account_id: user?.id ?? null,
      profile_id: profileId,
      surface,
    });
    return NextResponse.json({ data: { persisted: true } });
  }

  return NextResponse.json({ data: { persisted: false, profileId, surface } });
}
