import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const id = z.string().uuid();

const REASONS: Record<string, { status: number; message: string }> = {
  not_verified: { status: 403, message: "Verify yourself first (selfie or student email), then you can vouch for friends." },
  vouch_limit: { status: 409, message: "You’ve vouched for 5 people, the most you can." },
  not_found: { status: 404, message: "Profile unavailable." },
  banned: { status: 403, message: "Your account is suspended." },
};

/** Rafiki vouches on a profile: count, first names (up to 3), and whether you can vouch. */
export async function GET(request: Request) {
  const profile = new URL(request.url).searchParams.get("profile");
  if (!id.safeParse(profile).success || !isSupabaseConfigured()) {
    return NextResponse.json({ data: { count: 0, names: [], mine: false, canVouch: false } });
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("profile_vouches", { p_profile: profile });
  return NextResponse.json({ data: data ?? { count: 0, names: [], mine: false, canVouch: false } });
}

async function act(request: Request, fn: "vouch_for" | "withdraw_vouch") {
  const parsed = z.object({ profileId: id }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isSupabaseConfigured()) {
    return NextResponse.json({ error: { code: "invalid", message: "Profile unavailable." } }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: { code: "unauthorized", message: "Sign in first." } }, { status: 401 });
  const { error } = await supabase.rpc(fn, { p_profile: parsed.data.profileId });
  if (error) {
    const code = Object.keys(REASONS).find((key) => error.message.includes(key)) ?? "not_found";
    return NextResponse.json({ error: { code, message: REASONS[code].message } }, { status: REASONS[code].status });
  }
  const { data } = await supabase.rpc("profile_vouches", { p_profile: parsed.data.profileId });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  return act(request, "vouch_for");
}

export async function DELETE(request: Request) {
  return act(request, "withdraw_vouch");
}
