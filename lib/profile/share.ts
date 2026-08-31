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
  if (typeof window === "undefined") return `/nairobi/${slug}`;
  return `${window.location.origin}/nairobi/${slug}`;
}

export function nairobiUrl() {
  if (typeof window === "undefined") return "/nairobi";
  return `${window.location.origin}/nairobi`;
}
