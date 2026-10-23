"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BadgeCheck, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/soko/button";
import { hoursLeft, type MyDrop } from "@/lib/drop/shared";
import { INTENTS } from "@/lib/data/nairobi";

type State = { kind: "loading" } | { kind: "signed-out" } | { kind: "error" } | { kind: "ready"; data: MyDrop };

/** Today's picks: a small set at 8pm, next to the normal deck. Never padded, never invented. */
export function DropList() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    void fetch("/api/drop")
      .then(async (res) => {
        if (res.status === 401) return setState({ kind: "signed-out" });
        const json = (await res.json().catch(() => null)) as { data?: MyDrop } | null;
        setState(res.ok && json?.data ? { kind: "ready", data: json.data } : { kind: "error" });
      })
      .catch(() => setState({ kind: "error" }));
  }, []);

  const picks = state.kind === "ready" ? state.data.picks : [];
  const left = state.kind === "ready" ? hoursLeft(state.data.expiresAt) : null;

  return (
    <div className="pb-6">
      <header>
        <h1 className="font-display text-[34px] leading-none tracking-tight">Today’s picks</h1>
        <p className="mt-2 text-sm text-muted">
          {picks.length > 0 && left
            ? `${picks.length} for you · here for ${left} more ${left === 1 ? "hour" : "hours"}`
            : "A few people picked for you, every day at 8pm."}
        </p>
      </header>

      {state.kind === "loading" ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-white/5" />
          ))}
        </div>
      ) : null}

      {state.kind === "signed-out" ? (
        <Empty
          title="Your picks arrive at 8pm"
          body="Sign in and finish your profile to get a few people picked for you every evening."
          cta={{ href: "/login?next=/drop", label: "Sign in" }}
        />
      ) : null}

      {state.kind === "error" ? <p className="mt-6 text-sm text-muted">Couldn’t load today’s picks. Try again in a moment.</p> : null}

      {state.kind === "ready" && picks.length === 0 ? (
        <Empty
          title="Your picks arrive at 8pm"
          body="We pick from real, active people near you. If it’s quiet in your area, the drop is smaller — never filled with fakes."
          cta={{ href: "/discover", label: "Keep swiping" }}
        />
      ) : null}

      {picks.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {picks.map((pick) => (
            <Link key={pick.profileId} href={`/profile/${pick.slug}`} className="group block">
              <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-white/5">
                {pick.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pick.photo} alt={pick.name} className="h-full w-full object-cover" loading="lazy" />
                ) : null}
                <div className="absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-transparent" />
                {pick.acted ? (
                  <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                    <Heart className="size-3 fill-white" /> LIKED
                  </span>
                ) : null}
                <div className="absolute inset-x-3 bottom-3">
                  <p className="flex items-center gap-1 truncate font-display text-lg">
                    {pick.name}
                    {pick.age ? `, ${pick.age}` : ""}
                    {pick.verified ? <BadgeCheck className="size-4 shrink-0 text-sky-400" /> : null}
                  </p>
                  <p className="truncate text-xs text-cream/80">
                    {[pick.area, INTENTS.find((i) => i.id === pick.lookingFor)?.label].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Empty({ title, body, cta }: { title: string; body: string; cta: { href: string; label: string } }) {
  return (
    <section className="mt-10 flex flex-col items-center text-center">
      <div className="grid size-20 place-items-center rounded-full border border-gold/40 bg-gold/10">
        <Sparkles className="size-9 text-gold" />
      </div>
      <p className="mt-5 font-display text-2xl">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-muted">{body}</p>
      <Link href={cta.href} className="mt-6 w-full max-w-xs">
        <Button className="w-full" variant="gold">
          {cta.label}
        </Button>
      </Link>
    </section>
  );
}
