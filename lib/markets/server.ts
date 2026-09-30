import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { COUNTRY_COOKIE, DEFAULT_COUNTRY } from "@/lib/markets/constants";
import { PRODUCTS, type Sku } from "@/lib/payments/catalog";

export type Market = {
  country_code: string;
  name: string;
  currency: string;
  timezone: string;
  status: "live" | "waitlist" | "closed";
  payment_providers: string[];
  default_locale: string;
};

export type Price = { sku: Sku; amount: number; currency: string };

/** Member's market: account country when signed in, else the visitor's country cookie. */
export async function resolveCountry() {
  const user = await currentUser();
  if (user && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.from("accounts").select("country_code").eq("id", user.id).maybeSingle();
    if (data?.country_code) return data.country_code as string;
  }
  const store = await cookies();
  return (store.get(COUNTRY_COOKIE)?.value || DEFAULT_COUNTRY).toUpperCase();
}

export async function getMarket(country: string): Promise<Market | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("markets").select("*").eq("country_code", country).maybeSingle();
  return (data as Market | null) ?? null;
}

/** Local prices for a market. Falls back to the Kenya list when a market has none. */
export async function pricesFor(country: string): Promise<Price[]> {
  const fallback = (Object.keys(PRODUCTS) as Sku[]).map((sku) => ({
    sku,
    amount: PRODUCTS[sku].amountKes,
    currency: "KES",
  }));
  if (!isSupabaseConfigured()) return fallback;
  const supabase = await createClient();
  const { data } = await supabase.from("product_prices").select("sku, amount, currency").eq("country_code", country);
  if (!data || data.length === 0) return fallback;
  return data.map((row) => ({ sku: row.sku as Sku, amount: Number(row.amount), currency: row.currency as string }));
}
