"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { publicPhotos } from "@/lib/media/public";
import { similarProfiles } from "@/lib/data/seed";
import type { SeedProfile } from "@/lib/types";
import { Button } from "@/components/soko/button";
import { PresenceDot } from "@/components/soko/presence-dot";
import { ProfileCard } from "@/components/soko/profile-card";
import { VerificationBadge } from "@/components/soko/verification-badge";
import { AuthGate, type AuthIntent } from "@/components/auth/auth-gate";
import { ImpressionBeacon } from "@/components/analytics/impression-beacon";
import { MatchOverlay } from "@/components/discover/match-overlay";
import { ProfileBack } from "@/components/profile/profile-back";
import { ProfileOverflow } from "@/components/profile/profile-overflow";
import { useAuth } from "@/lib/auth/use-auth";
import { postLike } from "@/lib/likes/client";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { cn } from "@/lib/utils";

export function PublicProfile({ profile }: { profile: SeedProfile }) {
  const { user, ready } = useAuth();
  const [photo, setPhoto] = useState<number | null>(null);
  const [gate, setGate] = useState<AuthIntent | null>(null);
  const [match, setMatch] = useState(false);
  const blocked = useLocalIds(subscribeBlocks, blocksSnapshot).includes(profile.id);
  const more = similarProfiles(profile);
  const v = profile.verification;
  const photos = publicPhotos(profile);

  if (!photos[0]) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg text-muted">
        This profile isn’t available.
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg pb-16">
      <ImpressionBeacon profileId={profile.id} surface="profile" />
      <div className="relative aspect-[3/4]">
        <Image
          src={photos[0]}
          alt={`${profile.name}, ${profile.age}`}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-bg via-transparent to-black/30" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <ProfileBack />
          <ProfileOverflow profile={profile} />
        </div>
      </div>

      <div className="-mt-16 relative px-5">
        {profile.verified ? <VerificationBadge label="SOKO18 Verified" /> : null}
        <h1 className="mt-3 font-display text-4xl tracking-tight">{profile.name}</h1>
        <p className="mt-1 text-cream/80">
          {profile.age} · Nairobi · {profile.area}
        </p>
        <PresenceDot presence={profile.presence} className="mt-2" />
        {blocked ? <p className="mt-3 text-sm text-muted">You blocked them. They won’t appear in Discover or Browse.</p> : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            variant="gold"
            className="w-full"
            disabled={blocked}
            onClick={() => {
              if (blocked) return;
              if (!ready || !user) {
                setGate("like");
                return;
              }
              void postLike(profile.id, "like").then((result) => {
                if (result.ok && result.data.isNew) setMatch(true);
              });
            }}
          >
            <Heart className="size-4 fill-bg" /> Like
          </Button>
          <Link
            href={`/messages/${profile.slug}`}
            onClick={(event) => {
              if (blocked) {
                event.preventDefault();
                return;
              }
              if (!ready || !user) {
                event.preventDefault();
                setGate("message");
              }
            }}
          >
            <Button variant="ghost" className="w-full" disabled={blocked}>
              Message
            </Button>
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">About</h2>
          <p className="mt-3 text-[17px] leading-relaxed text-cream/90">{profile.bio}</p>
        </section>

        {profile.availability ? (
          <section className="mt-10">
            <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Availability</h2>
            <p className="mt-3 text-[17px] text-cream/90">{profile.availability}</p>
            <p className="mt-2 text-xs text-muted">Set by the owner. Not a live location.</p>
          </section>
        ) : null}

        <section className="mt-10">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Photos</h2>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setPhoto(i)}
                className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl"
              >
                <Image src={src} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">SOKO18 Verified</h2>
          <p className="mt-2 text-xs text-muted">Not a decorative tick. Each line is a real check.</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className={cn(v.phone ? "text-cream" : "text-muted")}>
              {v.phone ? "✓" : "○"} Phone verified
            </li>
            <li className={cn(v.identity ? "text-cream" : "text-muted")}>
              {v.identity ? "✓" : "○"} Identity verified
            </li>
            <li className={cn(v.profile ? "text-cream" : "text-muted")}>
              {v.profile ? "✓" : "○"} Profile reviewed
            </li>
            <li className={cn(v.established ? "text-cream" : "text-muted")}>
              {v.established ? "✓" : "○"} Account established
            </li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Similar</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {more.map((p) => (
              <ProfileCard key={p.id} profile={p} compact href={`/profile/${p.slug}`} />
            ))}
          </div>
        </section>
      </div>

      {photo !== null ? (
        <div className="fixed inset-0 z-50 bg-black" onClick={() => setPhoto(null)}>
          <Image src={photos[photo]} alt="" fill className="object-contain" />
        </div>
      ) : null}
      <AnimatePresence>
        {match ? (
          <MatchOverlay
            profile={profile}
            onClose={() => setMatch(false)}
            onMessage={() => {
              if (!ready || !user) {
                setMatch(false);
                setGate("message");
                return false;
              }
              return true;
            }}
          />
        ) : null}
        {gate ? <AuthGate intent={gate} onClose={() => setGate(null)} /> : null}
      </AnimatePresence>
    </main>
  );
}
