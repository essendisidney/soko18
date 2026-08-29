import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WaitlistHome } from "@/components/city/waitlist-home";
import { WAITLIST_CITIES } from "@/lib/data/nairobi";
import { waitlistAreas, waitlistCity } from "@/lib/data/waitlist";

export function generateStaticParams() {
  return WAITLIST_CITIES.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const meta = waitlistCity(city);
  if (!meta) return { title: "City" };
  return {
    title: meta.name,
    description: `SOKO18 is live in Nairobi first. ${meta.name} opens when Nairobi has density.`,
    robots: { index: false, follow: true },
  };
}

export default async function WaitlistCityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const meta = waitlistCity(city);
  if (!meta) notFound();

  return (
    <WaitlistHome name={meta.name} slug={meta.slug} areas={waitlistAreas(meta.slug)} areaBase={`/${meta.slug}`} />
  );
}
