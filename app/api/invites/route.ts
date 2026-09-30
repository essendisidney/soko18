import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type InviteSummary = {
  code: string | null;
  founding: boolean;
  invited: number;
  approved: number;
  goldDaysEarned: number;
  rewardDays: number;
  rewardCap: number;
  friendSuperLikes: number;
  invitedBy: boolean | null;
};

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ data: null });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ data: null });
  const { data, error } = await supabase.rpc("my_invites");
  if (error) return NextResponse.json({ error: { code: "unavailable", message: "Could not load invites." } }, { status: 500 });
  return NextResponse.json({ data: data as InviteSummary });
}

const claim = z.object({ code: z.string().min(4).max(12) });

const REASONS: Record<string, string> = {
  invalid: "That code doesn’t exist.",
  self: "That’s your own code.",
  already: "You’ve already used a friend’s code.",
  too_late: "Codes can only be used in your first 14 days.",
};

export async function POST(request: Request) {
  const parsed = claim.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "invalid", message: REASONS.invalid } }, { status: 400 });
  if (!isSupabaseConfigured()) return NextResponse.json({ data: { ok: false } });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: { code: "auth", message: "Sign in first." } }, { status: 401 });
  const { data, error } = await supabase.rpc("claim_invite", { p_code: parsed.data.code });
  if (error) return NextResponse.json({ error: { code: "unavailable", message: "Could not use that code." } }, { status: 500 });
  const result = data as { ok: boolean; reason?: string };
  if (!result.ok) {
    return NextResponse.json({ error: { code: result.reason ?? "invalid", message: REASONS[result.reason ?? "invalid"] ?? REASONS.invalid } }, { status: 400 });
  }
  return NextResponse.json({ data: { ok: true } });
}
