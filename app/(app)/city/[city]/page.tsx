import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WAITLIST_CITIES } from "@/lib/data/nairobi";
import { waitlistCity } from "@/lib/data/waitlist";

export function generateStaticParams() {
  return [{ city: "nairobi" }, ...WAITLIST_CITIES.map((c) => ({ city: c.slug }))];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  if (city === "nairobi") return { title: "Nairobi" };
  const meta = waitlistCity(city);
  if (!meta) return { title: "City" };
  return {
    title: meta.name,
    description: `Use SOKO18 from ${meta.name}. Discover is live in Nairobi first.`,
    robots: { index: false, follow: true },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  if (city === "nairobi") redirect("/nairobi");
  if (waitlistCity(city)) redirect(`/${city}`);
  notFound();
}
