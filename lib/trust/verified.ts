import type { SeedProfile, Verification } from "@/lib/types";

/** SOKO18 Verified is phone + identity + profile reviewed. Established is extra, not a gold tick. */
export function checksVerified(v: Verification) {
  return Boolean(v.phone && v.identity && v.profile);
}

export function sokoVerified(profile: Pick<SeedProfile, "verification">) {
  return checksVerified(profile.verification);
}
