import { areaBrowseHref } from "@/lib/geo/kenya";

export async function shareProfile(name: string, url: string) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: `${name} on SOKO18`, url });
      return "shared" as const;
    } catch {
      // User cancelled or share failed — fall through to copy.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied" as const;
  } catch {
    return "failed" as const;
  }
}

export function profileUrl(slug: string) {
  if (typeof window === "undefined") return `/profile/${slug}`;
  return `${window.location.origin}/profile/${slug}`;
}

export function areaUrl(slug: string) {
  return placeUrl("nairobi", slug);
}

export function nairobiUrl() {
  return placeUrl("nairobi");
}

export function placeUrl(citySlug: string, areaSlug?: string | null) {
  const path = areaBrowseHref(citySlug, areaSlug);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function categoryUrl(slug: string) {
  if (typeof window === "undefined") return `/category/${slug}`;
  return `${window.location.origin}/category/${slug}`;
}
