import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WaitlistButton } from "@/components/nairobi/waitlist-button";
import { Button } from "@/components/soko/button";
import { KISUMU, KISUMU_AREAS, kisumuAreaBySlug } from "@/lib/data/kisumu";

export function generateStaticParams() {
  return KISUMU_AREAS.map((area) => ({ area: area.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area } = await params;
  const meta = kisumuAreaBySlug(area);
  if (!meta) return { title: "Kisumu" };
  return {
    title: `${meta.name}, Kisumu`,
    description: `SOKO18 is live in Nairobi first. ${meta.name}, Kisumu opens when Nairobi has density.`,
    robots: { index: false, follow: true },
  };
}

export default async function KisumuAreaPage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const meta = kisumuAreaBySlug(area);
  if (!meta) notFound();

  return (
    <div>
      <p className="text-[13px] tracking-[0.22em] text-gold uppercase">{KISUMU.name}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{meta.name}</h1>
      <p className="mt-2 text-sm text-muted">Coming after Nairobi. Area-level only.</p>
      <WaitlistButton slug={KISUMU.slug} />
      <Link href="/discover" className="mt-4 block">
        <Button variant="ghost" className="w-full">
          Discover Nairobi
        </Button>
      </Link>
      <Link href="/kisumu" className="mt-8 inline-block text-sm text-muted">
        All of Kisumu
      </Link>
    </div>
  );
}
