"use client";

import { useT } from "@/lib/i18n/use-t";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/soko/button";

type Person = { profileId: string; slug: string; name: string; super: boolean; at: string; photo?: string | null };
type LikedMe = { count: number; locked: boolean; people: Person[] | null };
type Intro = { id: string; body: string; at: string; profileId: string; slug: string; name: string };

export function LikedMeList() {
  const [data, setData] = useState<LikedMe | null>(null);
  const [intros, setIntros] = useState<Intro[]>([]);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  useEffect(() => {
    void fetch("/api/likes/received")
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as { data?: LikedMe; error?: { message: string } } | null;
        if (!res.ok || !json?.data) {
          setError(json?.error?.message ?? "Sign in to see your likes.");
          return;
        }
        setData(json.data);
      })
      .catch(() => setError("Could not load likes."));
    void fetch("/api/intros")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Intro[] } | null) => setIntros(json?.data ?? []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl tracking-tight">{t("likes.title")}</h1>
      {error ? <p className="mt-4 text-sm text-muted">{error}</p> : null}

      {intros.length > 0 ? (
        <section className="mt-6 space-y-2">
          <p className="text-xs tracking-[0.16em] text-muted uppercase">{t("likes.waiting")}</p>
          {intros.map((intro) => (
            <Link key={intro.id} href={`/profile/${intro.slug}`} className="block rounded-2xl border border-gold/60 p-4">
              <p className="text-sm font-medium">{intro.name}</p>
              <p className="mt-1 text-sm text-cream/90">“{intro.body}”</p>
              <p className="mt-2 text-xs text-gold">{t("likes.likeBack")}</p>
            </Link>
          ))}
        </section>
      ) : null}

      {data ? (
        <>
          <p className="mt-6 text-sm text-muted">
            {data.count === 0
              ? "No new likes yet. A Boost puts you at the top of the deck for 30 minutes."
              : `${data.count} ${data.count === 1 ? "person likes" : "people like"} you.`}
          </p>
          {data.locked ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden>
                {Array.from({ length: Math.min(Math.max(data.count, 3), 9) }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] rounded-2xl bg-[linear-gradient(135deg,rgba(212,181,106,0.25),rgba(255,255,255,0.04))] blur-[1px]"
                  />
                ))}
              </div>
              <div className="mt-6 rounded-3xl border border-gold p-5">
                <p className="font-display text-2xl">{t("likes.seeWho")}</p>
                <p className="mt-2 text-sm text-muted">{t("likes.goldShows")}</p>
                <Link href="/upgrade">
                  <Button className="mt-4 w-full" variant="gold">
                    {t("discover.getGold")}
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {(data.people ?? []).map((person) => (
                <Link key={person.profileId} href={`/profile/${person.slug}`} className="block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5">
                    {person.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={person.photo} alt={person.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                    {person.super ? (
                      <span className="absolute top-1 left-1 rounded-full bg-black/60 px-1.5 text-[9px] text-gold">SUPER</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs">{person.name}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
