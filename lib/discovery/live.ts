import { DEMO_SEED_ENABLED } from "@/lib/data/seed";
import { getDiscoverFeed } from "@/lib/discovery/feed";
import { browseFeed } from "@/lib/browse/feed";
import { rankProfiles } from "@/lib/discovery/rank";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { LookingFor, ProfileGender, SeedProfile } from "@/lib/types";

const SIGNED_URL_SECONDS = 60 * 60;

type CardRow = {
  id: string;
  slug: string;
  display_name: string;
  birth_year: number | null;
  gender: ProfileGender | null;
  looking_for: LookingFor | null;
  is_verified: boolean;
  boost_until: string | null;
  city_slug: string;
  city_name: string;
  area_slug: string | null;
  area_name: string | null;
  cover_path: string | null;
  bio?: string | null;
  prompts?: { q: string; a: string }[] | null;
  is_test?: boolean | null;
};

/** Demo profiles are only for local development and previews, never alongside real members. */
export function showSeedProfiles() {
  return DEMO_SEED_ENABLED;
}

async function signCovers(paths: string[]) {
  const admin = createServiceClient();
  if (!admin || paths.length === 0) return new Map<string, string>();
  const { data } = await admin.storage.from("profile-media").createSignedUrls(paths, SIGNED_URL_SECONDS);
  const out = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  }
  return out;
}

function toProfile(row: CardRow, cover: string | undefined, now: number): SeedProfile {
  const age = row.birth_year ? new Date().getFullYear() - row.birth_year : 18;
  return {
    id: row.id,
    slug: row.slug,
    name: row.display_name,
    age,
    gender: row.gender ?? "nonbinary",
    city: row.city_name,
    citySlug: row.city_slug,
    area: row.area_name ?? row.city_name,
    areaSlug: row.area_slug ?? "",
    verified: row.is_verified,
    presence: "recent",
    bio: row.bio ?? "",
    prompts: row.prompts ?? [],
    lookingFor: row.looking_for ?? undefined,
    photos: cover ? [cover] : [],
    verification: { phone: true, identity: row.is_verified, profile: true, established: row.is_verified },
    featured: Boolean(row.boost_until && Date.parse(row.boost_until) > now),
    views: 0,
    likes: 0,
    indexPublic: false,
    isTest: Boolean(row.is_test),
  };
}

/** Live members for a city from `live_profile_cards` (RLS + Incognito applied in the database). */
export async function liveProfiles(input: { citySlug: string; gender: "man" | "woman" | "any"; limit?: number }) {
  if (!isSupabaseConfigured()) return [] as SeedProfile[];
  const supabase = await createClient();
  let query = supabase
    .from("live_profile_cards")
    .select(
      "id, slug, display_name, birth_year, gender, looking_for, is_verified, boost_until, city_slug, city_name, area_slug, area_name, cover_path, bio, prompts, is_test",
    )
    .eq("city_slug", input.citySlug)
    .not("cover_path", "is", null)
    .order("boost_until", { ascending: false, nullsFirst: false })
    .limit(input.limit ?? 80);
  if (input.gender !== "any") query = query.eq("gender", input.gender);

  const { data } = await query;
  const rows = (data ?? []) as CardRow[];
  const covers = await signCovers(rows.map((row) => row.cover_path).filter((p): p is string => Boolean(p)));
  const now = Date.now();
  return rows
    .map((row) => toProfile(row, row.cover_path ? covers.get(row.cover_path) : undefined, now))
    .filter((profile) => profile.photos.length > 0);
}

/** One live member by slug, with bio. */
export async function liveProfileBySlug(slug: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("live_profile_cards")
    .select(
      "id, slug, display_name, birth_year, gender, looking_for, is_verified, boost_until, city_slug, city_name, area_slug, area_name, cover_path, is_test",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const row = data as CardRow;
  const [{ data: bioRow }, covers] = await Promise.all([
    supabase.from("profiles").select("bio, prompts").eq("id", row.id).maybeSingle(),
    signCovers(row.cover_path ? [row.cover_path] : []),
  ]);
  const profile = toProfile(row, row.cover_path ? covers.get(row.cover_path) : undefined, Date.now());
  return {
    ...profile,
    bio: (bioRow?.bio as string | null) ?? "",
    prompts: (bioRow?.prompts as { q: string; a: string }[] | null) ?? [],
  };
}

/**
 * Discover deck: real members first (ranked the same way), demo profiles only when allowed.
 * Server only — uses the request's Supabase session.
 */
export async function discoverFeedLive(
  ctx: Parameters<typeof getDiscoverFeed>[0] & { citySlug: string; gender: "man" | "woman" | "any" },
) {
  const live = await liveProfiles({ citySlug: ctx.citySlug, gender: ctx.gender });
  const ranked = rankProfiles(live, {
    citySlug: ctx.citySlug,
    nearArea: ctx.nearArea,
    gender: ctx.gender,
    intents: ctx.intents ?? [],
    impressedIds: ctx.impressedIds ?? [],
    excludeIds: ctx.excludeIds ?? [],
    minAge: ctx.minAge,
    maxAge: ctx.maxAge,
  });
  const seed = showSeedProfiles() ? getDiscoverFeed({ ...ctx, cursor: 0, limit: 200 }).items : [];
  const all = [...ranked, ...seed];
  const limit = ctx.limit ?? 16;
  const cursor = ctx.cursor ?? 0;
  const items = all.slice(cursor, cursor + limit);
  const next = cursor + items.length;
  return { items, nextCursor: next < all.length ? next : null };
}

/** Browse grid / search for any city: real members first, demo profiles only when allowed. */
export async function browseLive(input: {
  city: string;
  q?: string;
  facet?: string;
  cursor?: number;
  limit?: number;
  gender?: "man" | "woman" | "any";
}) {
  const q = (input.q ?? "").trim().toLowerCase();
  let live = await liveProfiles({ citySlug: input.city, gender: input.gender ?? "any", limit: 120 });
  if (q) live = live.filter((p) => `${p.name} ${p.area}`.toLowerCase().includes(q));
  if (input.facet === "featured") live = live.filter((p) => p.featured);
  if (input.facet === "verified") live = live.filter((p) => p.verified);
  const seed = showSeedProfiles()
    ? browseFeed({ city: input.city, q: input.q, facet: input.facet as never, cursor: 0, limit: 200 }).items
    : [];
  const all = [...live, ...seed];
  const limit = input.limit ?? 16;
  const cursor = input.cursor ?? 0;
  const items = all.slice(cursor, cursor + limit);
  const next = cursor + items.length;
  return { items, nextCursor: next < all.length ? next : null, live: true, waitlist: false };
}

/** Cover photo links for a set of live profile ids (for Likes You and similar grids). */
export async function coversFor(profileIds: string[]) {
  if (!isSupabaseConfigured() || profileIds.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase.from("live_profile_cards").select("id, cover_path").in("id", profileIds);
  const rows = (data ?? []) as { id: string; cover_path: string | null }[];
  const signed = await signCovers(rows.map((r) => r.cover_path).filter((p): p is string => Boolean(p)));
  const out = new Map<string, string>();
  for (const row of rows) {
    const url = row.cover_path ? signed.get(row.cover_path) : undefined;
    if (url) out.set(row.id, url);
  }
  return out;
}
