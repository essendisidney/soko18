import { writeDiscoverAction } from "@/lib/discovery/actions";
import { postLike } from "@/lib/likes/client";
import { writeMatchWaiting } from "@/lib/matches/waiting";
import type { SeedProfile } from "@/lib/types";

export function engageProfile(
  profile: SeedProfile,
  kind: "like" | "spotlight",
  onNewMatch: (profile: SeedProfile) => void,
) {
  writeDiscoverAction({ profileId: profile.id, kind, at: Date.now() });
  void postLike(profile.id, kind).then((result) => {
    if (result.ok && result.data.isNew) {
      writeMatchWaiting(profile.id, true);
      onNewMatch(profile);
    }
  });
}
