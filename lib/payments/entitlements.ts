import { currentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PlanTier } from "@/lib/payments/catalog";
import { coversFor } from "@/lib/discovery/live";

export type Entitlements = {
  plan: PlanTier | null;
  planUntil: string | null;
  incognito: boolean;
  superLikes: number;
  boosts: number;
  /** Null when unlimited (Gold / Platinum). */
  likesLeftToday: number | null;
  canMessageFirst: boolean;
};

export const FREE_ENTITLEMENTS: Entitlements = {
  plan: null,
  planUntil: null,
  incognito: false,
  superLikes: 0,
  boosts: 0,
  likesLeftToday: null,
  canMessageFirst: false,
};

export async function getEntitlements() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in." } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_entitlements");
  if (error || !data) {
    return { ok: false as const, status: 500, error: { code: "unavailable", message: "Could not load your plan." } };
  }
  return { ok: true as const, data: data as Entitlements };
}

export async function spendBoost() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in to Boost." } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("use_boost");
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("no_boosts")) {
      return { ok: false as const, status: 402, error: { code: "no_boosts", message: "You have no Boosts left." } };
    }
    if (msg.includes("profile_not_live")) {
      return {
        ok: false as const,
        status: 403,
        error: { code: "profile_not_live", message: "Boost once your profile is approved." },
      };
    }
    return { ok: false as const, status: 500, error: { code: "unavailable", message: "Boost did not start." } };
  }
  return { ok: true as const, data: data as { boostUntil: string } };
}

export async function likedMe() {
  const user = await currentUser();
  if (!user || !isSupabaseConfigured()) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Sign in." } };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("liked_me");
  if (error || !data) {
    return { ok: false as const, status: 500, error: { code: "unavailable", message: "Could not load likes." } };
  }
  const result = data as {
    count: number;
    locked: boolean;
    people: { profileId: string; slug: string; name: string; super: boolean; at: string; photo?: string | null }[] | null;
  };
  if (result.people?.length) {
    const covers = await coversFor(result.people.map((p) => p.profileId));
    result.people = result.people.map((p) => ({ ...p, photo: covers.get(p.profileId) ?? null }));
  }
  return { ok: true as const, data: result };
}
