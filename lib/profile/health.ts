import type { SeedProfile } from "@/lib/types";
import type { ProfileDraft } from "@/lib/profile/types";
import { publicPhotos } from "@/lib/media/public";
import { sokoVerified } from "@/lib/trust/verified";

export function profileHealth(profile: SeedProfile) {
  const photos = publicPhotos(profile);
  const checks = [
    { ok: photos.length >= 1, label: "Profile photo" },
    { ok: sokoVerified(profile), label: "Verification" },
    { ok: Boolean(profile.bio), label: "Bio" },
    { ok: photos.length >= 3, label: "Add more photos" },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { score, checks };
}

export function draftHealth(
  draft: Pick<ProfileDraft, "displayName" | "birthYear" | "areaSlug" | "bio"> &
    Partial<Pick<ProfileDraft, "gender" | "lookingFor">>,
) {
  const checks = [
    { ok: Boolean(draft.displayName.trim()), label: "First name" },
    { ok: draft.birthYear !== null, label: "Year of birth" },
    { ok: Boolean(draft.areaSlug), label: "Area" },
    { ok: Boolean(draft.bio.trim()), label: "About you" },
    ...(draft.gender !== undefined ? [{ ok: Boolean(draft.gender), label: "I am" }] : []),
    ...(draft.lookingFor !== undefined ? [{ ok: Boolean(draft.lookingFor), label: "Looking for" }] : []),
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { score, checks };
}
