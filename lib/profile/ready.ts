import type { ProfileDraft } from "@/lib/profile/types";

/**
 * What a profile needs before it can go live. Mirrors private.profile_ready() in the database
 * (supabase/migrations/00028_live_first.sql) so the app and the server agree.
 */
export function missingToGoLive(
  profile: Pick<ProfileDraft, "displayName" | "areaSlug" | "gender" | "lookingFor"> | null,
  photos: number,
) {
  if (!profile) return ["a photo", "your name", "your area", "who you are", "what you’re looking for"];
  return [
    photos >= 1 ? null : "a photo",
    profile.displayName?.trim() ? null : "your name",
    profile.areaSlug ? null : "your area",
    profile.gender ? null : "who you are",
    profile.lookingFor ? null : "what you’re looking for",
  ].filter((x): x is string => Boolean(x));
}

/** Can this member like people? Only once others can see them back. */
export function canEngage(profile: Pick<ProfileDraft, "status"> | null) {
  return profile?.status === "live" || profile?.status === "pending_review";
}
