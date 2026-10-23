import { z } from "zod";
import { currentUser } from "@/lib/auth/user";
import { getMarket, pricesFor } from "@/lib/markets/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DIASPORA_SKUS } from "@/lib/payments/catalog";

export type HomeAway = {
  country: string;
  abroad: boolean;
  marketOpen: boolean;
  marketName: string;
  homeCity: string | null;
  homeAway: boolean;
  tripCredits: number;
  trips: { id: string; city: string; arrives: string; leaves: string }[];
  prices: { sku: string; amount: number; currency: string }[];
};

const unauthorized = { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in first." } };

export async function myHomeAway() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const supabase = await createClient();
  const [{ data: account }, { data: trips }, { data: ent }] = await Promise.all([
    supabase.from("accounts").select("country_code, home:locations!accounts_home_city_id_fkey(slug)").eq("id", user.id).maybeSingle(),
    supabase
      .from("trips")
      .select("id, arrives_on, leaves_on, city:locations(slug)")
      .eq("account_id", user.id)
      .eq("status", "active")
      .gte("leaves_on", new Date().toISOString().slice(0, 10))
      .order("arrives_on"),
    supabase.rpc("my_entitlements"),
  ]);
  const country = ((account?.country_code as string | null) ?? "KE").toUpperCase();
  const [market, prices] = await Promise.all([getMarket(country), pricesFor(country)]);
  const one = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  const entitlements = (ent ?? {}) as { homeAway?: boolean; trips?: number };
  const data: HomeAway = {
    country,
    abroad: country !== "KE",
    marketOpen: market?.status === "live",
    marketName: market?.name ?? country,
    homeCity: one(account?.home as { slug: string } | { slug: string }[] | null)?.slug ?? null,
    homeAway: Boolean(entitlements.homeAway),
    tripCredits: entitlements.trips ?? 0,
    trips: (trips ?? []).map((t) => ({
      id: t.id as string,
      city: one(t.city as { slug: string } | { slug: string }[] | null)?.slug ?? "",
      arrives: t.arrives_on as string,
      leaves: t.leaves_on as string,
    })),
    // Diaspora SKUs are never priced in KES.
    prices: (prices ?? []).filter((p) => (DIASPORA_SKUS as readonly string[]).includes(p.sku) && p.currency !== "KES"),
  };
  return { ok: true as const, data };
}

const ERRORS: Record<string, string> = {
  not_found: "Pick a city in Kenya.",
  not_abroad: "Coming Home is for members living outside Kenya.",
  invalid_dates: "Check your dates: within the next year, up to 60 days.",
  too_many: "You already have 3 trips planned.",
  no_trip: "You need Home & Away or a Coming Home trip first.",
  banned: "Your account can’t do this.",
};

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("home"), city: z.string().min(2).max(40) }),
  z.object({ action: z.literal("trip"), city: z.string().min(2).max(40), arrives: z.string().date(), leaves: z.string().date() }),
  z.object({ action: z.literal("cancel"), id: z.string().uuid() }),
]);

export async function updateHomeAway(input: unknown) {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) return unauthorized;
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, status: 400, error: { code: "invalid", message: "Check the details." } };
  const supabase = await createClient();
  const body = parsed.data;
  const { data, error } =
    body.action === "home"
      ? await supabase.rpc("set_home_city", { p_city_slug: body.city })
      : body.action === "trip"
        ? await supabase.rpc("plan_trip", { p_city_slug: body.city, p_arrives: body.arrives, p_leaves: body.leaves })
        : await supabase.rpc("cancel_trip", { p_trip: body.id });
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return { ok: false as const, status: key === "no_trip" ? 402 : 400, error: { code: key ?? "unavailable", message: key ? ERRORS[key] : "Try again." } };
  }
  return { ok: true as const, data: data ?? { ok: true } };
}
