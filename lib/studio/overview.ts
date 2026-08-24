import { currentUser } from "@/lib/auth/user";
import { requestedProfileAllowed, formatDelta } from "@/lib/studio/own";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type StudioOverview = {
  profile: {
    id: string;
    slug: string;
    displayName: string;
    status: string;
  } | null;
  stats: {
    views: number;
    likes: number;
    connections: number;
    viewsDelta: string | null;
    likesDelta: string | null;
    connectionsDelta: string | null;
  };
  health: {
    score: number;
    checks: { ok: boolean; label: string }[];
  } | null;
  boost: {
    flagged: true;
    active: boolean;
  };
  promotions: {
    boostUntil: string | null;
    spotlightUntil: string | null;
    featuredUntil: string | null;
    live: {
      boost: boolean;
      spotlight: boolean;
      featured: boolean;
    };
  };
};

export type StudioOverviewResult =
  | { ok: true; data: StudioOverview }
  | { ok: false; status: number; error: { code: string; message: string } };

export async function getStudioOverview(requestedProfileId?: string | null): Promise<StudioOverviewResult> {
  const user = await currentUser();
  if (!user) {
    return { ok: false, status: 401, error: { code: "unauthorized", message: "Sign in to open Studio." } };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, status: 401, error: { code: "unauthorized", message: "Sign in to open Studio." } };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, slug, display_name, status, bio, is_verified, account_id, boost_until, spotlight_until, featured_until")
    .eq("account_id", user.id)
    .maybeSingle();

  if (profile && profile.account_id !== user.id) {
    return { ok: false, status: 403, error: { code: "forbidden", message: "You can only view your own studio." } };
  }

  const ownId = profile?.id ?? null;
  if (!requestedProfileAllowed(requestedProfileId ?? null, ownId)) {
    return { ok: false, status: 403, error: { code: "forbidden", message: "You can only view your own studio." } };
  }

  if (!profile) {
    return {
      ok: true,
      data: {
        profile: null,
        stats: emptyStats(),
        health: null,
        boost: { flagged: true, active: false },
        promotions: emptyPromotions(),
      },
    };
  }

  const { data: days } = await supabase
    .from("profile_daily_stats")
    .select("day, views, likes, matches")
    .eq("profile_id", profile.id)
    .order("day", { ascending: false })
    .limit(14);

  const recent = (days ?? []).slice(0, 7);
  const previous = (days ?? []).slice(7, 14);
  const sum = (rows: typeof recent, key: "views" | "likes" | "matches") =>
    rows.reduce((total, row) => total + (row[key] ?? 0), 0);

  const views = sum(recent, "views");
  const likes = sum(recent, "likes");
  const { count: connections } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`account_a.eq.${user.id},account_b.eq.${user.id}`);

  const { count: photos } = await supabase
    .from("profile_media")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .eq("status", "approved");

  const photoCount = photos ?? 0;
  const checks = [
    { ok: photoCount >= 1, label: "Profile photo" },
    { ok: Boolean(profile.is_verified), label: "Verification" },
    { ok: Boolean(profile.bio), label: "Bio" },
    { ok: photoCount >= 3, label: "Add more photos" },
  ];

  return {
    ok: true,
    data: {
      profile: {
        id: profile.id,
        slug: profile.slug,
        displayName: profile.display_name,
        status: profile.status,
      },
      stats: {
        views,
        likes,
        connections: connections ?? 0,
        viewsDelta: formatDelta(views, previous.length ? sum(previous, "views") : null),
        likesDelta: formatDelta(likes, previous.length ? sum(previous, "likes") : null),
        connectionsDelta: null,
      },
      health: {
        score: Math.round((checks.filter((c) => c.ok).length / checks.length) * 100),
        checks,
      },
      boost: { flagged: true, active: stillActive(profile.boost_until) },
      promotions: {
        boostUntil: profile.boost_until,
        spotlightUntil: profile.spotlight_until,
        featuredUntil: profile.featured_until,
        live: {
          boost: stillActive(profile.boost_until),
          spotlight: stillActive(profile.spotlight_until),
          featured: stillActive(profile.featured_until),
        },
      },
    },
  };
}

function stillActive(until: string | null) {
  return Boolean(until && Date.parse(until) > Date.now());
}

function emptyPromotions(): StudioOverview["promotions"] {
  return {
    boostUntil: null,
    spotlightUntil: null,
    featuredUntil: null,
    live: { boost: false, spotlight: false, featured: false },
  };
}

function emptyStats(): StudioOverview["stats"] {
  return {
    views: 0,
    likes: 0,
    connections: 0,
    viewsDelta: null,
    likesDelta: null,
    connectionsDelta: null,
  };
}
