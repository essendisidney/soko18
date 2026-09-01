"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { publicPhotos } from "@/lib/media/public";
import { similarProfiles } from "@/lib/data/seed";
import type { SeedProfile } from "@/lib/types";
import { Button } from "@/components/soko/button";
import { PresenceDot } from "@/components/soko/presence-dot";
import { ProfileCard } from "@/components/soko/profile-card";
import { VerificationBadge } from "@/components/soko/verification-badge";
import { AuthGate, type AuthIntent } from "@/components/auth/auth-gate";
import { Wordmark } from "@/components/brand/wordmark";
import { ImpressionBeacon } from "@/components/analytics/impression-beacon";
import { MatchOverlay } from "@/components/discover/match-overlay";
import { TabBar } from "@/components/nav/tab-bar";
import { ProfileBack } from "@/components/profile/profile-back";
import { ProfileOverflow } from "@/components/profile/profile-overflow";
import { PhotoViewer } from "@/components/profile/photo-viewer";
import { useAuth } from "@/lib/auth/use-auth";
import { clearPendingEngage, readPendingEngage, writePendingEngage } from "@/lib/auth/pending-engage";
import { engageProfile } from "@/lib/likes/engage";
import { blocksSnapshot, subscribeBlocks } from "@/lib/blocks/local";
import { hideBlocked } from "@/lib/safety/flags";
import { useLocalIds } from "@/lib/safety/use-id-list";
import { useHiddenByReports } from "@/lib/reports/use-hidden";
import { cn } from "@/lib/utils";
import { sokoVerified } from "@/lib/trust/verified";
import { RatePanel } from "@/components/ratings/rate-panel";
import { BothSidesLine } from "@/components/trust/both-sides-line";

export function PublicProfile({
  profile,
  matched = false,
}: {
  profile: SeedProfile;
  matched?: boolean;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [photo, setPhoto] = useState<number | null>(null);
  const [gate, setGate] = useState<AuthIntent | null>(null);
  const [match, setMatch] = useState(false);
  const [needMatch, setNeedMatch] = useState(false);
  const blockedIds = useLocalIds(subscribeBlocks, blocksSnapshot);
  const reported = useHiddenByReports();
  const blocked = blockedIds.includes(profile.id);
  const more = hideBlocked(similarProfiles(profile), [...blockedIds, ...reported]);
  const v = profile.verification;
  const photos = publicPhotos(profile);

  useEffect(() => {
    if (!ready || !user || blocked) return;
    const pending = readPendingEngage();
    if (!pending || pending.profileId !== profile.id) return;
    clearPendingEngage();
    engageProfile(profile, pending.kind, () => setMatch(true));
  }, [ready, user, blocked, profile]);

  if (!photos[0]) {
    return (
      <main className="min-h-dvh bg-bg pb-24">
        <p className="grid min-h-[70dvh] place-items-center text-muted">This profile isn’t available.</p>
        <TabBar />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-bg pb-24">
      <ImpressionBeacon profileId={profile.id} surface="profile" />
      <div className="relative aspect-[3/4]">
        <button
          type="button"
          aria-label="View photos"
          className="absolute inset-0"
          onClick={() => setPhoto(0)}
        >
          <Image
            src={photos[0]}
            alt={`${profile.name}, ${profile.age}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        </button>
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-bg via-transparent to-black/30" />
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
          <ProfileBack />
          <ProfileOverflow profile={profile} />
        </div>
      </div>

      <div className="-mt-16 relative px-5">
        {sokoVerified(profile) ? <VerificationBadge label="SOKO18 Verified" /> : null}
        <h1 className="mt-3 font-display text-4xl tracking-tight">{profile.name}</h1>
        <p className="mt-1 text-cream/80">
          {profile.age} · Nairobi · {profile.area}
        </p>
        <PresenceDot presence={profile.presence} className="mt-2" />
        {blocked ? <p className="mt-3 text-sm text-muted">You blocked them. They won’t appear in Discover or Browse.</p> : null}

        {blocked ? (
          <Link href="/discover" className="mt-6 block">
            <Button variant="gold" className="w-full">
              Discover
            </Button>
          </Link>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button
              variant="gold"
              className="w-full"
              onClick={() => {
                if (!ready || !user) {
                  writePendingEngage({ profileId: profile.id, kind: "like", at: Date.now() });
                  setGate("like");
                  return;
                }
                engageProfile(profile, "like", () => setMatch(true));
              }}
            >
              <Heart className="size-4 fill-bg" /> Like
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                if (!ready || !user) {
                  setGate("message");
                  return;
                }
                if (!matched) {
                  setNeedMatch(true);
                  return;
                }
                router.push(`/messages/${profile.slug}`);
              }}
            >
              Message
            </Button>
          </div>
        )}

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
          <div className="rail-x mt-3 flex gap-2">
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setPhoto(i)}
                className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl"
              >
                <Image src={src} alt="" fill className="object-cover" sizes="96px" />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Verification</h2>
          <p className="mt-2 text-xs text-muted">Not a decorative tick. Each line is a real check. ID is both sides.</p>
          <div className="mt-2">
            <BothSidesLine themIdentity={v.identity} />
          </div>
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

        {matched ? <RatePanel profileId={profile.id} name={profile.name} /> : (
          <p className="mt-6 text-xs text-muted">Reviews after a match — two-way, before you continue.</p>
        )}

        <section className="mt-10">
          <h2 className="text-[11px] tracking-[0.18em] text-muted uppercase">Similar</h2>
          {more.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {more.map((p) => (
                <ProfileCard key={p.id} profile={p} compact href={`/profile/${p.slug}`} />
              ))}
            </div>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted">No one similar nearby.</p>
              {blocked ? null : (
                <Link href="/discover" className="mt-4 inline-block">
                  <Button variant="gold" size="sm">
                    Discover
                  </Button>
                </Link>
              )}
            </>
          )}
        </section>
      </div>

      {photo !== null ? (
        <PhotoViewer
          photos={photos}
          index={photo}
          alt={`${profile.name}, ${profile.age}`}
          onIndex={setPhoto}
          onClose={() => setPhoto(null)}
        />
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
        {gate ? (
          <AuthGate
            intent={gate}
            onClose={() => {
              if (gate === "like" || gate === "spotlight") clearPendingEngage();
              setGate(null);
            }}
            onDiscover={() => setGate(null)}
          />
        ) : null}
        {needMatch ? (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 px-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Wordmark size="sm" />
            <h2 className="mt-10 font-display text-4xl tracking-tight">No thread yet</h2>
            <p className="mt-4 max-w-xs text-sm text-muted">A like stays quiet until they like you back.</p>
            <Link href="/discover" className="mt-10 w-full max-w-xs">
              <Button className="w-full" variant="gold">
                Discover
              </Button>
            </Link>
            <button type="button" onClick={() => setNeedMatch(false)} className="mt-5 text-sm text-muted">
              Not now
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <TabBar />
    </main>
  );
}
