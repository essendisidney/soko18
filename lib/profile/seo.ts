import type { Metadata } from "next";
import type { SeedProfile } from "@/lib/types";
import { publicPhotos } from "@/lib/media/public";
import { siteUrl } from "@/lib/site";

export function profileHeading(profile: Pick<SeedProfile, "name" | "age" | "area">) {
  return `${profile.name}, ${profile.age} · ${profile.area}, Nairobi`;
}

function absUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function profileMetadata(profile: SeedProfile): Metadata {
  const title = profileHeading(profile);
  const description = profile.bio.trim() || `Discover ${profile.name} in ${profile.area}, Nairobi.`;
  const cover = publicPhotos(profile)[0];
  const url = `${siteUrl()}/profile/${profile.slug}`;
  const image = cover ? absUrl(cover) : undefined;

  return {
    title,
    description,
    robots: profile.indexPublic ? { index: true, follow: true } : { index: false, follow: true },
    alternates: profile.indexPublic ? { canonical: url } : undefined,
    openGraph: {
      title,
      description,
      url,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export function areaMetadata(name: string, slug: string): Metadata {
  const title = `${name}, Nairobi`;
  const description = `Discover people around ${name}, Nairobi.`;
  const url = `${siteUrl()}/nairobi/${slug}`;
  return {
    title,
    description,
    openGraph: { title, description, url },
  };
}
