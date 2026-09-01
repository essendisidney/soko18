import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WaitlistArea } from "@/components/city/waitlist-area";
import { WAITLIST_CITIES } from "@/lib/data/nairobi";
import { waitlistArea, waitlistAreas, waitlistCity } from "@/lib/data/waitlist";

export function generateStaticParams() {
  return WAITLIST_CITIES.flatMap((city) =>
    waitlistAreas(city.slug).map((area) => ({ city: city.slug, area: area.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; area: string }>;
}): Promise<Metadata> {
  const { city, area } = await params;
  const meta = waitlistCity(city);
  const place = waitlistArea(city, area);
  if (!meta || !place) return { title: "City" };
  return {
    title: `${place.name}, ${meta.name}`,
    description: `Men around you in ${place.name}, ${meta.name}. Area-level only.`,
    robots: { index: false, follow: true },
  };
}

export default async function WaitlistAreaPage({
  params,
}: {
  params: Promise<{ city: string; area: string }>;
}) {
  const { city, area } = await params;
  const meta = waitlistCity(city);
  const place = waitlistArea(city, area);
  if (!meta || !place) notFound();

  return <WaitlistArea cityName={meta.name} citySlug={meta.slug} areaName={place.name} areaSlug={place.slug} />;
}
