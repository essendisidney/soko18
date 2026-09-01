import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NAIROBI_AREAS, areaBySlug } from "@/lib/data/nairobi";
import { profilesInArea } from "@/lib/data/seed";
import { hasApprovedCover } from "@/lib/media/public";
import { areaJsonLd, areaMetadata } from "@/lib/profile/seo";
import { AreaHome } from "@/components/nairobi/area-home";
import { JsonLd } from "@/components/seo/json-ld";

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
  return areaMetadata(meta.name, meta.slug);
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

  return (
    <>
      <JsonLd data={areaJsonLd(meta.name, meta.slug)} />
      <AreaHome name={meta.name} slug={meta.slug} people={people} />
    </>
  );
}
