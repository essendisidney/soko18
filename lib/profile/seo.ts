import type { Metadata } from "next";
import type { SeedProfile } from "@/lib/types";
import { publicPhotos } from "@/lib/media/public";
import { siteUrl } from "@/lib/site";

export function profileHeading(profile: Pick<SeedProfile, "name" | "age" | "area">) {
  return `${profile.name}, ${profile.age} · ${profile.area}, Nairobi`;
}

function placeBreadcrumb(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl()}${item.path}`,
    })),
  };
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

export function nairobiMetadata(): Metadata {
  const title = "Nairobi";
  const description = "Discover people around Nairobi. Local discovery, verified.";
  const url = `${siteUrl()}/nairobi`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export function areaMetadata(name: string, slug: string): Metadata {
  const title = `${name}, Nairobi`;
  const description = `Discover people around ${name}, Nairobi.`;
  const url = `${siteUrl()}/nairobi/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export function categoryMetadata(name: string, slug: string, line: string): Metadata {
  const title = `${name} · Nairobi`;
  const url = `${siteUrl()}/category/${slug}`;
  return {
    title,
    description: line,
    alternates: { canonical: url },
    openGraph: { title, description: line, url },
  };
}

export function profileJsonLd(profile: SeedProfile) {
  if (!profile.indexPublic) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: profileHeading(profile),
    url: `${siteUrl()}/profile/${profile.slug}`,
    breadcrumb: placeBreadcrumb([
      { name: "Nairobi", path: "/nairobi" },
      { name: profile.area, path: `/nairobi/${profile.areaSlug}` },
      { name: profile.name, path: `/profile/${profile.slug}` },
    ]),
    mainEntity: {
      "@type": "Person",
      name: profile.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: profile.area,
        addressRegion: "Nairobi",
        addressCountry: "KE",
      },
    },
  };
}

export function nairobiJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Nairobi",
    url: `${siteUrl()}/nairobi`,
    about: {
      "@type": "City",
      name: "Nairobi",
      containedInPlace: { "@type": "Country", name: "Kenya" },
    },
  };
}

export function areaJsonLd(name: string, slug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${name}, Nairobi`,
    url: `${siteUrl()}/nairobi/${slug}`,
    about: {
      "@type": "Place",
      name,
      containedInPlace: { "@type": "City", name: "Nairobi" },
    },
    breadcrumb: placeBreadcrumb([
      { name: "Nairobi", path: "/nairobi" },
      { name, path: `/nairobi/${slug}` },
    ]),
  };
}

export function categoryJsonLd(name: string, slug: string, line: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${name} · Nairobi`,
    description: line,
    url: `${siteUrl()}/category/${slug}`,
    about: { "@type": "City", name: "Nairobi" },
    breadcrumb: placeBreadcrumb([
      { name: "Nairobi", path: "/nairobi" },
      { name, path: `/category/${slug}` },
    ]),
  };
}
