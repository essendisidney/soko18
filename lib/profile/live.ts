import { getProfile } from "@/lib/data/seed";
import { hasApprovedCover, publicPhotos } from "@/lib/media/public";

/** Public listings only. Drafts and unapproved media never belong here. */
export function getLiveProfile(slug: string) {
  const profile = getProfile(slug);
  if (!profile || !hasApprovedCover(profile)) return null;
  return { ...profile, photos: publicPhotos(profile) };
}
