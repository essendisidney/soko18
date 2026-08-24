import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NAIROBI_AREAS, areaBySlug } from "@/lib/data/nairobi";
import { profilesInArea } from "@/lib/data/seed";
import { hasApprovedCover } from "@/lib/media/public";
import { Button } from "@/components/soko/button";
import { Wordmark } from "@/components/brand/wordmark";
import { ProfileGrid } from "@/components/profile/profile-grid";
import { activeNow } from "@/lib/nairobi/live";

export function generateStaticParams() {
  return NAIROBI_AREAS.map((area) => ({ area: area.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const meta = areaBySlug(area);
  if (!meta) return { title: "Nairobi" };
  return {
    title: `${meta.name}, Nairobi`,
    description: `Discover people around ${meta.name}, Nairobi.`,
  };
}

export default async function NairobiAreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const meta = areaBySlug(area);
  if (!meta) notFound();
  const people = profilesInArea(meta.slug).filter(hasApprovedCover);
  const live = activeNow().areas.find((a) => a.slug === meta.slug)?.count ?? 0;

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-5 pt-6 pb-16">
      <Wordmark size="sm" />
      <p className="mt-10 text-[13px] tracking-[0.22em] text-gold uppercase">Nairobi</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{meta.name}</h1>
      <p className="mt-2 text-sm text-muted">
        {people.length} live · {live} active now · area-level only
      </p>
      <Link href="/discover" className="mt-6 inline-block">
        <Button variant="gold">Discover</Button>
      </Link>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <ProfileGrid profiles={people} />
      </div>
      <Link href="/nairobi" className="mt-8 inline-block text-sm text-muted">
        All of Nairobi
      </Link>
    </main>
  );
}
