import type { SeedProfile } from "@/lib/types";
import type { ProfileDraft } from "@/lib/profile/types";
import { publicPhotos } from "@/lib/media/public";

export function profileHealth(profile: SeedProfile) {
  const photos = publicPhotos(profile);
  const checks = [
    { ok: photos.length >= 1, label: "Profile photo" },
    { ok: profile.verified, label: "Verification" },
    { ok: Boolean(profile.bio), label: "Bio" },
    { ok: photos.length >= 3, label: "Add more photos" },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { score, checks };
}

export function draftHealth(draft: Pick<ProfileDraft, "displayName" | "birthYear" | "areaSlug" | "bio">) {
  const checks = [
    { ok: Boolean(draft.displayName.trim()), label: "Name" },
    { ok: draft.birthYear !== null, label: "Age" },
    { ok: Boolean(draft.areaSlug), label: "Area" },
    { ok: Boolean(draft.bio.trim()), label: "Bio" },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { score, checks };
}
