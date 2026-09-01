import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/soko/button";

export function LegalPage({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg px-6 pt-10 pb-16">
      <Wordmark size="sm" />
      <p className="mt-8 text-[13px] tracking-[0.2em] text-gold uppercase">{kicker}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{title}</h1>
      <div className="mt-8 space-y-8">{children}</div>
      <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/safety">Safety</Link>
      </nav>
      <Link href="/discover" className="mt-8 block">
        <Button variant="gold" className="w-full">
          Discover
        </Button>
      </Link>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-cream/80">{children}</div>
    </section>
  );
}
