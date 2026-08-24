import type { SeedProfile } from "@/lib/types";

export function profileHealth(profile: SeedProfile) {
  const checks = [
    { ok: profile.photos.length >= 1, label: "Profile photo" },
    { ok: profile.verified, label: "Verification" },
    { ok: Boolean(profile.bio), label: "Bio" },
    { ok: profile.photos.length >= 3, label: "Add more photos" },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { score, checks };
}
