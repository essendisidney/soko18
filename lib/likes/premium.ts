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
  platinum_required: { status: 402, message: "Messaging before a match is a Platinum feature." },
  intro_limit: { status: 429, message: "You’ve sent 5 intros today. Try again tomorrow." },
  already_sent: { status: 409, message: "You’ve already messaged them." },
  not_found: { status: 404, message: "Profile unavailable." },
};

export async function sendIntro(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const parsed = introSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, status: 400, error: { code: "invalid", message: "Write a short message." } };
  if (looksLikePaidService(parsed.data.body)) {
    return { ok: false as const, status: 422, error: { code: "paid_services", message: PAID_SERVICE_MESSAGE } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_intro", { p_profile: parsed.data.profileId, p_body: parsed.data.body });
  if (error) {
    const key = Object.keys(INTRO_ERRORS).find((k) => error.message.includes(k));
    const known = key ? INTRO_ERRORS[key] : { status: 500, message: "Could not send." };
    return { ok: false as const, status: known.status, error: { code: key ?? "unavailable", message: known.message } };
  }
  return { ok: true as const, data };
}

export async function myIntros() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_intros");
  if (error) return { ok: false as const, status: 500, error: { code: "unavailable", message: "Could not load." } };
  return {
    ok: true as const,
    data: data as { id: string; body: string; at: string; profileId: string; slug: string; name: string }[],
  };
}
