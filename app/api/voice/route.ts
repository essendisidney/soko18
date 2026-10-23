import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { takeRateLimit } from "@/lib/security/limit";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { VOICE_MAX_MS } from "@/lib/voice/shared";

const unauthorized = NextResponse.json({ error: { code: "unauthorized", message: "Sign in first." } }, { status: 401 });

/** My voice intro and its review status. */
export async function GET() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const supabase = await createClient();
  const { data } = await supabase.from("profile_voice").select("status, duration_ms, storage_path").eq("account_id", user.id).maybeSingle();
  return NextResponse.json({
    data: data ? { status: data.status, durationMs: data.duration_ms, path: data.storage_path } : null,
  });
}

const body = z.object({
  path: z.string().min(10).max(120),
  durationMs: z.number().int().min(1000).max(VOICE_MAX_MS + 500),
});

const ERRORS: Record<string, { status: number; message: string }> = {
  too_long: { status: 400, message: "Keep it under 15 seconds." },
  no_profile: { status: 409, message: "Save your profile first." },
  banned: { status: 403, message: "Your account can’t do this." },
  invalid: { status: 400, message: "That recording didn’t upload properly. Try again." },
};

/** Save a clip already uploaded to my folder in the private `voice` bucket. It waits for review. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const limited = takeRateLimit("uploads", user.id);
  if (!limited.ok) return NextResponse.json({ error: limited.error }, { status: limited.status });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: ERRORS.invalid }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_voice", { p_path: parsed.data.path, p_duration_ms: parsed.data.durationMs });
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k)) ?? "invalid";
    return NextResponse.json({ error: { code: key, message: ERRORS[key].message } }, { status: ERRORS[key].status });
  }
  return NextResponse.json({ data });
}

/** Remove my voice intro, and the file. */
export async function DELETE() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const supabase = await createClient();
  const { data } = await supabase.from("profile_voice").select("storage_path").eq("account_id", user.id).maybeSingle();
  await supabase.rpc("remove_voice");
  if (data?.storage_path) await supabase.storage.from("voice").remove([data.storage_path as string]);
  return NextResponse.json({ data: { ok: true } });
}
