import { currentUser } from "@/lib/auth/user";
import { nairobiProfiles } from "@/lib/data/seed";
import { seedAccountId } from "@/lib/likes/ids";
import { readLikeState } from "@/lib/likes/state";
import { coverPhoto } from "@/lib/media/public";
import { createClient } from "@/lib/supabase/server";

export type MatchListItem = {
  id: string;
  conversationId: string;
  profileId: string;
  otherAccountId: string;
  slug: string;
  name: string;
  area: string;
  verified: boolean;
  presence: "active" | "recent" | "offline";
  photo: string | null;
  createdAt: string;
};

export async function listMatches(): Promise<MatchListItem[]> {
  const user = await currentUser();
  if (!user) return [];

  const seed = await readLikeState(user.id);
  const catalog = nairobiProfiles();
  const items: MatchListItem[] = seed.matches.flatMap((row) => {
    const profile = catalog.find((p) => p.id === row.profileId);
    if (!profile) return [];
    const otherAccountId =
      row.accountA === user.id
        ? row.accountB
        : row.accountB === user.id
          ? row.accountA
          : seedAccountId(profile.id);
    return [
      {
        id: row.id,
        conversationId: row.conversationId,
        profileId: profile.id,
        otherAccountId,
        slug: profile.slug,
        name: profile.name,
        area: profile.area,
        verified: profile.verified,
        presence: profile.presence,
        photo: coverPhoto(profile),
        createdAt: row.createdAt,
      },
    ];
  });

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("matches")
    .select("id, profile_id, created_at, account_a, account_b")
    .or(`account_a.eq.${user.id},account_b.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const live = rows ?? [];
  const matchIds = live.map((row) => row.id);
  const profileIds = live.map((row) => row.profile_id);

  const { data: convos } = matchIds.length
    ? await supabase.from("conversations").select("id, match_id").in("match_id", matchIds)
    : { data: [] as { id: string; match_id: string }[] };
  const { data: profiles } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, slug, display_name, is_verified")
        .in("id", profileIds)
    : { data: [] as { id: string; slug: string; display_name: string; is_verified: boolean }[] };

  const convoByMatch = new Map((convos ?? []).map((row) => [row.match_id, row.id]));
  const profileById = new Map((profiles ?? []).map((row) => [row.id, row]));

  for (const row of live) {
    const conversationId = convoByMatch.get(row.id);
    const profile = profileById.get(row.profile_id);
    if (!conversationId) continue;
    items.push({
      id: row.id,
      conversationId,
      profileId: row.profile_id,
      otherAccountId: row.account_a === user.id ? row.account_b : row.account_a,
      slug: profile?.slug ?? row.profile_id,
      name: profile?.display_name ?? "Match",
      area: "Nairobi",
      verified: Boolean(profile?.is_verified),
      presence: "recent",
      photo: null,
      createdAt: row.created_at,
    });
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.profileId)) return false;
    seen.add(item.profileId);
    return true;
  });
}

export async function hasMatch(id: string) {
  const matches = await listMatches();
  return matches.some(
    (item) => item.slug === id || item.id === id || item.conversationId === id || item.profileId === id,
  );
}
