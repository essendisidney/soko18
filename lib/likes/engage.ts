import { writeDiscoverAction } from "@/lib/discovery/actions";
import { postLike } from "@/lib/likes/client";
import { writeMatchWaiting } from "@/lib/matches/waiting";
import type { SeedProfile } from "@/lib/types";

/** Why a like didn't go through, when the fix is to buy something. */
export type LikeUpsell = { code: "like_limit" | "no_super_likes"; message: string };

export function engageProfile(
  profile: SeedProfile,
  kind: "like" | "super",
  onNewMatch: (profile: SeedProfile) => void,
  onUpsell?: (upsell: LikeUpsell) => void,
) {
  writeDiscoverAction({ profileId: profile.id, kind, at: Date.now() });
  void postLike(profile.id, kind).then((result) => {
    if (result.ok && result.data.isNew) {
      writeMatchWaiting(profile.id, true);
      onNewMatch(profile);
      return;
    }
    if (!result.ok && (result.code === "like_limit" || result.code === "no_super_likes")) {
      onUpsell?.({ code: result.code, message: result.message ?? "Upgrade to keep going." });
    }
  });
}
