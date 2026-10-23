import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { GIFT_SKUS } from "@/lib/payments/catalog";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type MyGifts = {
  received: { id: string; sku: string; title: string; from: string; at: string }[];
  sentThisWeek: number;
  weeklyMax: number;
};

const unauthorized = { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in first." } };

const ERRORS: Record<string, { status: number; message: string }> = {
  not_matched: { status: 403, message: "You can send gifts to your matches." },
  gift_limit: { status: 429, message: "You’ve sent 3 gifts this week. Try again next week." },
  not_found: { status: 404, message: "That isn’t available." },
  invalid: { status: 400, message: "Pick a gift." },
  banned: { status: 403, message: "Your account can’t do this." },
};

function fail(message: string) {
  const key = Object.keys(ERRORS).find((k) => message.includes(k));
  const known = key ? ERRORS[key] : { status: 500, message: "Try again." };
  return { ok: false as const, status: known.status, error: { code: key ?? "unavailable", message: known.message } };
}

export async function myGifts() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const { data, error } = await (await createClient()).rpc("my_gifts");
  if (error || !data) return fail(error?.message ?? "");
  return { ok: true as const, data: data as MyGifts };
}

const startSchema = z.object({ profileId: z.string().uuid(), sku: z.enum(GIFT_SKUS) });

export async function startGift(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const { data, error } = await (await createClient()).rpc("start_gift", { p_profile: parsed.data.profileId, p_sku: parsed.data.sku });
  if (error) return fail(error.message);
  return { ok: true as const, data: data as { giftId: string } };
}

const respondSchema = z.object({ id: z.string().uuid(), accept: z.boolean() });

export async function respondGift(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return fail("invalid");
  const { data, error } = await (await createClient()).rpc("respond_gift", { p_gift: parsed.data.id, p_accept: parsed.data.accept });
  if (error) return fail(error.message);
  return { ok: true as const, data };
}
