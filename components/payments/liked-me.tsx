"use client";

import { useT } from "@/lib/i18n/use-t";
import { useDraftProfile } from "@/lib/profile/use-draft";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Lock, Star, Zap } from "lucide-react";
import { Button } from "@/components/soko/button";

type Person = { profileId: string; slug: string; name: string; super: boolean; at: string; photo?: string | null };
type LikedMe = { count: number; locked: boolean; people: Person[] | null };
type Intro = { id: string; body: string; at: string; profileId: string; slug: string; name: string };
type State = { kind: "loading" } | { kind: "signed-out" } | { kind: "error" } | { kind: "ready"; data: LikedMe };

// Soft, non-identifying tiles for locked likes. Real photos never reach the browser until unlocked.
const TEASERS = [
  "from-rose-400/40 via-amber-200/20 to-transparent",
  "from-amber-300/40 via-rose-300/15 to-transparent",
  "from-fuchsia-400/35 via-amber-200/15 to-transparent",
  "from-orange-300/40 via-pink-300/15 to-transparent",
  "from-amber-200/40 via-violet-300/15 to-transparent",
  "from-pink-400/35 via-amber-300/15 to-transparent",
];

export function LikedMeList() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [intros, setIntros] = useState<Intro[]>([]);
  const t = useT();
  const myLive = useDraftProfile()?.status === "live";

  useEffect(() => {
    void fetch("/api/likes/received")
      .then(async (res) => {
        if (res.status === 401) return setState({ kind: "signed-out" });
        const json = (await res.json().catch(() => null)) as { data?: LikedMe } | null;
        setState(res.ok && json?.data ? { kind: "ready", data: json.data } : { kind: "error" });
      })
      .catch(() => setState({ kind: "error" }));
    void fetch("/api/intros")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: Intro[] } | null) => setIntros(json?.data ?? []))
      .catch(() => {});
  }, []);

  const count = state.kind === "ready" ? state.data.count : 0;

  return (
    <div className="pb-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[34px] leading-none tracking-tight">{t("likes.title")}</h1>
          <p className="mt-2 text-sm text-muted">
            {state.kind === "ready" && count > 0
              ? `${count} ${count === 1 ? "person likes" : "people like"} you`
              : "People who swiped right on you"}
          </p>
        </div>
        {count > 0 ? (
          <span className="grid size-11 place-items-center rounded-full bg-gold font-display text-lg text-bg">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </header>

      {intros.length > 0 ? (
        <section className="mt-6 space-y-2">
          <p className="text-[11px] tracking-[0.18em] text-muted uppercase">{t("likes.waiting")}</p>
          {intros.map((intro) => (
            <Link key={intro.id} href={`/profile/${intro.slug}`} className="block rounded-3xl border border-gold/50 bg-gold/5 p-4">
              <p className="text-sm font-medium">{intro.name}</p>
              <p className="mt-1 text-[15px] text-cream/90">“{intro.body}”</p>
              <p className="mt-2 text-xs text-gold">{t("likes.likeBack")}</p>
            </Link>
          ))}
        </section>
      ) : null}

      {state.kind === "loading" ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-white/5" />
          ))}
        </div>
      ) : null}

      {state.kind === "signed-out" ? (
        <Locked
          tiles={4}
          title="See who likes you"
          body="Sign in to see how many people liked you — and match with them instantly."
          cta={{ href: "/login?next=/likes", label: "Sign in" }}
        />
      ) : null}

      {state.kind === "error" ? <p className="mt-6 text-sm text-muted">Couldn’t load your likes. Try again in a moment.</p> : null}

      {state.kind === "ready" && count === 0 ? (
        <section className="mt-10 flex flex-col items-center text-center">
          <div className="grid size-20 place-items-center rounded-full border border-gold/40 bg-gold/10">
            <Heart className="size-9 text-gold" />
          </div>
          <p className="mt-5 font-display text-2xl">No likes yet</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            {myLive
              ? "Likes show up here. The more you swipe, the more people see you."
              : "People can only like you once your profile is live. It takes about a minute."}
          </p>
          <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
            {myLive ? (
              <>
                <Link href="/discover">
                  <Button className="w-full" variant="gold">
                    Keep swiping
                  </Button>
                </Link>
                <Link href="/upgrade#boost">
                  <Button className="w-full" variant="ghost">
                    <Zap className="size-4" /> Get seen first with a Boost
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/studio/profile">
                <Button className="w-full" variant="gold">
                  Finish my profile
                </Button>
              </Link>
            )}
          </div>
        </section>
      ) : null}

      {state.kind === "ready" && count > 0 && state.data.locked ? (
        <Locked
          tiles={Math.min(Math.max(count, 2), 6)}
          title={t("likes.seeWho")}
          body={t("likes.goldShows")}
          cta={{ href: "/upgrade", label: "See who likes you · Gold" }}
        />
      ) : null}

      {state.kind === "ready" && count > 0 && !state.data.locked ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {(state.data.people ?? []).map((person) => (
            <Link key={person.profileId} href={`/profile/${person.slug}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-white/5">
                {person.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.photo}
                    alt={person.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.03]"
                    loading="lazy"
                  />
                ) : null}
                <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent" />
                {person.super ? (
                  <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Star className="size-3 fill-white" /> SUPER
                  </span>
                ) : null}
                <p className="absolute inset-x-3 bottom-3 truncate font-display text-lg">{person.name}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Locked({
  tiles,
  title,
  body,
  cta,
}: {
  tiles: number;
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3" aria-hidden>
        {Array.from({ length: tiles }).map((_, i) => (
          <div
            key={i}
            className={`relative aspect-[3/4] overflow-hidden rounded-3xl border border-white/5 bg-bg-elevated bg-linear-to-br ${TEASERS[i % TEASERS.length]}`}
          >
            <div className="absolute inset-0 backdrop-blur-2xl" />
            <div className="absolute inset-x-4 bottom-4 space-y-2">
              <div className="h-3 w-2/3 rounded-full bg-white/20" />
              <div className="h-2.5 w-1/3 rounded-full bg-white/10" />
            </div>
            <Lock className="absolute top-3 right-3 size-4 text-white/60" />
          </div>
        ))}
      </div>
      <div className="sticky bottom-24 z-10 mt-5 rounded-3xl border border-gold/60 bg-bg/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <p className="font-display text-2xl">{title}</p>
        <p className="mt-1.5 text-sm text-muted">{body}</p>
        <Link href={cta.href}>
          <Button className="mt-4 w-full" variant="gold">
            {cta.label}
          </Button>
        </Link>
      </div>
    </>
  );
}
