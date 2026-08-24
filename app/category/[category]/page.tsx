import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BROWSE_CATEGORIES, categoryBySlug } from "@/lib/browse/categories";
import { browseFeed } from "@/lib/browse/feed";
import { ProfileCard } from "@/components/soko/profile-card";
import { Wordmark } from "@/components/brand/wordmark";

export function generateStaticParams() {
  return BROWSE_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const meta = categoryBySlug(category);
  if (!meta) return { title: "Nairobi" };
  return {
    title: `${meta.name} · Nairobi`,
    description: meta.line,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = categoryBySlug(category);
  if (!meta) notFound();

  const { items } = browseFeed({ city: "nairobi", facet: meta.slug, limit: 24 });

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-5 pt-6 pb-16">
      <Wordmark size="sm" />
      <p className="mt-10 text-[13px] tracking-[0.22em] text-gold uppercase">Nairobi</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{meta.name}</h1>
      <p className="mt-2 text-sm text-muted">{meta.line}</p>
      <div className="mt-8 grid grid-cols-2 gap-3">
        {items.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} compact href={`/profile/${profile.slug}`} />
        ))}
        {items.length === 0 ? (
          <p className="col-span-2 text-sm text-muted">Nothing in this list yet.</p>
        ) : null}
      </div>
      <Link href="/nairobi" className="mt-8 inline-block text-sm text-muted">
        All of Nairobi
      </Link>
    </main>
  );
}
