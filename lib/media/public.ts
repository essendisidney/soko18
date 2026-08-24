import type { SeedProfile } from "@/lib/types";
import { isPublicMediaStatus, type MediaItem } from "@/lib/media/types";

/** Seed catalog photos are already approved. Owner uploads never enter this list. */
export function publicPhotos(profile: SeedProfile) {
  return profile.photos.filter((src) => src.startsWith("https://"));
}

export function coverPhoto(profile: SeedProfile) {
  return publicPhotos(profile)[0] ?? null;
}

export function hasApprovedCover(profile: SeedProfile) {
  return Boolean(coverPhoto(profile));
}

export function publicMediaUrls(items: MediaItem[]) {
  return items.filter((item) => isPublicMediaStatus(item.status)).map((item) => item.path).filter((path) => path.startsWith("https://"));
}
