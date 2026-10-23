import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { looksLikePaidService, PAID_SERVICE_MESSAGE } from "@/lib/safety/paid-services";

const unauthorized = { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in first." } };

export async function rewindLastPass() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rewind_last_pass");
  if (error) {
    if (error.message.includes("gold_required")) {
      return { ok: false as const, status: 402, error: { code: "gold_required", message: "Rewind is a Gold feature." } };
    }
    return { ok: false as const, status: 500, error: { code: "unavailable", message: "Rewind failed." } };
  }
  return { ok: true as const, data: data as { profileId: string | null } };
}

const introSchema = z.object({
  profileId: z.string().uuid(),
  body: z.string().trim().min(1).max(280),
});

const INTRO_ERRORS: Record<string, { status: number; message: string }> = {
  no_salamu: { status: 402, message: "Send a Salamu to message them before you match." },
  salamu_limit: { status: 429, message: "You’ve sent 10 Salamu today. Try again tomorrow." },
  intro_limit: { status: 429, message: "You’ve sent 5 intros today. Try again tomorrow." },
  already_sent: { status: 409, message: "You’ve already messaged them." },
  already_matched: { status: 409, message: "You’ve matched — say hi in your chat." },
  not_found: { status: 404, message: "Profile unavailable." },
  age_band: { status: 403, message: "Messages before a match aren’t available between these age groups. Like them instead." },
  banned: { status: 403, message: "Your account can’t send messages." },
};

function introError(message: string) {
  const key = Object.keys(INTRO_ERRORS).find((k) => message.includes(k));
  const known = key ? INTRO_ERRORS[key] : { status: 500, message: "Could not send." };
  return { ok: false as const, status: known.status, error: { code: key ?? "unavailable", message: known.message } };
}

/**
 * A message before matching. Platinum members use their 5 a day first; after that, or without
 * Platinum, it spends one Salamu. The database decides both, and refunds nothing it didn't take.
 */
export async function sendIntro(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const parsed = introSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, status: 400, error: { code: "invalid", message: "Write a short message." } };
  if (looksLikePaidService(parsed.data.body)) {
    return { ok: false as const, status: 422, error: { code: "paid_services", message: PAID_SERVICE_MESSAGE } };
  }
  const supabase = await createClient();
  const args = { p_profile: parsed.data.profileId, p_body: parsed.data.body };
  const intro = await supabase.rpc("send_intro", args);
  if (!intro.error) return { ok: true as const, data: { ...(intro.data as object), kind: "intro" as const } };
  if (!/platinum_required|intro_limit/.test(intro.error.message)) return introError(intro.error.message);

  const salamu = await supabase.rpc("send_salamu", args);
  if (salamu.error) return introError(salamu.error.message);
  return { ok: true as const, data: { ...(salamu.data as object), kind: "salamu" as const } };
}

/** The recipient hides a message from Likes You. */
export async function ignoreIntro(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false as const, status: 400, error: { code: "invalid", message: "Unknown message." } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("ignore_intro", { p_intro: parsed.data.id });
  if (error) return { ok: false as const, status: 500, error: { code: "unavailable", message: "Could not hide it." } };
  return { ok: true as const, data: { ok: true } };
}

export async function myIntros() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_intros");
  if (error) return { ok: false as const, status: 500, error: { code: "unavailable", message: "Could not load." } };
  return {
    ok: true as const,
    data: data as { id: string; body: string; at: string; kind?: "intro" | "salamu"; profileId: string; slug: string; name: string }[],
  };
}
