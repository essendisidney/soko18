import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WaitlistHome } from "@/components/city/waitlist-home";
import { WAITLIST_CITIES } from "@/lib/data/nairobi";
import { KISUMU } from "@/lib/data/kisumu";

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
  if (city === KISUMU.slug) return { title: KISUMU.name };
  const meta = WAITLIST_CITIES.find((c) => c.slug === city);
  if (!meta) return { title: "City" };
  return {
    title: meta.name,
    description: `SOKO18 is live in Nairobi first. ${meta.name} opens when Nairobi has density.`,
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
  if (city === KISUMU.slug) redirect("/kisumu");

  const meta = WAITLIST_CITIES.find((c) => c.slug === city);
  if (!meta) notFound();

  return <WaitlistHome name={meta.name} slug={meta.slug} />;
}
