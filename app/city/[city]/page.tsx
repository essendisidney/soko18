import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WAITLIST_CITIES } from "@/lib/data/nairobi";
import { Button } from "@/components/soko/button";
import { Wordmark } from "@/components/brand/wordmark";
import { WaitlistButton } from "@/components/nairobi/waitlist-button";

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

  const meta = WAITLIST_CITIES.find((c) => c.slug === city);
  if (!meta) notFound();

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-5 pt-6 pb-16">
      <Wordmark size="sm" />
      <p className="mt-10 text-[13px] tracking-[0.22em] text-gold uppercase">{meta.name}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Coming after Nairobi.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        SOKO18 launches city by city. We will not dilute Nairobi to look national.
      </p>
      <WaitlistButton slug={meta.slug} />
      <Link href="/nairobi" className="mt-4 block">
        <Button variant="ghost" className="w-full">
          Discover Nairobi
        </Button>
      </Link>
    </main>
  );
}
