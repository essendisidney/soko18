import { randomInt } from "node:crypto";
import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { campusReason, type CampusBoardRow, type MyCampus } from "@/lib/campus/shared";

type Fail = { ok: false; status: number; error: { code: string; message: string } };
type Done<T> = { ok: true; data: T };

const unauthorized: Fail = { ok: false, status: 401, error: { code: "unauthorized", message: "Sign in first." } };
const unavailable: Fail = { ok: false, status: 500, error: { code: "unavailable", message: "Something went wrong. Try again." } };

function refused(reason: string | undefined): Fail {
  const code = reason ?? "invalid";
  return { ok: false, status: code === "unauthorized" ? 401 : 400, error: { code, message: campusReason(code) } };
}

async function authed() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return null;
  return { user, supabase: await createClient() };
}

/** The signed-in member's campus (or null) and the campus-vs-campus board. Board is public. */
export async function campusOverview(): Promise<Done<{ mine: MyCampus | null; board: CampusBoardRow[] }> | Fail> {
  if (!isSupabaseConfigured()) return { ok: true, data: { mine: null, board: [] } };
  const supabase = await createClient();
  const user = await currentUser();
  const [board, mine] = await Promise.all([
    supabase.rpc("campus_board"),
    user ? supabase.rpc("my_campus") : Promise.resolve({ data: null, error: null }),
  ]);
  if (board.error || mine.error) return unavailable;
  return { ok: true, data: { mine: (mine.data as MyCampus | null) ?? null, board: (board.data as CampusBoardRow[]) ?? [] } };
}

/** Verified for free when the member signed in with their student email. */
export async function claimFromLogin(): Promise<Done<{ campus: string; name: string }> | Fail> {
  const ctx = await authed();
  if (!ctx) return unauthorized;
  const { data, error } = await ctx.supabase.rpc("claim_campus_from_login");
  if (error) return unavailable;
  const result = data as { ok: boolean; reason?: string; campus?: string; name?: string };
  if (!result.ok) return refused(result.reason);
  return { ok: true, data: { campus: result.campus!, name: result.name! } };
}

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

/** Emails a 6-digit code to a student address. The database checks the campus, age and limits. */
export async function startEmailCode(input: unknown): Promise<Done<{ campus: string; name: string }> | Fail> {
  const parsed = emailSchema.safeParse(input);
  if (!parsed.success) return refused("not_campus");
  const ctx = await authed();
  if (!ctx) return unauthorized;
  const admin = createServiceClient();
  if (!admin || !isEmailConfigured()) return refused("email_unavailable");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { data, error } = await admin.rpc("start_campus_code", {
    p_account: ctx.user.id,
    p_email: parsed.data.email,
    p_code: code,
  });
  if (error) return unavailable;
  const result = data as { ok: boolean; reason?: string; campus?: string; name?: string };
  if (!result.ok) return refused(result.reason);

  const sent = await sendEmail({
    to: parsed.data.email,
    subject: `${code} is your Kutana campus code`,
    text: `Your code is ${code}. It confirms you study at ${result.name} and expires in 15 minutes.\n\nIf you didn't ask for this, ignore this email — nobody can use your address without the code.`,
  });
  if (!sent) return refused("email_unavailable");
  return { ok: true, data: { campus: result.campus!, name: result.name! } };
}

const codeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/) });

export async function confirmEmailCode(input: unknown): Promise<Done<{ campus: string; name: string }> | Fail> {
  const parsed = codeSchema.safeParse(input);
  if (!parsed.success) return refused("wrong");
  const ctx = await authed();
  if (!ctx) return unauthorized;
  const { data, error } = await ctx.supabase.rpc("confirm_campus_code", { p_code: parsed.data.code });
  if (error) return unavailable;
  const result = data as { ok: boolean; reason?: string; campus?: string; name?: string };
  if (!result.ok) return refused(result.reason);
  return { ok: true, data: { campus: result.campus!, name: result.name! } };
}

const badgeSchema = z.object({ showOnProfile: z.boolean() });

export async function setCampusBadge(input: unknown): Promise<Done<{ showOnProfile: boolean }> | Fail> {
  const parsed = badgeSchema.safeParse(input);
  if (!parsed.success) return refused("invalid");
  const ctx = await authed();
  if (!ctx) return unauthorized;
  const { error } = await ctx.supabase
    .from("campus_members")
    .update({ show_on_profile: parsed.data.showOnProfile })
    .eq("account_id", ctx.user.id);
  if (error) return unavailable;
  return { ok: true, data: parsed.data };
}

export async function leaveCampus(): Promise<Done<{ left: true }> | Fail> {
  const ctx = await authed();
  if (!ctx) return unauthorized;
  const { error } = await ctx.supabase.from("campus_members").delete().eq("account_id", ctx.user.id);
  if (error) return unavailable;
  return { ok: true, data: { left: true } };
}

/**
 * The campus deck is for verified students of that campus, once it has opened.
 * Returns null when not allowed, else the viewer's own profile id so the deck can leave it out.
 */
export async function campusDeckAccess(slug: string): Promise<{ ownProfileId: string | null } | null> {
  if (!isSupabaseConfigured()) return null;
  const user = await currentUser();
  if (!user) return null;
  const supabase = await createClient();
  const [{ data }, { data: own }] = await Promise.all([
    supabase.rpc("my_campus"),
    supabase.from("profiles").select("id").eq("account_id", user.id).maybeSingle(),
  ]);
  const mine = data as MyCampus | null;
  if (!mine || mine.slug !== slug || mine.status !== "live") return null;
  return { ownProfileId: (own?.id as string | undefined) ?? null };
}
