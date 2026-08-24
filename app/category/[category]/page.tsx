import { notFound } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { slug: "verified", name: "Verified" },
  { slug: "trending", name: "Trending" },
  { slug: "featured", name: "Featured" },
];

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const meta = CATEGORIES.find((c) => c.slug === category);
  if (!meta) notFound();

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-5 pt-10">
      <p className="text-[11px] tracking-[0.22em] text-gold uppercase">Category</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{meta.name}</h1>
      <Link href="/browse" className="mt-6 inline-block text-sm text-muted">
        Browse cities
      </Link>
    </main>
  );
}
